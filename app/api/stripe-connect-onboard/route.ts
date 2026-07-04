import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

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
      .select("user_id, stripe_account_id, display_name, photo_url")
      .eq("user_id", userId)
      .maybeSingle();

    // Populate the human profile fields from Clerk (never from client input)
    // whenever they're missing, so the public profile page isn't stuck
    // showing an anonymous "Helper Profile" for every helper. Folded into
    // the insert/update calls below rather than a standalone write, since a
    // brand-new provider has no row yet for a separate update to land on.
    let profileFields: { display_name: string; photo_url: string | null } | null = null;
    if (!providerRecord?.display_name || !providerRecord?.photo_url) {
      const client = clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const displayName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
        clerkUser.username ||
        providerName;
      profileFields = { display_name: displayName, photo_url: clerkUser.imageUrl ?? null };
    }

    if (profileFields && providerRecord?.user_id) {
      const { error: profileUpdateError } = await supabase
        .from("providers")
        .update(profileFields)
        .eq("user_id", userId);

      if (profileUpdateError) {
        console.warn("Failed to backfill provider profile fields", profileUpdateError);
      }
    }

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
          // Standard-account model: Stripe (not ZapTasks) is liable for
          // disputes/negative balances on connected accounts, and the
          // connected account pays its own Stripe processing fees.
          fees: {
            payer: "account",
          },
          losses: {
            payments: "stripe",
          },
          requirement_collection: "stripe",
          stripe_dashboard: {
            type: "full",
          },
        },
      });

      accountId = account.id;

      if (providerRecord?.user_id) {
        const { error: updateError } = await supabase
          .from("providers")
          .update({ stripe_account_id: accountId, ...profileFields })
          .eq("user_id", userId);

        if (updateError) {
          console.warn("Failed to update provider with Stripe account id", updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from("providers")
          .insert({ user_id: userId, stripe_account_id: accountId, ...profileFields })
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
