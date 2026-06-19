import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { stripe } from "@/app/lib/payments/stripeConnect";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const PLATFORM_FEE_PERCENT = 0.1; // Sample monetisation rate (10%).

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId } = await params;

  if (!accountId) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const priceId = typeof body?.priceId === "string" ? body.priceId.trim() : "";
    const quantity = Number(body?.quantity) > 0 ? Number(body.quantity) : 1;
    const productName = typeof body?.productName === "string" ? body.productName : "Item";
    const unitAmount = Number(body?.unitAmount);

    if (!priceId || !Number.isFinite(unitAmount)) {
      return NextResponse.json(
        { error: "priceId and unitAmount are required to start checkout." },
        { status: 400 }
      );
    }

    const subtotal = Math.round(unitAmount * quantity);
    const applicationFeeAmount = Math.max(
      Math.round(subtotal * PLATFORM_FEE_PERCENT),
      100 // Minimum fee of $1.00 for the sample.
    );

    const session = await stripe.checkout.sessions.create(
      {
        line_items: [
          {
            price: priceId,
            quantity,
          },
        ],
        mode: "payment",
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          description: `ZapTasks sample fee for ${productName}`,
        },
        success_url: `${baseUrl}/connect/${encodeURIComponent(accountId)}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/connect/${encodeURIComponent(accountId)}?canceled=1`,
      },
      {
        stripeAccount: accountId,
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session", error);
    return NextResponse.json(
      { error: "Unable to start checkout. Confirm the product price still exists." },
      { status: 500 }
    );
  }
}
