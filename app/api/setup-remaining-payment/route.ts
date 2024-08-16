import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    // Retrieve the invoice
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Find the PaymentIntent for the remaining balance
    const paymentIntents = await stripe.paymentIntents.list({
      customer: invoice.customer as string,
    });

    const remainingIntent = paymentIntents.data.find(intent => 
      intent.metadata.invoiceId === invoiceId && 
      intent.metadata.paymentType === 'remaining'
    );

    if (!remainingIntent) {
      return NextResponse.json({ error: 'Remaining payment intent not found' }, { status: 404 });
    }

    // Update the PaymentIntent to prepare it for capture
    const updatedIntent = await stripe.paymentIntents.update(remainingIntent.id, {
      capture_method: 'automatic',
    });

    return NextResponse.json({
      clientSecret: updatedIntent.client_secret,
      amount: updatedIntent.amount,
    });

  } catch (error) {
    console.error('Error setting up remaining payment:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}