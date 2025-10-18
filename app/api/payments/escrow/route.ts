import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import {
  buildEscrowSchedule,
  cancelJobPaymentIntent,
  createJobPaymentIntent,
} from "@/app/lib/payments/stripeConnect";
import type {
  JobMilestoneRecord,
  JobPaymentRecord,
} from "@/app/api/jobs/types";

type EscrowPaymentPayload = {
  jobId: string;
  paymentType?: "escrow" | "progress" | "completion";
  milestoneId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as EscrowPaymentPayload | null;

    if (!body?.jobId) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, payments(*), job_milestones(*)")
      .eq("id", body.jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.homeowner_id !== userId) {
      return NextResponse.json({ error: "You cannot manage this job" }, { status: 403 });
    }

    if (!job.stripe_customer_id || !job.provider_stripe_account_id) {
      return NextResponse.json({ error: "Payment details incomplete" }, { status: 400 });
    }

    const paymentType = body.paymentType ?? "escrow";

    const schedule =
      (job.milestone_plan as ReturnType<typeof buildEscrowSchedule> | null) ??
      buildEscrowSchedule(job.total_amount_cents);

    const payments: JobPaymentRecord[] = Array.isArray(job.payments)
      ? (job.payments as JobPaymentRecord[])
      : [];

    const existingPayment = payments.find(
      (payment) => payment.payment_type === paymentType && payment.status !== "succeeded",
    );

    if (existingPayment?.stripe_payment_intent_id) {
      try {
        await cancelJobPaymentIntent(existingPayment.stripe_payment_intent_id);
      } catch (cancelError) {
        console.warn("Failed to cancel previous payment intent", cancelError);
      }

      await supabase
        .from("payments")
        .update({ status: "canceled" })
        .eq("id", existingPayment.id);
    }

    let amountCents = schedule.amounts.escrowCents;
    let platformFeeCents = schedule.amounts.platformFeeEscrowCents;
    let captureMethod: "manual" | "automatic" = "manual";
    let metadata: Record<string, string> = {};

    if (paymentType === "progress") {
      if (!body.milestoneId) {
        return NextResponse.json({ error: "Milestone id required for progress payment" }, { status: 400 });
      }

      const milestones: JobMilestoneRecord[] = Array.isArray(job.job_milestones)
        ? (job.job_milestones as JobMilestoneRecord[])
        : [];

      const milestone = milestones.find((item) => item.id === body.milestoneId);

      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      if (milestone.status !== "pending") {
        return NextResponse.json({ error: "Milestone already funded" }, { status: 400 });
      }

      amountCents = milestone.amount_cents ?? schedule.amounts.progressCents;
      platformFeeCents = schedule.amounts.platformFeeProgressCents;
      metadata = { milestoneId: milestone.id };
    }

    if (paymentType === "completion") {
      amountCents = schedule.amounts.completionCents;
      platformFeeCents = schedule.amounts.platformFeeCompletionCents;
      captureMethod = "automatic";
    }

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: "No payment due for this step" }, { status: 400 });
    }

    const paymentIntent = await createJobPaymentIntent({
      jobId: job.id,
      amountCents,
      platformFeeCents,
      customerId: job.stripe_customer_id,
      providerStripeAccountId: job.provider_stripe_account_id,
      paymentType,
      captureMethod,
      metadata,
    });

    const { error: insertPaymentError, data: insertedPayment } = await supabase
      .from("payments")
      .insert({
        job_id: job.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        platform_fee_cents: platformFeeCents,
        status: paymentIntent.status,
        payment_type: paymentType,
      })
      .select()
      .single();

    if (insertPaymentError || !insertedPayment) {
      console.error("Failed to store payment", insertPaymentError);
      return NextResponse.json({ error: "Failed to store payment" }, { status: 500 });
    }

    if (paymentType === "progress" && body.milestoneId) {
      await supabase
        .from("job_milestones")
        .update({ status: "funding_in_progress" })
        .eq("id", body.milestoneId);
    }

    const nextStatus = (() => {
      if (paymentType === "completion") {
        return "awaiting_completion_confirmation";
      }
      if (paymentType === "progress") {
        return "in_progress";
      }
      return "awaiting_capture";
    })();

    await supabase
      .from("jobs")
      .update({ job_status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", job.id);

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      },
      paymentRecord: insertedPayment,
    });
  } catch (error) {
    console.error("Failed to create payment intent:", error);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
