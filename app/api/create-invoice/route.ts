import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { cookies } from "next/headers";
import { createClient } from "@/app/utils/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// 10% platform fee applied to both homeowner charges and provider payouts
const PLATFORM_FEE_RATE = 0.1;

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

    const totalJobCents = Math.round(amount * 100); // Provider subtotal in cents
    const customerFeeCents = Math.round(totalJobCents * PLATFORM_FEE_RATE);
    const customerTotalCents = totalJobCents + customerFeeCents;

    const depositJobCents = Math.round(totalJobCents * 0.5);
    const remainderJobCents = totalJobCents - depositJobCents;

    const depositCustomerFeeCents = Math.round(customerFeeCents * 0.5);
    const remainderCustomerFeeCents = customerFeeCents - depositCustomerFeeCents;

    const providerFeeDepositCents = Math.round(depositJobCents * PLATFORM_FEE_RATE);
    const providerFeeRemainderCents = Math.round(remainderJobCents * PLATFORM_FEE_RATE);

    const depositInvoiceAmountCents = depositJobCents + depositCustomerFeeCents;
    const remainderInvoiceAmountCents = remainderJobCents + remainderCustomerFeeCents;

    const depositApplicationFeeCents = providerFeeDepositCents + depositCustomerFeeCents;
    const remainderApplicationFeeCents = providerFeeRemainderCents + remainderCustomerFeeCents;

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
      jobSubtotalCents: totalJobCents.toString(),
      homeownerFeeCents: customerFeeCents.toString(),
      homeownerTotalCents: customerTotalCents.toString(),
      depositInvoiceCents: depositInvoiceAmountCents.toString(),
      remainderInvoiceCents: remainderInvoiceAmountCents.toString(),
      providerFeeDepositCents: providerFeeDepositCents.toString(),
      providerFeeRemainderCents: providerFeeRemainderCents.toString(),
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
      application_fee_amount: depositApplicationFeeCents,
    });

    // Add deposit invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: depositInvoiceAmountCents,
      currency: 'cad',
      invoice: depositInvoice.id,
      description: `Deposit for Service: ${services.join(', ')} on ${date} at ${time} (includes ZapTasks homeowner fee)`,
    });

    // Create remainder invoice
    const remainderInvoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: calculateDaysUntilDue(date), // Due after service
      metadata: { ...metadata, invoiceType: 'remainder' },
      on_behalf_of: providerStripeAccountId,
      transfer_data: { destination: providerStripeAccountId },
      application_fee_amount: remainderApplicationFeeCents,
    });

    // Add remainder invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: remainderInvoiceAmountCents,
      currency: 'cad',
      invoice: remainderInvoice.id,
      description: `Remaining balance for Service: ${services.join(', ')} on ${date} at ${time} (includes ZapTasks homeowner fee)`,
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
      jobSubtotalCents: totalJobCents,
      homeownerTotalCents: customerTotalCents,
      depositInvoiceCents: depositInvoiceAmountCents,
      remainderInvoiceCents: remainderInvoiceAmountCents,
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
