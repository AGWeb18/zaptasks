import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import {
  captureJobPaymentIntent,
  refundJobPaymentIntent,
  stripe,
} from "@/app/lib/payments/stripeConnect";
import type { JobPaymentRecord } from "@/app/api/jobs/types";

type ResolveParams = {
  params: Promise<{ id: string }>;
};

type ResolvePayload = {
  resolution: "release" | "refund" | "partial_refund";
  partialRefundCents?: number;
};

function isAuthorizedAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const adminList = process.env.ZAPTASKS_ADMIN_IDS?.split(",").map((id) => id.trim());
  return !adminList || adminList.length === 0 || adminList.includes(userId);
}

export async function PATCH(req: NextRequest, context: ResolveParams) {
  try {
    const { userId } = getAuth(req);

    if (!isAuthorizedAdmin(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const disputeId = params?.id;

    if (!disputeId) {
      return NextResponse.json({ error: "Missing dispute id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as ResolvePayload;

    if (!body?.resolution) {
      return NextResponse.json({ error: "Resolution type is required" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .select("*, jobs(*, payments(*))")
      .eq("id", disputeId)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const job = dispute.jobs;

    if (!job) {
      return NextResponse.json({ error: "Linked job not found" }, { status: 404 });
    }

    const payments: JobPaymentRecord[] = Array.isArray(job.payments)
      ? (job.payments as JobPaymentRecord[])
      : [];
    const paymentResults: Array<{ paymentId: string; action: string }> = [];

    if (body.resolution === "release") {
      for (const payment of payments) {
        if (!payment.stripe_payment_intent_id) continue;

        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id,
        );

        if (paymentIntent.status === "requires_capture") {
          const captureResult = await captureJobPaymentIntent(paymentIntent.id);
          await supabase
            .from("payments")
            .update({
              status: captureResult.status,
              captured_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
          paymentResults.push({ paymentId: String(payment.id), action: "captured" });
        } else {
          paymentResults.push({ paymentId: String(payment.id), action: paymentIntent.status });
        }
      }

      await supabase
        .from("jobs")
        .update({ job_status: "completed", updated_at: new Date().toISOString() })
        .eq("id", job.id);
    }

    if (body.resolution === "refund") {
      for (const payment of payments) {
        if (!payment.stripe_payment_intent_id) continue;
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id,
        );

        if (paymentIntent.status === "succeeded") {
          await refundJobPaymentIntent({ paymentIntentId: paymentIntent.id });
          await supabase
            .from("payments")
            .update({
              status: "refunded",
              refunded_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
          paymentResults.push({ paymentId: String(payment.id), action: "refunded" });
        } else if (paymentIntent.status === "requires_capture") {
          await supabase.from("payments").update({ status: "canceled" }).eq("id", payment.id);
          await stripe.paymentIntents.cancel(paymentIntent.id);
          paymentResults.push({ paymentId: String(payment.id), action: "canceled" });
        }
      }

      await supabase
        .from("jobs")
        .update({ job_status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", job.id);
    }

    if (body.resolution === "partial_refund") {
      if (!body.partialRefundCents || body.partialRefundCents <= 0) {
        return NextResponse.json({ error: "partialRefundCents must be provided" }, { status: 400 });
      }

      const targetPayment = payments.find(
        (payment) => payment.payment_type === "completion" || payment.payment_type === "escrow",
      );

      if (!targetPayment?.stripe_payment_intent_id) {
        return NextResponse.json({ error: "No eligible payment for partial refund" }, { status: 409 });
      }

      await refundJobPaymentIntent({
        paymentIntentId: targetPayment.stripe_payment_intent_id,
        amountCents: body.partialRefundCents,
      });

      await supabase
        .from("payments")
        .update({
          status: "partially_refunded",
          refunded_at: new Date().toISOString(),
        })
        .eq("id", targetPayment.id);

      paymentResults.push({ paymentId: String(targetPayment.id), action: "partial_refund" });
    }

    await supabase
      .from("disputes")
      .update({
        status: "resolved",
        resolution: body.resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    await supabase.from("payment_logs").insert({
      job_id: job.id,
      payment_id: null,
      action: "dispute_resolved",
      payload: {
        disputeId,
        resolution: body.resolution,
        paymentResults,
        partialRefundCents: body.partialRefundCents ?? null,
      },
    });

    return NextResponse.json({ success: true, paymentResults });
  } catch (error) {
    console.error("Failed to resolve dispute:", error);
    return NextResponse.json({ error: "Failed to resolve dispute" }, { status: 500 });
  }
}
