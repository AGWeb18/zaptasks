import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { stripe } from "@/app/lib/payments/stripeConnect";
import { createClientWithUser } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId } = await params;
  const supabase = await createClientWithUser(userId);

  const { data: provider } = await supabase.from("providers").select("stripe_account_id").eq("user_id", userId).single();
  if (!provider || provider.stripe_account_id !== accountId) return NextResponse.json({ error: "Not your account" }, { status: 403 });

  const account = await stripe.accounts.retrieve(accountId);
  return NextResponse.json({
    requirements: account.requirements,
    payouts_enabled: account.payouts_enabled,
    charges_enabled: account.charges_enabled,
  });
}
