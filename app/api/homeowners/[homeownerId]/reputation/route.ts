import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/utils/supabase/server";

/**
 * Public, read-only reputation summary for a homeowner/poster.
 *
 * job_requests and jobs are RLS-locked to the posting homeowner and the
 * awarded provider, so a prospective applicant deciding whether to apply
 * can't otherwise see any track record for the person posting the job.
 * This mirrors GET /api/providers/[providerId]/reputation: a service-role
 * read that exposes only safe, non-PII aggregates -- never name, email, or
 * address. Everything returned is computed from real rows.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ homeownerId: string }> }
) {
  try {
    const { homeownerId } = await context.params;

    if (!homeownerId) {
      return NextResponse.json({ error: "Missing homeowner id" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const [{ count: jobsPosted }, { count: jobsCompleted }, { data: earliestRequest }, { data: paidJobs }] =
      await Promise.all([
        supabase
          .from("job_requests")
          .select("id", { count: "exact", head: true })
          .eq("homeowner_id", homeownerId),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("homeowner_id", homeownerId)
          .eq("job_status", "completed"),
        // There's no dedicated homeowners table, so the earliest job_requests
        // row is the best available proxy for "member since".
        supabase
          .from("job_requests")
          .select("created_at")
          .eq("homeowner_id", homeownerId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        // "Jobs paid" is the strongest anti-scam signal for a poster: real
        // money actually moved, not just that a job was posted or awarded.
        supabase
          .from("jobs")
          .select("id, payments(status, captured_at)")
          .eq("homeowner_id", homeownerId),
      ]);

    const jobsPaid = Array.isArray(paidJobs)
      ? paidJobs.filter((job) => {
          const payments = Array.isArray(job.payments)
            ? (job.payments as Array<{ status: string | null; captured_at: string | null }>)
            : [];
          return payments.some((payment) => payment.status === "succeeded" || Boolean(payment.captured_at));
        }).length
      : 0;

    const response = NextResponse.json({
      homeownerId,
      jobsPosted: jobsPosted ?? 0,
      jobsCompleted: jobsCompleted ?? 0,
      jobsPaid,
      memberSince: earliestRequest?.created_at ?? null,
    });

    response.headers.set("Cache-Control", "public, max-age=300");
    return response;
  } catch (error) {
    console.error("Failed to load homeowner reputation", error);
    return NextResponse.json(
      { error: "Failed to load homeowner reputation" },
      { status: 500 }
    );
  }
}
