import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { stripe } from "@/app/lib/payments/stripeConnect";
import type Stripe from "stripe";

type GetPaymentIntentRouteContext = {
  params: Promise<{ id: string }>;
};

function selectDefaultPaymentIntent(
  payments: Stripe.InvoicePayment[] | undefined,
): string | Stripe.PaymentIntent | undefined {
  if (!payments?.length) {
    return undefined;
  }

  const paymentIntentPayment =
    payments.find(
      (payment) =>
        payment.is_default && payment.payment.type === "payment_intent",
    ) ??
    payments.find((payment) => payment.payment.type === "payment_intent");

  return paymentIntentPayment?.payment.payment_intent;
}

export async function GET(req: NextRequest, context: GetPaymentIntentRouteContext) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const params = (await context.params) ?? {};
    const invoiceId = params.id;

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoiceResponse = await stripe.invoices.retrieve(invoiceId);
    const invoice = invoiceResponse as Stripe.Invoice;

    const invoicePaymentsResponse = await stripe.invoicePayments.list({
      invoice: invoiceId,
      expand: ["data.payment.payment_intent"],
      limit: 10,
    });

    const paymentIntentValue = selectDefaultPaymentIntent(
      invoicePaymentsResponse.data,
    );

    let clientSecret: string | null = null;

    if (paymentIntentValue) {
      if (typeof paymentIntentValue === "string") {
        const paymentIntentResponse = await stripe.paymentIntents.retrieve(
          paymentIntentValue,
        );
        clientSecret = paymentIntentResponse.client_secret ?? null;
      } else {
        clientSecret = paymentIntentValue.client_secret ?? null;
      }
    }

    return NextResponse.json({
      invoice,
      clientSecret,
    });
  } catch (err) {
    console.error("Error retrieving invoice:", err);
    return NextResponse.json(
      { error: "Failed to retrieve invoice" },
      { status: 500 },
    );
  }
}
