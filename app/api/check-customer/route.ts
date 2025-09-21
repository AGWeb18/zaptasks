// File: app/api/check-customer/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { stripe } from '@/app/lib/payments/stripeConnect';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();

    const existingCustomers = await stripe.customers.list({ email: email, limit: 1 });
    
    if (existingCustomers.data.length > 0) {
      return NextResponse.json({ isCustomer: true, customerId: existingCustomers.data[0].id });
    } else {
      return NextResponse.json({ isCustomer: false, customerId: null });
    }
  } catch (error) {
    console.error('Error checking customer:', error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}