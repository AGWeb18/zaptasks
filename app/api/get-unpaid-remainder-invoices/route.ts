// app/api/get-unpaid-remainder-invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/app/lib/payments/stripeConnect';
import type Stripe from 'stripe';

type InvoiceWithExpandedIntent = Stripe.Invoice & {
  payment_intent?: Stripe.PaymentIntent | string | null;
};

export async function GET(req: NextRequest) {
  try {
    const currUser = await currentUser();
    const userId = currUser?.id;

    if (!userId) {
      console.log('Unauthorized: No userId found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = currUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.log('No email found for user:', userId);
      return NextResponse.json({ error: 'No email associated with user' }, { status: 400 });
    }

    console.log('Searching for customer with email:', email);

    const customerSearch = await stripe.customers.search({
      query: `email:'${email}'`,
      limit: 1,
    });

    if (customerSearch.data.length === 0) {
      console.log('No Stripe customer found for email:', email);
      return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 });
    }

    const stripeCustomerId = customerSearch.data[0].id;
    console.log('Stripe customerId:', stripeCustomerId);

    const invoicesResponse = await stripe.invoices.list({
      customer: stripeCustomerId,
      status: 'open',
      expand: ['data.payment_intent'],
    });
    const invoices = invoicesResponse.data;

    const unpaidInvoices = invoices.map((invoice) => {
      const typedInvoice = invoice as InvoiceWithExpandedIntent;
      const paymentIntent =
        typedInvoice.payment_intent && typeof typedInvoice.payment_intent !== 'string'
          ? typedInvoice.payment_intent
          : null;
      
      const formattedInvoice = {
        id: typedInvoice.id,
        amount: typedInvoice.amount_due,
        currency: typedInvoice.currency,
        lines: typedInvoice.lines.data.map((line: Stripe.InvoiceLineItem) => ({
          description: line.description ?? undefined,
          amount: line.amount,
        })),
        // ... other fields
      };

      return {
        ...formattedInvoice,
        paymentIntent: paymentIntent ? {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
        } : null,
      };
    });

    return NextResponse.json({ unpaidInvoices });
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch unpaid invoices' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
