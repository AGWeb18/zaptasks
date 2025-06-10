import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { cookies } from "next/headers";
import { createClient } from "@/app/utils/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

function calculateDaysUntilDue(serviceDate: string): number {
  const currentDate = new Date();
  const serviceDateObj = new Date(serviceDate);

  // Ensure we're working with UTC dates
  const currentUTC = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate());
  const serviceUTC = Date.UTC(serviceDateObj.getUTCFullYear(), serviceDateObj.getUTCMonth(), serviceDateObj.getUTCDate());

  // Calculate the difference in days
  const differenceInDays = (serviceUTC - currentUTC) / (1000 * 60 * 60 * 24);

  // Add 30 days and round up to the nearest day
  return Math.ceil(differenceInDays + 30);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept providerId from the request
    const {
      amount,
      customerId,
      services,
      date,
      time,
      hours,
      people,
      description,
      address,
      bringEquipment,
      providerId // <-- new
    } = await req.json();

    if (!amount || isNaN(amount) || !customerId || !providerId) {
      return NextResponse.json({ error: 'Invalid amount, customer ID, or provider ID' }, { status: 400 });
    }

    // Look up provider's Stripe account ID from Supabase
    const supabase = createClient(cookies());
    const { data: provider, error: providerError } = await supabase
      .from("providers")
      .select("stripe_account_id")
      .eq("id", providerId)
      .single();
    if (providerError || !provider?.stripe_account_id) {
      return NextResponse.json({ error: 'Provider Stripe account not found' }, { status: 400 });
    }
    const providerStripeAccountId = provider.stripe_account_id;

    const totalAmount = Math.round(amount * 100); // Convert to cents
    const depositAmount = Math.round(totalAmount * 0.5); // 50% deposit
    const remainingAmount = totalAmount - depositAmount;
    const applicationFee = Math.round(totalAmount * 0.10); // 10% platform fee

    // Create metadata object
    const metadata = {
      services: JSON.stringify(services),
      date,
      time,
      hours: hours.toString(),
      people: people.toString(),
      description,
      address,
      bringEquipment: bringEquipment ? 'Yes' : 'No',
      totalAmount: totalAmount.toString(),
      depositAmount: depositAmount.toString(),
      remainingAmount: remainingAmount.toString(),
    };

    // Create deposit invoice
    const depositInvoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 0, // Due immediately
      metadata: { ...metadata, invoiceType: 'deposit' },
      // For Connect: set on_behalf_of and transfer_data
      on_behalf_of: providerStripeAccountId,
      transfer_data: { destination: providerStripeAccountId },
      application_fee_amount: applicationFee,
    });

    // Add deposit invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: depositAmount,
      currency: 'cad',
      invoice: depositInvoice.id,
      description: `Deposit for Service: ${services.join(', ')} on ${date} at ${time}`,
    });

    // Create remainder invoice
    const remainderInvoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: calculateDaysUntilDue(date), // Due after service
      metadata: { ...metadata, invoiceType: 'remainder' },
    });

    // Add remainder invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: remainingAmount,
      currency: 'cad',
      invoice: remainderInvoice.id,
      description: `Remaining balance for Service: ${services.join(', ')} on ${date} at ${time}`,
    });

    // Finalize and send both invoices
    await stripe.invoices.finalizeInvoice(depositInvoice.id);
    await stripe.invoices.sendInvoice(depositInvoice.id);
    await stripe.invoices.finalizeInvoice(remainderInvoice.id);
    await stripe.invoices.sendInvoice(remainderInvoice.id);

    return NextResponse.json({
      depositInvoiceId: depositInvoice.id,
      depositInvoiceUrl: depositInvoice.hosted_invoice_url,
      remainderInvoiceId: remainderInvoice.id,
      remainderInvoiceUrl: remainderInvoice.hosted_invoice_url,
      totalAmount,
      depositAmount,
      remainingAmount,
    });
  } catch (error: unknown) {
    console.error('Error creating invoices:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
  }
}