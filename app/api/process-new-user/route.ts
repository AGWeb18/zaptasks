// 2. Create an API route to process new users

// app/api/process-new-user/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    // Check if the user already exists in Supabase
    const { data: existingUser } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (existingUser) {
      return NextResponse.json({ message: "User already processed" });
    }

    // Create a customer in Stripe
    const customer = await stripe.customers.create({
      email: email,
      metadata: { clerkUserId: userId }
    });

    // Store the Clerk User ID and Stripe Customer ID in Supabase
    await supabase.from('customers').insert({
      user_id: userId,
      email: email,
      stripe_customer_id: customer.id
    });

    return NextResponse.json({ message: 'User processed successfully' });
  } catch (error) {
    console.error('Error processing new user:', error);
    return NextResponse.json({ error: 'Error processing new user' }, { status: 500 });
  }
}