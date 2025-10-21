import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import {
  buildEscrowSchedule,
  captureJobPaymentIntent,
  calculateProviderReserve,
  calculateProviderShare,
  createJobPaymentIntent,
  createProviderTransfer,
  PROVIDER_RESERVE_HOLD_MS,
  stripe,
} from "@/app/lib/payments/stripeConnect";
import type {
  JobMilestoneRecord,
  JobPaymentRecord,
} from "@/app/api/jobs/types";

type CompleteJobParams = {
  params: Promise<{ id: string }>;
};

type CompleteJobPayload = {
  finalPaymentIntentId?: string;
};

const CAPTURABLE_STATUSES = new Set([
  "requires_capture",
  "processing",
]);

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

    const body = (await req.json().catch(() => ({}))) as CompleteJobPayload;

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, job_requests(id), payments(*), job_milestones(*)")
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
    let providerShareToSettleCents = 0;
    const completionPayment = payments.find(
      (payment) => payment.payment_type === "completion" && payment.status !== "canceled",
    );

    const completionAmountCents = schedule.amounts.completionCents;

    if (!body?.finalPaymentIntentId && completionAmountCents > 0) {
      if (completionPayment?.stripe_payment_intent_id) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          completionPayment.stripe_payment_intent_id,
        );

        await supabase
          .from("payments")
          .update({ status: paymentIntent.status })
          .eq("id", completionPayment.id);

        if (paymentIntent.status !== "succeeded") {
          return NextResponse.json({
            requiresFinalPayment: true,
            paymentIntent: {
              id: paymentIntent.id,
              clientSecret: paymentIntent.client_secret,
              status: paymentIntent.status,
            },
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
          captureMethod: "automatic",
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

        return NextResponse.json({
          requiresFinalPayment: true,
          paymentIntent: {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status,
          },
        });
      }
    }

    if (completionAmountCents > 0) {
      const finalPaymentIntentId =
        body?.finalPaymentIntentId ?? completionPayment?.stripe_payment_intent_id;

      if (!finalPaymentIntentId) {
        return NextResponse.json({ error: "Final payment has not been confirmed" }, { status: 409 });
      }

      const finalPaymentIntent = await stripe.paymentIntents.retrieve(
        finalPaymentIntentId,
      );

      if (finalPaymentIntent.status !== "succeeded") {
        return NextResponse.json({
          error: "Final payment is still pending",
          paymentIntent: {
            id: finalPaymentIntent.id,
            status: finalPaymentIntent.status,
            clientSecret: finalPaymentIntent.client_secret,
          },
        }, { status: 409 });
      }

      const completionAlreadyCaptured = Boolean(completionPayment?.captured_at);

      if (completionPayment?.id) {
        await supabase
          .from("payments")
          .update({
            status: finalPaymentIntent.status,
            captured_at: completionAlreadyCaptured
              ? completionPayment.captured_at
              : new Date().toISOString(),
          })
          .eq("id", completionPayment.id);
      }

      if (completionPayment && !completionAlreadyCaptured) {
        providerShareToSettleCents += calculateProviderShare(
          completionPayment.amount_cents ?? 0,
          completionPayment.platform_fee_cents ?? 0,
        );
      }
    }

    const manualPayments = payments.filter(
      (payment) =>
        (payment.payment_type === "escrow" || payment.payment_type === "progress") &&
        payment.stripe_payment_intent_id,
    );

    const capturedIds: string[] = [];

    for (const payment of manualPayments) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        payment.stripe_payment_intent_id as string,
      );

      await supabase
        .from("payments")
        .update({ status: paymentIntent.status })
        .eq("id", payment.id);

      if (!CAPTURABLE_STATUSES.has(paymentIntent.status)) {
        continue;
      }

      const captureResult = await captureJobPaymentIntent(paymentIntent.id);

      await supabase
        .from("payments")
        .update({
          status: captureResult.status,
          captured_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      capturedIds.push(String(payment.id));

      if (captureResult.status === "succeeded") {
        providerShareToSettleCents += calculateProviderShare(
          payment.amount_cents ?? 0,
          payment.platform_fee_cents ?? 0,
        );
      }
    }

    if (!job.provider_stripe_account_id) {
      return NextResponse.json({ error: "Provider payouts are not configured" }, { status: 400 });
    }

    const now = Date.now();
    const existingReserveCents = Number(job.provider_reserve_cents ?? 0);
    const existingReserveReleaseTs = job.reserve_releasable_at
      ? new Date(job.reserve_releasable_at).getTime()
      : 0;
    const existingTransferTotalCents = Number(job.provider_transfer_total_cents ?? 0);

    let reserveCents = 0;
    let immediateTransferCents = 0;
    let payoutTransferId: string | null = null;

    if (providerShareToSettleCents > 0) {
      const reservePlan = calculateProviderReserve(providerShareToSettleCents);
      reserveCents = reservePlan.reserveCents;
      immediateTransferCents = reservePlan.immediateTransferCents;

      if (immediateTransferCents > 0) {
        const transfer = await createProviderTransfer({
          jobId,
          providerStripeAccountId: job.provider_stripe_account_id,
          amountCents: immediateTransferCents,
          reason: "payout",
          metadata: {
            capturedPaymentIds: capturedIds.join(","),
          },
        });

        payoutTransferId = transfer.id;

        await supabase.from("payment_logs").insert({
          job_id: jobId,
          action: "provider_transfer_initiated",
          payload: {
            transferId: transfer.id,
            amountCents: immediateTransferCents,
            paymentShareCents: providerShareToSettleCents,
            reserveCents,
          },
        });
      }
    }

    const totalReserveCents = existingReserveCents + reserveCents;
    const releaseTimestamp = totalReserveCents > 0
      ? Math.max(existingReserveReleaseTs, now + PROVIDER_RESERVE_HOLD_MS)
      : 0;

    const totalTransferredCents = existingTransferTotalCents + immediateTransferCents;

    await supabase
      .from("jobs")
      .update({
        job_status: totalReserveCents > 0 ? "reserve_hold" : "completed",
        completion_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        provider_reserve_cents: totalReserveCents,
        reserve_releasable_at: releaseTimestamp > 0 ? new Date(releaseTimestamp).toISOString() : null,
        last_provider_transfer_id: payoutTransferId ?? job.last_provider_transfer_id ?? null,
        provider_transfer_total_cents: totalTransferredCents,
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
        capturedPaymentIds: capturedIds,
        providerShareSettledCents: providerShareToSettleCents,
        providerTransferInitiatedCents: immediateTransferCents,
        providerReserveCents: totalReserveCents,
      },
    });

    if (reserveCents > 0) {
      await supabase.from("payment_logs").insert({
        job_id: jobId,
        action: "provider_reserve_created",
        payload: {
          reserveCents,
          releaseAfter: releaseTimestamp,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete job:", error);
    return NextResponse.json({ error: "Failed to complete job" }, { status: 500 });
  }
}
