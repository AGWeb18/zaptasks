// app/api/get-unpaid-remainder-invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { currentUser } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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

    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      status: 'open',
      expand: ['data.payment_intent'],
    });

    const unpaidInvoices = invoices.data.map(invoice => {
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | null;
      
      const formattedInvoice = {
        id: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        date: new Date(invoice.created * 1000).toISOString(),
        services: invoice.metadata?.services ? JSON.parse(invoice.metadata.services) : [],
        paymentIntentClientSecret: paymentIntent?.client_secret || null,
        lines: invoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount,
        })),
      };
      return formattedInvoice;
    });

    console.log('Unpaid invoices:', JSON.stringify(unpaidInvoices, null, 2));

    return NextResponse.json({ invoices: unpaidInvoices });
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';