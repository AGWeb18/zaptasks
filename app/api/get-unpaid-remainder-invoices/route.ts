// app/api/get-unpaid-remainder-invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    console.log('Authenticated userId:', userId);

    if (!userId) {
      console.log('Unauthorized: No userId found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Search for the Stripe customer using the clerkUserId in metadata
    const customerSearch = await stripe.customers.search({
      query: `metadata['clerkUserId']:'${userId}'`,
      limit: 1,
    });

    console.log('Stripe customer search result:', JSON.stringify(customerSearch, null, 2));

    if (customerSearch.data.length === 0) {
      console.log('No Stripe customer found for userId:', userId);
      return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 });
    }

    const stripeCustomerId = customerSearch.data[0].id;
    console.log('Stripe customerId:', stripeCustomerId);

    // Fetch unpaid invoices for the customer
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      status: 'open',
      expand: ['data.payment_intent'],
    });

    console.log('Fetched invoices:', JSON.stringify(invoices, null, 2));

    // Filter and format the invoices
    const unpaidRemainderInvoices = invoices.data
      .filter(invoice => {
        console.log('Invoice metadata:', JSON.stringify(invoice.metadata, null, 2));
        return invoice.metadata?.invoiceType === 'remainder';
      })
      .map(invoice => {
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | null;
        console.log('Payment Intent:', JSON.stringify(paymentIntent, null, 2));
        
        const formattedInvoice = {
          id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          date: new Date(invoice.created * 1000).toISOString(),
          services: invoice.metadata?.services ? JSON.parse(invoice.metadata.services) : [],
          paymentIntentClientSecret: paymentIntent?.client_secret || null,
        };
        console.log('Formatted invoice:', JSON.stringify(formattedInvoice, null, 2));
        return formattedInvoice;
      });

    console.log('Unpaid remainder invoices:', JSON.stringify(unpaidRemainderInvoices, null, 2));

    return NextResponse.json({ invoices: unpaidRemainderInvoices });
  } catch (error) {
    console.error('Error fetching unpaid remainder invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';