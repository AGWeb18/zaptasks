import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type GetPaymentIntentRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: GetPaymentIntentRouteContext) {
  try {
    const params = (await context.params) ?? {};
    const invoiceId = params.id;

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Fetch the PaymentIntent associated with this invoice
    let clientSecret = null;
    if (invoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        invoice.payment_intent as string
      );
      clientSecret = paymentIntent.client_secret;
    }

    // Return both invoice data and client secret
    return NextResponse.json({
      invoice,
      clientSecret,
    });
  } catch (err) {
    console.error("Error retrieving invoice:", err);
    return NextResponse.json(
      { error: "Failed to retrieve invoice" },
      { status: 500 }
    );
  }
}
