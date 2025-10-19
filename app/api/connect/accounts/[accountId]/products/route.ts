import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/app/lib/payments/stripeConnect";

// GET /api/connect/accounts/:accountId/products
// Returns the products that belong to the connected account.
// POST creates a new product for that account.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;

  if (!accountId) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  try {
    const products = await stripe.products.list(
      { limit: 20, expand: ["data.default_price"] },
      { stripeAccount: accountId }
    );

    return NextResponse.json({ products: products.data });
  } catch (error) {
    console.error("Failed to list products", error);
    return NextResponse.json(
      { error: "Unable to load products for this connected account." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;

  if (!accountId) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const currency = typeof body?.currency === "string" ? body.currency.trim().toLowerCase() : "";
    const price = Number(body?.price);

    if (!name || !currency || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Name, currency, and a positive price are required." },
        { status: 400 }
      );
    }

    const product = await stripe.products.create(
      {
        name,
        description: description || undefined,
        default_price_data: {
          unit_amount: Math.round(price * 100),
          currency,
        },
      },
      {
        stripeAccount: accountId,
      }
    );

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Failed to create product", error);
    return NextResponse.json(
      { error: "Unable to create product for this connected account." },
      { status: 500 }
    );
  }
}
