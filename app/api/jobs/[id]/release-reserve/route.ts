import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import {
  createProviderTransfer,
  PROVIDER_RESERVE_HOLD_MS,
} from "@/app/lib/payments/stripeConnect";

interface ReleaseReserveParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: ReleaseReserveParams) {
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

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.provider_id !== userId) {
      return NextResponse.json({ error: "Only the selected provider can release the reserve" }, { status: 403 });
    }

    const reserveCents = Number(job.provider_reserve_cents ?? 0);
    if (!reserveCents || reserveCents <= 0) {
      return NextResponse.json({ error: "No reserve is being held for this job" }, { status: 409 });
    }

    const releasableAt = job.reserve_releasable_at ? new Date(job.reserve_releasable_at).getTime() : 0;
    if (!releasableAt) {
      return NextResponse.json({ error: "Reserve release date is not set" }, { status: 409 });
    }

    if (releasableAt > Date.now()) {
      const remainingMs = releasableAt - Date.now();
      return NextResponse.json(
        {
          error: "Reserve is still in the mandatory hold period",
          secondsUntilRelease: Math.ceil(remainingMs / 1000),
          mandatoryHoldMs: PROVIDER_RESERVE_HOLD_MS,
        },
        { status: 409 },
      );
    }

    if (!job.provider_stripe_account_id) {
      return NextResponse.json({ error: "Provider payouts are not configured" }, { status: 400 });
    }

    const transfer = await createProviderTransfer({
      jobId,
      providerStripeAccountId: job.provider_stripe_account_id,
      amountCents: reserveCents,
      reason: "reserve_release",
    });

    const updatedTransferTotal = Number(job.provider_transfer_total_cents ?? 0) + reserveCents;

    await supabase
      .from("jobs")
      .update({
        job_status: "completed",
        provider_reserve_cents: 0,
        reserve_releasable_at: null,
        last_provider_transfer_id: transfer.id,
        provider_transfer_total_cents: updatedTransferTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await supabase.from("payment_logs").insert({
      job_id: jobId,
      action: "provider_reserve_released",
      payload: {
        transferId: transfer.id,
        amountCents: reserveCents,
      },
    });

    return NextResponse.json({ success: true, transferId: transfer.id });
  } catch (error) {
    console.error("Failed to release reserve:", error);
    return NextResponse.json({ error: "Failed to release reserve" }, { status: 500 });
  }
}
