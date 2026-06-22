import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/utils/supabase/server";
import { stripe } from "@/app/lib/payments/stripeConnect";

/**
 * Public, read-only reputation summary for a helper/provider.
 *
 * The provider profile and reputation data live in tables (provider_reviews,
 * jobs) whose RLS only lets the reviewing homeowner or the provider read them.
 * That means a *prospective* homeowner deciding who to hire cannot see a
 * provider's track record. This endpoint uses the service-role client to expose
 * a safe, aggregate, non-PII reputation summary that anyone can read so trust
 * signals can surface at the decision point.
 *
 * Everything returned is computed from real rows — no fabricated stats.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await context.params;

    if (!providerId) {
      return NextResponse.json({ error: "Missing provider id" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const [{ data: provider }, { count: completedJobs }, { data: reviewRows }] =
      await Promise.all([
        supabase
          .from("providers")
          .select("user_id, stripe_account_id, services, location, created_at")
          .eq("user_id", providerId)
          .maybeSingle(),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .eq("job_status", "completed"),
        supabase
          .from("provider_reviews")
          .select(
            "id, rating, review_type, comment, created_at, jobs(job_requests(job_title))"
          )
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const reviews = Array.isArray(reviewRows) ? reviewRows : [];
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) /
          reviewCount
        : null;

    // "Verified" reflects a genuinely completed Stripe identity/KYC + payout
    // setup — not merely that signup was started. Resilient: any failure or a
    // half-finished account reads as unverified rather than overstating trust.
    let verified = false;
    if (provider?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(provider.stripe_account_id);
        const currentlyDue = account.requirements?.currently_due ?? [];
        verified =
          Boolean(account.charges_enabled) &&
          Boolean(account.payouts_enabled) &&
          currentlyDue.length === 0;
      } catch (stripeError) {
        console.warn("Failed to confirm provider Stripe status", stripeError);
        verified = false;
      }
    }

    const formattedReviews = reviews.map((review) => {
      const jobs = review.jobs as
        | { job_requests?: { job_title?: string | null } | null }
        | null
        | undefined;
      return {
        id: review.id,
        rating: review.rating,
        reviewType: review.review_type,
        comment: review.comment,
        createdAt: review.created_at,
        jobTitle: jobs?.job_requests?.job_title ?? null,
      };
    });

    return NextResponse.json({
      providerId,
      verified,
      hasPayoutAccount: Boolean(provider?.stripe_account_id),
      completedJobs: completedJobs ?? 0,
      averageRating,
      reviewCount,
      memberSince: provider?.created_at ?? null,
      services: Array.isArray(provider?.services) ? provider?.services : [],
      location: provider?.location ?? null,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Failed to load provider reputation", error);
    return NextResponse.json(
      { error: "Failed to load provider reputation" },
      { status: 500 }
    );
  }
}
