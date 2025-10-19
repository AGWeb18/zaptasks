import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/app/lib/payments/stripeConnect";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// POST /api/connect/accounts/:accountId/onboarding-link
// Generates a reusable onboarding link the user can visit to finish account setup.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;

  if (!accountId) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/connect?accountId=${encodeURIComponent(accountId)}&refresh=1`,
      return_url: `${baseUrl}/connect?accountId=${encodeURIComponent(accountId)}&success=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Failed to create onboarding link", error);
    return NextResponse.json(
      { error: "Unable to generate Stripe onboarding link." },
      { status: 500 }
    );
  }
}
