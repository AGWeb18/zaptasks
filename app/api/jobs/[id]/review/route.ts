import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser, createServiceRoleClient } from "@/app/utils/supabase/server";

type ReviewParams = {
  params: Promise<{ id: string }>;
};

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export async function POST(req: NextRequest, context: ReviewParams) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const jobId = params?.id;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    const payload = await req.json().catch(() => null);
    const ratingProvided = payload?.rating !== null && payload?.rating !== undefined;
    const rating = ratingProvided ? normalizeRating(payload?.rating) : null;
    const reviewType = typeof payload?.reviewType === "string" ? payload.reviewType : null;
    const comment = typeof payload?.comment === "string" ? payload.comment.trim() : "";

    if (ratingProvided && rating === null) {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 5" }, { status: 400 });
    }

    if (comment.length > 2000) {
      return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(
        "id, homeowner_id, provider_id, job_status, provider_reviews(id, homeowner_id), payments(status, captured_at)"
      )
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.homeowner_id !== userId) {
      return NextResponse.json({ error: "Only the hiring homeowner can rate this job" }, { status: 403 });
    }

    const allowedStatuses = new Set(["completed", "reserve_hold", "canceled", "disputed"]);
    if (!allowedStatuses.has(String(job.job_status ?? ""))) {
      return NextResponse.json({ error: "You can only review completed or cancelled jobs" }, { status: 409 });
    }

    const alreadyReviewed = Array.isArray(job.provider_reviews)
      ? job.provider_reviews.some((review: { homeowner_id?: string | null }) => review?.homeowner_id === userId)
      : false;

    if (alreadyReviewed) {
      return NextResponse.json({ error: "You have already left a review for this job" }, { status: 409 });
    }

    // A colluding homeowner/provider pair could otherwise farm free 5-star
    // reviews for zero cost: post a job, award it, cancel before ever
    // paying, then leave a positive review. Gate star ratings on a real
    // captured payment; a never-paid job can still be reviewed, but only as
    // a no-show/issue flag with no rating. This mirrors the RLS INSERT
    // check on provider_reviews, which enforces the same rule for any
    // client that bypasses this route entirely.
    const payments = Array.isArray(job.payments)
      ? (job.payments as Array<{ status: string | null; captured_at: string | null }>)
      : [];
    const hasCapturedPayment = payments.some(
      (payment) => payment.status === "succeeded" || Boolean(payment.captured_at)
    );

    let finalRating = rating;

    if (!hasCapturedPayment) {
      if (reviewType !== "no_show" && reviewType !== "issue") {
        return NextResponse.json(
          {
            error:
              "Reviews with a star rating require a completed payment. You can still report a no-show or an issue.",
          },
          { status: 409 }
        );
      }
      // No captured payment means no star rating, regardless of what the
      // client sent -- RLS would reject a non-null rating here anyway.
      finalRating = null;
    } else if (finalRating === null) {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 5" }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("provider_reviews")
      .insert({
        job_id: jobId,
        homeowner_id: userId,
        provider_id: job.provider_id,
        rating: finalRating,
        review_type: reviewType,
        comment: comment || null,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Failed to store provider review", insertError);
      return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
    }

    // verified_payment is not client-writable at all (see trust-and-safety.sql),
    // so it's set here via the service-role client after this route has
    // independently confirmed a captured payment exists.
    if (hasCapturedPayment) {
      const serviceClient = createServiceRoleClient();
      const { error: verifyError } = await serviceClient
        .from("provider_reviews")
        .update({ verified_payment: true })
        .eq("id", inserted.id);

      if (verifyError) {
        console.warn("Failed to mark review as verified payment", verifyError);
      } else {
        inserted.verified_payment = true;
      }
    }

    return NextResponse.json({ review: inserted });
  } catch (error) {
    console.error("Failed to create provider review", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
