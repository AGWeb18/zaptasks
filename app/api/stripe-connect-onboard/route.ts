import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { stripe } from "@/app/lib/payments/stripeConnect";
import { createClientWithUser } from "@/app/utils/supabase/server";

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const email = body?.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: providerRecord } = await supabase
      .from("providers")
      .select("id, stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    let accountId = providerRecord?.stripe_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: {
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      if (providerRecord?.id) {
        const { error: updateError } = await supabase
          .from("providers")
          .update({ stripe_account_id: accountId })
          .eq("id", providerRecord.id);

        if (updateError) {
          console.warn("Failed to update provider with Stripe account id", updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from("providers")
          .insert({ user_id: userId, stripe_account_id: accountId })
          .select("id")
          .single();

        if (insertError) {
          console.warn("Failed to insert provider record for onboarding", insertError);
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://zaptasks.com";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/pro/jobs?onboarding=retry`,
      return_url: `${baseUrl}/pro/jobs?onboarding=success`,
      type: "account_onboarding",
    });

    const { error: jobUpdateError } = await supabase
      .from("jobs")
      .update({
        provider_stripe_account_id: accountId,
        job_status: "awaiting_escrow",
        updated_at: new Date().toISOString(),
      })
      .eq("provider_id", userId)
      .eq("job_status", "awaiting_provider_onboarding");

    if (jobUpdateError) {
      console.warn("Failed to refresh job payout readiness", jobUpdateError);
    }

    return NextResponse.json({ accountId, url: accountLink.url });
  } catch (error) {
    console.error("Failed to create Stripe Connect account", error);
    return NextResponse.json({ error: "Failed to create Stripe Connect account" }, { status: 500 });
  }
}
