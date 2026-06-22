import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { stripe } from "@/app/lib/payments/stripeConnect";
import { createClientWithUser } from "@/app/utils/supabase/server";

const FALLBACK_BASE_URL = "https://zaptasks.com";

function resolveBaseUrlForStripe(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL;

  try {
    const candidate =
      configured && configured.includes("://")
        ? configured
        : `https://${configured ?? ""}`;
    const parsed = new URL(candidate);

    const isLiveMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");
    if (isLiveMode && parsed.protocol !== "https:") {
      parsed.protocol = "https:";
    }

    return parsed.origin;
  } catch {
    return FALLBACK_BASE_URL;
  }
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const rawName = typeof body?.name === "string" ? body.name.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const providerName = rawName || email.split("@")[0] || "ZapTasks Provider";
    const baseUrl = resolveBaseUrlForStripe();

    const supabase = await createClientWithUser(userId);

    const { data: providerRecord } = await supabase
      .from("providers")
      .select("user_id, stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    let accountId = providerRecord?.stripe_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        country: "CA",
        email,
        business_type: "individual",
        business_profile: {
          mcc: "7299",
          url: baseUrl,
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        controller: {
          fees: {
            payer: "application",
          },
          losses: {
            payments: "application",
          },
          stripe_dashboard: {
            type: "express",
          },
        },
      });

      accountId = account.id;

      if (providerRecord?.user_id) {
        const { error: updateError } = await supabase
          .from("providers")
          .update({ stripe_account_id: accountId })
          .eq("user_id", userId);

        if (updateError) {
          console.warn("Failed to update provider with Stripe account id", updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from("providers")
          .insert({ user_id: userId, stripe_account_id: accountId })
          .select("user_id")
          .single();

        if (insertError) {
          console.warn("Failed to insert provider record for onboarding", insertError);
        }
      }
    }

    const stripeAccount = await stripe.accounts.retrieve(accountId);
    const currentlyDue = stripeAccount.requirements?.currently_due ?? [];
    const accountIsReady =
      Boolean(stripeAccount.charges_enabled) &&
      Boolean(stripeAccount.payouts_enabled) &&
      currentlyDue.length === 0;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/pro/jobs?onboarding=retry`,
      return_url: `${baseUrl}/pro/jobs?onboarding=success`,
      type: "account_onboarding",
    });

    const jobUpdatePayload: Record<string, unknown> = {
      provider_stripe_account_id: accountId,
      updated_at: new Date().toISOString(),
    };

    if (accountIsReady) {
      jobUpdatePayload.job_status = "awaiting_escrow";
    }

    const { error: jobUpdateError } = await supabase
      .from("jobs")
      .update(jobUpdatePayload)
      .eq("provider_id", userId)
      .eq("job_status", "awaiting_provider_onboarding");

    if (jobUpdateError) {
      console.warn("Failed to refresh job payout readiness", jobUpdateError);
    }

    return NextResponse.json({
      accountId,
      url: accountLink.url,
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
      requirementsDue: currentlyDue,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Stripe Connect account";
    console.error("Failed to create Stripe Connect account", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
