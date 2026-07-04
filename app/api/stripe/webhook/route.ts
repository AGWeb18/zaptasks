import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/app/lib/payments/stripeConnect";
import { createServiceRoleClient } from "@/app/utils/supabase/server";
import { sendPaymentSecuredEmails } from "@/app/lib/email/senders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keeps providers.verified in near-real-time sync with Stripe so the
// reputation endpoint's 24h cache (see resolveVerified there) doesn't leave
// a provider showing "verified" for up to a day after their account becomes
// restricted, or "unverified" for a day after they finish onboarding.
async function handleAccountUpdatedEvent(event: Stripe.Event) {
  const supabase = createServiceRoleClient();
  const account = event.data.object as Stripe.Account;

  const currentlyDue = account.requirements?.currently_due ?? [];
  const verified =
    Boolean(account.charges_enabled) &&
    Boolean(account.payouts_enabled) &&
    currentlyDue.length === 0;

  const { error } = await supabase
    .from("providers")
    .update({ verified, verified_checked_at: new Date().toISOString() })
    .eq("stripe_account_id", account.id);

  if (error) {
    console.warn("Stripe webhook: failed to update provider verified status", error);
  }
}

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

  const isPaymentReady = intent.status === "succeeded" || intent.status === "requires_capture";

  if (isPaymentReady) {
    let nextStatus: string | null = null;

    switch (paymentRecord.payment_type) {
      case "escrow":
      case "progress":
        nextStatus = "in_progress";
        break;
      case "completion":
        nextStatus = intent.status === "succeeded" ? "awaiting_completion_confirmation" : null;
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

    // Email both parties when escrow or progress payment is secured (authorized or captured)
    if (isPaymentReady && (paymentRecord.payment_type === "escrow" || paymentRecord.payment_type === "progress")) {
      const { data: jobDetail } = await supabase
        .from("jobs")
        .select("total_amount_cents, job_request_id")
        .eq("id", paymentRecord.job_id)
        .single();

      if (jobDetail?.job_request_id) {
        const [{ data: jobRequest }, { data: providerApp }] = await Promise.all([
          supabase
            .from("job_requests")
            .select("homeowner_email, homeowner_name, job_title, selected_application_id")
            .eq("id", jobDetail.job_request_id)
            .single(),
          supabase
            .from("job_applications")
            .select("provider_email, provider_name")
            .eq("job_request_id", jobDetail.job_request_id)
            .eq("status", "awarded")
            .maybeSingle(),
        ]);

        if (jobRequest) {
          await sendPaymentSecuredEmails({
            homeownerEmail: jobRequest.homeowner_email,
            homeownerName: jobRequest.homeowner_name ?? "Homeowner",
            providerEmail: providerApp?.provider_email,
            providerName: providerApp?.provider_name ?? "Provider",
            jobTitle: jobRequest.job_title,
            amountCents: intent.amount ?? 0,
          });
        }
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
      case "payment_intent.amount_capturable_updated":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
      case "payment_intent.processing":
        await handlePaymentIntentEvent(event);
        break;
      case "account.updated":
        await handleAccountUpdatedEvent(event);
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
