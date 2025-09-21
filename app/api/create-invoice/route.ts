import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { cookies } from "next/headers";
import { createClient } from "@/app/utils/supabase/server";
import { createJobInvoices } from "@/app/lib/payments/stripeConnect";

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

    const metadata = {
      services: Array.isArray(services) ? services.join(', ') : String(services ?? ''),
      date: date ?? '',
      time: time ?? '',
      hours: hours?.toString() ?? '',
      people: people?.toString() ?? '',
      description: description ?? '',
      address: address ?? '',
      bringEquipment: bringEquipment ? 'Yes' : 'No',
    };

    const serviceDate = date ? new Date(date) : null;
    const remainderDaysUntilDue = serviceDate
      ? Math.max(
          1,
          Math.ceil(
            (serviceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ) + 30,
        )
      : 30;

    const invoices = await createJobInvoices({
      amount,
      customerId,
      providerStripeAccountId,
      metadata,
      remainderDaysUntilDue,
    });

    return NextResponse.json({
      depositInvoiceId: invoices.depositInvoiceId,
      depositInvoiceUrl: invoices.depositInvoiceUrl,
      remainderInvoiceId: invoices.remainderInvoiceId,
      remainderInvoiceUrl: invoices.remainderInvoiceUrl,
      jobSubtotalCents: invoices.totals.jobSubtotalCents,
      homeownerTotalCents: invoices.totals.homeownerTotalCents,
      depositInvoiceCents: invoices.totals.depositInvoiceCents,
      remainderInvoiceCents: invoices.totals.remainderInvoiceCents,
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
