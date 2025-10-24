import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import {
  buildEscrowSchedule,
  createJobPaymentIntent,
} from "@/app/lib/payments/stripeConnect";

type MilestoneParams = {
  params: Promise<{ id: string }>;
};

type MilestonePayload = {
  label: string;
  percentage?: number;
  amountCents?: number;
  autoCreatePaymentIntent?: boolean;
};

export async function POST(req: NextRequest, context: MilestoneParams) {
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

    const payload = (await req.json()) as MilestonePayload | null;

    if (!payload?.label) {
      return NextResponse.json({ error: "Milestone label is required" }, { status: 400 });
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

    if (job.homeowner_id !== userId) {
      return NextResponse.json({ error: "Only the homeowner can add milestones" }, { status: 403 });
    }

    const schedule =
      (job.milestone_plan as ReturnType<typeof buildEscrowSchedule> | null) ??
      buildEscrowSchedule(job.total_amount_cents);

    const amountCents = payload.amountCents
      ? Math.round(payload.amountCents)
      : schedule.amounts.progressCents;

    const percentage =
      typeof payload.percentage === "number"
        ? payload.percentage
        : schedule.progressPercentage ?? null;

    const { data: milestone, error: insertMilestoneError } = await supabase
      .from("job_milestones")
      .insert({
        job_id: jobId,
        label: payload.label,
        percentage,
        amount_cents: amountCents,
      })
      .select()
      .single();

    if (insertMilestoneError || !milestone) {
      console.error("Failed to insert milestone", insertMilestoneError);
      return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
    }

    if (!payload.autoCreatePaymentIntent) {
      return NextResponse.json({ milestone });
    }

    if (!job.stripe_customer_id || !job.provider_stripe_account_id) {
      return NextResponse.json({ error: "Payment details incomplete" }, { status: 400 });
    }

    const paymentIntent = await createJobPaymentIntent({
      jobId,
      amountCents,
      platformFeeCents: schedule.amounts.platformFeeProgressCents,
      customerId: job.stripe_customer_id,
      providerStripeAccountId: job.provider_stripe_account_id,
      paymentType: "progress",
      captureMethod: "automatic",
      metadata: { milestoneId: milestone.id },
    });

    const { error: insertPaymentError } = await supabase.from("payments").insert({
      job_id: jobId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: amountCents,
      platform_fee_cents: schedule.amounts.platformFeeProgressCents,
      status: paymentIntent.status,
      payment_type: "progress",
    });

    if (insertPaymentError) {
      console.error("Failed to store milestone payment", insertPaymentError);
      return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
    }

    await supabase
      .from("job_milestones")
      .update({ status: "funding_in_progress" })
      .eq("id", milestone.id);

    return NextResponse.json({
      milestone,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      },
    });
  } catch (error) {
    console.error("Failed to create milestone:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}
