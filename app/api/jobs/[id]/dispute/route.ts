import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import { sendDisputeOpenedEmail } from "@/app/lib/email/senders";

type DisputeParams = {
  params: Promise<{ id: string }>;
};

type DisputePayload = {
  reason: string;
  evidence?: Record<string, unknown>;
};

export async function POST(req: NextRequest, context: DisputeParams) {
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

    const body = (await req.json()) as DisputePayload | null;

    if (!body?.reason) {
      return NextResponse.json({ error: "Dispute reason is required" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, job_requests(id, homeowner_id, homeowner_name, homeowner_email, job_title)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.homeowner_id !== userId) {
      return NextResponse.json({ error: "Only the homeowner can open disputes" }, { status: 403 });
    }

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert({
        job_id: jobId,
        reason: body.reason,
        status: "open",
        evidence: body.evidence ?? null,
      })
      .select()
      .single();

    if (disputeError || !dispute) {
      console.error("Failed to record dispute", disputeError);
      return NextResponse.json({ error: "Failed to create dispute" }, { status: 500 });
    }

    await supabase
      .from("jobs")
      .update({ job_status: "disputed", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    if (job.job_requests?.id) {
      await supabase
        .from("job_requests")
        .update({ status: "disputed" })
        .eq("id", job.job_requests.id);
    }

    await supabase.from("payment_logs").insert({
      job_id: jobId,
      action: "dispute_opened",
      payload: {
        disputeId: dispute.id,
        reason: body.reason,
      },
    });

    const adminEmail = process.env.ZAPTASKS_ADMIN_EMAIL;
    if (adminEmail) {
      const jr = job.job_requests as {
        homeowner_name: string | null;
        homeowner_email: string | null;
        job_title: string;
      } | null;

      await sendDisputeOpenedEmail({
        adminEmail,
        jobTitle: jr?.job_title ?? "Unknown Job",
        homeownerName: jr?.homeowner_name ?? "Homeowner",
        reason: body.reason,
        jobId,
      });
    }

    return NextResponse.json({ success: true, dispute });
  } catch (error) {
    console.error("Failed to open dispute:", error);
    return NextResponse.json({ error: "Failed to open dispute" }, { status: 500 });
  }
}
