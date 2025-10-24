import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/app/lib/payments/stripeConnect";
import { createServiceRoleClient } from "@/app/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handlePaymentIntentEvent(event: Stripe.Event) {
  const supabase = createServiceRoleClient();
  const intent = event.data.object as Stripe.PaymentIntent;
  const intentId = intent.id;

  const { data: paymentRecord, error: paymentLookupError } = await supabase
    .from("payments")
    .select("id, job_id, payment_type, status")
    .eq("stripe_payment_intent_id", intentId)
    .maybeSingle();

  if (paymentLookupError) {
    console.error("Stripe webhook: failed to load payment record", paymentLookupError);
    throw new Error("Failed to load payment record for webhook");
  }

  if (!paymentRecord) {
    console.warn("Stripe webhook: payment intent not tracked", intentId);
    return;
  }

  const updates: Record<string, unknown> = {
    status: intent.status,
  };

  if (intent.status === "succeeded") {
    const capturedTimestampMs = typeof intent.created === "number"
      ? intent.created * 1000
      : Date.now();
    updates.captured_at = new Date(capturedTimestampMs).toISOString();
  }

  if (intent.status === "requires_payment_method") {
    updates.captured_at = null;
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", paymentRecord.id);

  if (updateError) {
    console.error("Stripe webhook: failed to update payment record", updateError);
    throw new Error("Failed to update payment record from webhook");
  }

  await supabase.from("payment_logs").insert({
    job_id: paymentRecord.job_id,
    payment_id: paymentRecord.id,
    action: `stripe_${event.type}`,
    payload: {
      paymentIntentId: intent.id,
      status: intent.status,
      paymentType: paymentRecord.payment_type,
    },
  });

  if (intent.status === "succeeded") {
    let nextStatus: string | null = null;

    switch (paymentRecord.payment_type) {
      case "escrow":
      case "progress":
        nextStatus = "in_progress";
        break;
      case "completion":
        nextStatus = "awaiting_completion_confirmation";
        break;
      default:
        nextStatus = null;
    }

    if (nextStatus) {
      const { error: jobStatusError } = await supabase
        .from("jobs")
        .update({ job_status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", paymentRecord.job_id)
        .not("job_status", "eq", "completed");

      if (jobStatusError) {
        console.warn("Stripe webhook: failed to update job status", jobStatusError);
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook integration not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown signature error";
    console.error("Stripe webhook: signature verification failed", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
      case "payment_intent.processing":
        await handlePaymentIntentEvent(event);
        break;
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error(`Stripe webhook: error handling ${event.type}`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
