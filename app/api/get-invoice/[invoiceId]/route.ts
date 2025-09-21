import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { stripe } from "@/app/lib/payments/stripeConnect";
import type Stripe from "stripe";

type GetInvoiceRouteContext = {
  params: Promise<{ invoiceId: string }>;
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

    let paymentIntent: Stripe.PaymentIntent | null = null;

    if (paymentIntentValue) {
      if (typeof paymentIntentValue === "string") {
        const paymentIntentResponse = await stripe.paymentIntents.retrieve(
          paymentIntentValue,
        );
        paymentIntent = paymentIntentResponse as Stripe.PaymentIntent;
      } else {
        paymentIntent = paymentIntentValue;
      }
    }

    return NextResponse.json({ invoice, paymentIntent });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 },
    );
  }
}
