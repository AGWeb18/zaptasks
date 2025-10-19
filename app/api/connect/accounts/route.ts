import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/app/lib/payments/stripeConnect";

// POST /api/connect/accounts
// Creates a new connected account using Stripe's controller-based onboarding model.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : undefined;

    const account = await stripe.accounts.create({
      // Controller options configure how the platform manages fees, losses, and dashboard access.
      controller: {
        fees: {
          // The connected account pays Stripe fees directly.
          payer: "account",
        },
        losses: {
          // Stripe resolves disputes so the platform does not assume the risk.
          payments: "stripe",
        },
        stripe_dashboard: {
          // Provide the connected account with full dashboard access for transparency.
          type: "full",
        },
      },
      // Optional contact details make the onboarding form friendlier.
      email: email || undefined,
    });

    return NextResponse.json({ accountId: account.id });
  } catch (error) {
    console.error("Failed to create connected account", error);
    return NextResponse.json(
      { error: "Unable to create connected account. Check your Stripe credentials." },
      { status: 500 }
    );
  }
}
