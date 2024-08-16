// app/api/get-invoice/[invoiceId]/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET(
  request: Request,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Fetch the PaymentIntent associated with this invoice
    let clientSecret = null;
    if (invoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
      clientSecret = paymentIntent.client_secret;
    }

    // Return both invoice data and client secret
    return NextResponse.json({
      invoice,
      clientSecret
    });
  } catch (err) {
    console.error('Error retrieving invoice:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}