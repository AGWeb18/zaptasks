import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";

type ReviewParams = {
  params: Promise<{ id: string }>;
};

function normalizeRating(value: unknown): number | null {
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
    const rating = normalizeRating(payload?.rating);
    const reviewType = typeof payload?.reviewType === "string" ? payload.reviewType : null;
    const comment = typeof payload?.comment === "string" ? payload.comment.trim() : "";

    if (rating === null) {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 5" }, { status: 400 });
    }

    if (comment.length > 2000) {
      return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, homeowner_id, provider_id, job_status, provider_reviews(id, homeowner_id)")
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

    const { data: inserted, error: insertError } = await supabase
      .from("provider_reviews")
      .insert({
        job_id: jobId,
        homeowner_id: userId,
        provider_id: job.provider_id,
        rating,
        review_type: reviewType,
        comment: comment || null,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Failed to store provider review", insertError);
      return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
    }

    return NextResponse.json({ review: inserted });
  } catch (error) {
    console.error("Failed to create provider review", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
