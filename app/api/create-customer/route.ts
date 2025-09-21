// src/app/api/create-customer/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { stripe } from '@/app/lib/payments/stripeConnect';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name } = await req.json();
    
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