import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { stripe } from "@/app/lib/payments/stripeConnect";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function determineIfMoreInformationNeeded(account: Stripe.Account) {
  const requirements = account.requirements;
  if (!requirements) {
    return false;
  }

  const pendingFields = [
    ...(requirements.currently_due ?? []),
    ...(requirements.past_due ?? []),
  ];

  return pendingFields.length > 0 || Boolean(requirements.disabled_reason);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Invalid Stripe webhook signature", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    try {
      const supabase = getServiceClient();
      const readinessUpdate = {
        stripe_account_id: account.id,
        stripe_charges_enabled: Boolean(account.charges_enabled),
        stripe_details_submitted: Boolean(account.details_submitted),
      };

      const { data: providers, error: providerUpdateError } = await supabase
        .from("providers")
        .update(readinessUpdate)
        .eq("stripe_account_id", account.id)
        .select("id, user_id");

      if (providerUpdateError) {
        console.error("Failed to update provider readiness from webhook", providerUpdateError);
      }

      const readinessSatisfied =
        readinessUpdate.stripe_charges_enabled && readinessUpdate.stripe_details_submitted;
      const providerRows = Array.isArray(providers) ? providers : [];

      if (providerRows.length > 0) {
        const providerUserIds = providerRows
          .map((row) => row.user_id)
          .filter((value): value is string => Boolean(value));

        if (providerUserIds.length > 0 && readinessSatisfied) {
          const jobUpdatePayload = {
            provider_stripe_account_id: account.id,
            job_status: "awaiting_escrow",
            updated_at: new Date().toISOString(),
          };

          await Promise.all(
            providerUserIds.map((providerId) =>
              supabase
                .from("jobs")
                .update(jobUpdatePayload)
                .eq("provider_id", providerId)
                .eq("job_status", "awaiting_provider_onboarding")
            )
          );
        }

        if (!readinessSatisfied && determineIfMoreInformationNeeded(account)) {
          const requirements = account.requirements;
          const notificationPayload = {
            accountId: account.id,
            currentlyDue: requirements?.currently_due ?? [],
            pastDue: requirements?.past_due ?? [],
            disabledReason: requirements?.disabled_reason ?? null,
          };

          await supabase.from("notifications").insert(
            providerUserIds.map((userId) => ({
              user_id: userId,
              type: "stripe_onboarding_action_required",
              payload: notificationPayload,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to process Stripe webhook event", err);
      return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
