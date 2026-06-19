import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClientWithUser } from "@/app/utils/supabase/server";

function isAuthorizedAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const adminList = process.env.ZAPTASKS_ADMIN_IDS?.split(",").map((id) => id.trim()).filter(Boolean);
  if (!adminList || adminList.length === 0) return false;
  return adminList.includes(userId);
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!isAuthorizedAdmin(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClientWithUser(userId ?? "");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [jobsResult, paymentsResult, revenueResult] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, job_status, created_at, job_request_id, job_requests(job_title, homeowner_name)")
        .order("created_at", { ascending: false }),

      supabase
        .from("payments")
        .select("id, job_id, amount_cents, platform_fee_cents, status, payment_type, created_at, jobs(job_requests(job_title))")
        .order("created_at", { ascending: false })
        .limit(20),

      supabase
        .from("payments")
        .select("platform_fee_cents, created_at")
        .eq("status", "succeeded"),
    ]);

    if (jobsResult.error) throw jobsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (revenueResult.error) throw revenueResult.error;

    const jobs = jobsResult.data ?? [];
    const recentPayments = paymentsResult.data ?? [];
    const succeededPayments = revenueResult.data ?? [];

    // Count jobs by status
    const statusCounts: Record<string, number> = {};
    const stalledJobs: typeof jobs = [];

    for (const job of jobs) {
      const s = job.job_status ?? "unknown";
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;

      if (s === "awaiting_provider_onboarding" && job.created_at < sevenDaysAgo) {
        stalledJobs.push(job);
      }
    }

    // Group revenue by month (YYYY-MM)
    const revenueByMonth: Record<string, number> = {};
    for (const p of succeededPayments) {
      const month = p.created_at?.slice(0, 7) ?? "unknown";
      revenueByMonth[month] = (revenueByMonth[month] ?? 0) + (p.platform_fee_cents ?? 0);
    }

    const totalRevenueCents = succeededPayments.reduce(
      (sum, p) => sum + (p.platform_fee_cents ?? 0),
      0
    );

    return NextResponse.json({
      statusCounts,
      stalledJobs,
      recentPayments,
      revenueByMonth,
      totalRevenueCents,
      totalJobs: jobs.length,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
