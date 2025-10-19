import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/app/lib/payments/stripeConnect";

// GET /api/connect/accounts/:accountId
// Retrieves live onboarding status directly from Stripe (no local caching).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;

  if (!accountId) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);

    return NextResponse.json({
      id: account.id,
      email: account.email,
      businessProfile: account.business_profile,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    console.error("Failed to retrieve connected account", error);
    return NextResponse.json(
      { error: "Unable to load account status. Confirm the account id is correct." },
      { status: 500 }
    );
  }
}
