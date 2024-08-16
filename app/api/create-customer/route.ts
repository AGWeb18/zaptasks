// src/app/api/create-customer/route.ts
import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { auth, currentUser } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, email } = await req.json();
    
    const customer = await stripe.customers.create({
      name,
      email,
      metadata: {
        clerkUserId: userId
      }
    });
    
    return NextResponse.json({ customerId: customer.id });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Error creating customer' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';