import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import {
  buildEscrowSchedule,
  createJobPaymentIntent,
  captureJobPaymentIntent,
  stripe,
} from "@/app/lib/payments/stripeConnect";
import type {
  JobMilestoneRecord,
  JobPaymentRecord,
} from "@/app/api/jobs/types";
import { sendJobCompletedEmails } from "@/app/lib/email/senders";

type CompleteJobParams = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: CompleteJobParams) {
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
      .select("*, job_requests(id, homeowner_email, homeowner_name, job_title, selected_application_id), payments(*), job_milestones(*)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.homeowner_id !== userId) {
      return NextResponse.json({ error: "Only the homeowner can close this job" }, { status: 403 });
    }

    const schedule =
      (job.milestone_plan as ReturnType<typeof buildEscrowSchedule> | null) ??
      buildEscrowSchedule(job.total_amount_cents);

    const payments: JobPaymentRecord[] = Array.isArray(job.payments)
      ? (job.payments as JobPaymentRecord[])
      : [];

    const refreshPaymentStatus = async (payment: JobPaymentRecord) => {
      if (!payment.stripe_payment_intent_id) {
        return { id: payment.id, status: "missing" } as const;
      }

      const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
      await supabase.from("payments").update({
        status: intent.status,
        captured_at: intent.status === "succeeded" ? new Date().toISOString() : payment.captured_at ?? null,
      }).eq("id", payment.id);

      return { id: payment.id, status: intent.status, clientSecret: intent.client_secret ?? null } as const;
    };

    const requiredTypes: Array<JobPaymentRecord["payment_type"]> = ["escrow", "progress"];
    const unsettled: Array<{
      type: string;
      paymentIntentId?: string | null;
      clientSecret?: string | null;
      status?: string | null;
      amountCents?: number | null;
    }> = [];

    for (const type of requiredTypes) {
      const payment = payments.find((item) => item.payment_type === type);
      if (!payment) {
        continue;
      }

      const result = await refreshPaymentStatus(payment);
      // requires_capture means the authorization is approved — it will be captured in the loop below
      if (result.status !== "succeeded" && result.status !== "requires_capture") {
        unsettled.push({
          type: type ?? "unknown",
          paymentIntentId: payment.stripe_payment_intent_id,
          clientSecret: result.clientSecret,
          status: result.status,
          amountCents: payment.amount_cents ?? null,
        });
      }
    }

    const completionAmountCents = schedule.amounts.completionCents;
    const completionPayment = payments.find((payment) => payment.payment_type === "completion");

    if (completionAmountCents > 0) {
      if (completionPayment?.stripe_payment_intent_id) {
        const result = await refreshPaymentStatus(completionPayment);
        if (result.status !== "succeeded") {
          unsettled.push({
            type: "completion",
            paymentIntentId: completionPayment.stripe_payment_intent_id,
            clientSecret: result.clientSecret,
            status: result.status,
            amountCents: completionPayment.amount_cents ?? null,
          });
        }
      } else {
        if (!job.stripe_customer_id || !job.provider_stripe_account_id) {
          return NextResponse.json({ error: "Payment details incomplete" }, { status: 400 });
        }

        const paymentIntent = await createJobPaymentIntent({
          jobId,
          amountCents: completionAmountCents,
          platformFeeCents: schedule.amounts.platformFeeCompletionCents,
          customerId: job.stripe_customer_id,
          providerStripeAccountId: job.provider_stripe_account_id,
          paymentType: "completion",
          captureMethod: "manual",
        });

        const { error: insertPaymentError } = await supabase.from("payments").insert({
          job_id: jobId,
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: completionAmountCents,
          platform_fee_cents: schedule.amounts.platformFeeCompletionCents,
          status: paymentIntent.status,
          payment_type: "completion",
        });

        if (insertPaymentError) {
          console.error("Failed to store completion payment", insertPaymentError);
          return NextResponse.json({ error: "Failed to store completion payment" }, { status: 500 });
        }

        unsettled.push({
          type: "completion",
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status,
          amountCents: completionAmountCents,
        });
      }
    }

    if (unsettled.length > 0) {
      return NextResponse.json({ requiresPaymentActions: true, unsettled }, { status: 409 });
    }

    // Capture any manually-authorized escrow payment intents
    for (const payment of payments) {
      if (payment.stripe_payment_intent_id) {
        const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
        
        // If payment is in requires_capture state, capture it now
        if (intent.status === "requires_capture") {
          try {
            await captureJobPaymentIntent(payment.stripe_payment_intent_id);
            await supabase.from("payments").update({
              status: "succeeded",
              captured_at: new Date().toISOString(),
            }).eq("id", payment.id);
          } catch (captureError) {
            console.error(
              `Failed to capture payment ${payment.stripe_payment_intent_id}:`,
              captureError
            );
            return NextResponse.json(
              { error: "Failed to capture payment. Please try again." },
              { status: 500 }
            );
          }
        }
      }
    }

    await supabase
      .from("jobs")
      .update({
        job_status: "completed",
        completion_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        provider_reserve_cents: 0,
        reserve_releasable_at: null,
      })
      .eq("id", jobId);

    if (job.job_requests?.id) {
      await supabase
        .from("job_requests")
        .update({ status: "completed" })
        .eq("id", job.job_requests.id);
    }

    const milestones: JobMilestoneRecord[] = Array.isArray(job.job_milestones)
      ? (job.job_milestones as JobMilestoneRecord[])
      : [];

    if (milestones.length > 0) {
      await supabase
        .from("job_milestones")
        .update({ status: "released" })
        .eq("job_id", jobId)
        .neq("status", "released");
    }

    await supabase.from("payment_logs").insert({
      job_id: jobId,
      action: "job_completed",
      payload: {
        completionAmountCents,
        paymentsSettled: payments.map((payment) => ({
          id: payment.id,
          type: payment.payment_type,
        })),
      },
    });

    // Look up provider email from the awarded application
    const jobRequest = job.job_requests as {
      id: string;
      homeowner_email: string | null;
      homeowner_name: string | null;
      job_title: string;
      selected_application_id: string | null;
    } | null;

    if (jobRequest?.selected_application_id) {
      const { data: providerApp } = await supabase
        .from("job_applications")
        .select("provider_email, provider_name")
        .eq("id", jobRequest.selected_application_id)
        .maybeSingle();

      await sendJobCompletedEmails({
        homeownerEmail: jobRequest.homeowner_email,
        homeownerName: jobRequest.homeowner_name ?? "Homeowner",
        providerEmail: providerApp?.provider_email,
        providerName: providerApp?.provider_name ?? "Provider",
        jobTitle: jobRequest.job_title,
        totalAmountCents: job.total_amount_cents,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete job:", error);
    return NextResponse.json({ error: "Failed to complete job" }, { status: 500 });
  }
}
