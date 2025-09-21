import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type GetInvoiceRouteContext = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(req: NextRequest, context: GetInvoiceRouteContext) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = (await context.params) ?? {};
    const invoiceId = params.invoiceId;

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    let paymentIntent = null;
    if (invoice.payment_intent) {
      paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
    }

    return NextResponse.json({ invoice, paymentIntent });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}
