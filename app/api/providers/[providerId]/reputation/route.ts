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

const VERIFIED_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function resolveVerified(
  supabase: ReturnType<typeof createServiceRoleClient>,
  providerId: string,
  provider: { stripe_account_id: string | null; verified: boolean | null; verified_checked_at: string | null } | null,
): Promise<boolean> {
  if (!provider?.stripe_account_id) return false;

  const checkedAt = provider.verified_checked_at ? new Date(provider.verified_checked_at).getTime() : 0;
  const isStale = Number.isNaN(checkedAt) || Date.now() - checkedAt > VERIFIED_CACHE_TTL_MS;

  if (!isStale) {
    return Boolean(provider.verified);
  }

  // "Verified" reflects a genuinely completed Stripe payout KYC + payout
  // setup — not merely that signup was started. Resilient: any failure or a
  // half-finished account reads as unverified rather than overstating trust.
  let verified = false;
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

  // Best-effort cache write-back; a failure here must not fail the request,
  // and it must never be allowed from a client (see trust-and-safety.sql —
  // the verified/verified_checked_at columns are not client-writable at all).
  const { error: writeBackError } = await supabase
    .from("providers")
    .update({ verified, verified_checked_at: new Date().toISOString() })
    .eq("user_id", providerId);

  if (writeBackError) {
    console.warn("Failed to cache provider verified status", writeBackError);
  }

  return verified;
}

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

    const [{ data: provider }, { count: completedJobs }, { data: reviewRows }, { data: ratingRows }] =
      await Promise.all([
        supabase
          .from("providers")
          .select(
            "user_id, stripe_account_id, services, location, created_at, display_name, photo_url, bio, verified, verified_checked_at"
          )
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
            "id, rating, review_type, comment, created_at, verified_payment, provider_response, provider_response_at, jobs(job_requests(job_title))"
          )
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(50),
        // The average/count must reflect ALL of this provider's reviews, not
        // just the 50 most recent shown above -- a separate lightweight
        // query keeps that correct without pulling every review's full text.
        // Rating-less reports (no_show/issue on an unpaid job) are excluded
        // here at the query level so they can't drag the average down.
        supabase
          .from("provider_reviews")
          .select("rating")
          .eq("provider_id", providerId)
          .not("rating", "is", null),
      ]);

    const reviews = Array.isArray(reviewRows) ? reviewRows : [];
    const allRatings = Array.isArray(ratingRows) ? ratingRows : [];
    const reviewCount = allRatings.length;
    const averageRating =
      reviewCount > 0
        ? allRatings.reduce((sum, row) => sum + (row.rating ?? 0), 0) / reviewCount
        : null;

    const verified = await resolveVerified(supabase, providerId, provider ?? null);

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
        verifiedPayment: Boolean(review.verified_payment),
        providerResponse: review.provider_response,
        providerResponseAt: review.provider_response_at,
      };
    });

    const response = NextResponse.json({
      providerId,
      verified,
      hasPayoutAccount: Boolean(provider?.stripe_account_id),
      completedJobs: completedJobs ?? 0,
      averageRating,
      reviewCount,
      memberSince: provider?.created_at ?? null,
      services: Array.isArray(provider?.services) ? provider?.services : [],
      location: provider?.location ?? null,
      displayName: provider?.display_name ?? null,
      photoUrl: provider?.photo_url ?? null,
      bio: provider?.bio ?? null,
      reviews: formattedReviews,
    });

    // Repeated views of the same provider (e.g. a homeowner scanning many
    // applicants) don't need a fresh read every time; this also caps how
    // often the Stripe retrieve above can be hit by repeated requests when
    // it does run.
    response.headers.set("Cache-Control", "public, max-age=300");
    return response;
  } catch (error) {
    console.error("Failed to load provider reputation", error);
    return NextResponse.json(
      { error: "Failed to load provider reputation" },
      { status: 500 }
    );
  }
}
