import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const PLATFORM_FEE_RATE = 0.1;

export async function getOrCreateCustomer({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}): Promise<string> {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail) {
    throw new Error("Customer email is required");
  }

  const searchQuery = `email:'${trimmedEmail.replace(/'/g, "''")}'`;
  const existing = await stripe.customers.search({ query: searchQuery, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({
    email: trimmedEmail,
    name: name ?? undefined,
  });

  return customer.id;
}

interface CreateJobInvoicesInput {
  amount: number; // CAD dollars
  customerId: string;
  providerStripeAccountId: string;
  metadata: Record<string, string>;
  remainderDaysUntilDue?: number;
}

interface CreateJobInvoicesResult {
  depositInvoiceId: string;
  depositInvoiceUrl: string | null;
  remainderInvoiceId: string;
  remainderInvoiceUrl: string | null;
  totals: {
    jobSubtotalCents: number;
    homeownerTotalCents: number;
    depositInvoiceCents: number;
    remainderInvoiceCents: number;
    depositHomeownerFeeCents: number;
    remainderHomeownerFeeCents: number;
    providerFeeDepositCents: number;
    providerFeeRemainderCents: number;
  };
}

export async function createJobInvoices({
  amount,
  customerId,
  providerStripeAccountId,
  metadata,
  remainderDaysUntilDue,
}: CreateJobInvoicesInput): Promise<CreateJobInvoicesResult> {
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    throw new Error("Invoice amount must be greater than zero");
  }

  const totalJobCents = Math.round(amount * 100);
  const customerFeeCents = Math.round(totalJobCents * PLATFORM_FEE_RATE);
  const customerTotalCents = totalJobCents + customerFeeCents;

  const depositJobCents = Math.round(totalJobCents * 0.5);
  const remainderJobCents = totalJobCents - depositJobCents;

  const depositHomeownerFeeCents = Math.round(customerFeeCents * 0.5);
  const remainderHomeownerFeeCents = customerFeeCents - depositHomeownerFeeCents;

  const providerFeeDepositCents = Math.round(depositJobCents * PLATFORM_FEE_RATE);
  const providerFeeRemainderCents = Math.round(remainderJobCents * PLATFORM_FEE_RATE);

  const depositInvoiceAmountCents = depositJobCents + depositHomeownerFeeCents;
  const remainderInvoiceAmountCents = remainderJobCents + remainderHomeownerFeeCents;

  const depositApplicationFeeCents = providerFeeDepositCents + depositHomeownerFeeCents;
  const remainderApplicationFeeCents = providerFeeRemainderCents + remainderHomeownerFeeCents;

  const sharedMetadata = {
    ...metadata,
    jobSubtotalCents: totalJobCents.toString(),
    homeownerFeeCents: customerFeeCents.toString(),
    homeownerTotalCents: customerTotalCents.toString(),
  };

  const depositInvoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 0,
    metadata: { ...sharedMetadata, invoiceType: "deposit" },
    on_behalf_of: providerStripeAccountId,
    transfer_data: { destination: providerStripeAccountId },
    application_fee_amount: depositApplicationFeeCents,
  });

  if (!depositInvoice.id) {
    throw new Error("Stripe returned a deposit invoice without an id");
  }

  await stripe.invoiceItems.create({
    customer: customerId,
    amount: depositInvoiceAmountCents,
    currency: "cad",
    invoice: depositInvoice.id,
    description: metadata?.services
      ? `Deposit for Service: ${metadata.services} on ${metadata.date ?? "TBD"} at ${metadata.time ?? "TBD"} (includes ZapTasks homeowner fee)`
      : "Deposit invoice",
  });

  const remainderInvoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: remainderDaysUntilDue ?? 30,
    metadata: { ...sharedMetadata, invoiceType: "remainder" },
    on_behalf_of: providerStripeAccountId,
    transfer_data: { destination: providerStripeAccountId },
    application_fee_amount: remainderApplicationFeeCents,
  });

  if (!remainderInvoice.id) {
    throw new Error("Stripe returned a remainder invoice without an id");
  }

  await stripe.invoiceItems.create({
    customer: customerId,
    amount: remainderInvoiceAmountCents,
    currency: "cad",
    invoice: remainderInvoice.id,
    description: metadata?.services
      ? `Remaining balance for Service: ${metadata.services} on ${metadata.date ?? "TBD"} at ${metadata.time ?? "TBD"} (includes ZapTasks homeowner fee)`
      : "Remaining balance invoice",
  });

  await stripe.invoices.finalizeInvoice(depositInvoice.id);
  await stripe.invoices.sendInvoice(depositInvoice.id);
  await stripe.invoices.finalizeInvoice(remainderInvoice.id);
  await stripe.invoices.sendInvoice(remainderInvoice.id);

  return {
    depositInvoiceId: depositInvoice.id,
    depositInvoiceUrl: depositInvoice.hosted_invoice_url ?? null,
    remainderInvoiceId: remainderInvoice.id,
    remainderInvoiceUrl: remainderInvoice.hosted_invoice_url ?? null,
    totals: {
      jobSubtotalCents: totalJobCents,
      homeownerTotalCents: customerTotalCents,
      depositInvoiceCents: depositInvoiceAmountCents,
      remainderInvoiceCents: remainderInvoiceAmountCents,
      depositHomeownerFeeCents,
      remainderHomeownerFeeCents,
      providerFeeDepositCents,
      providerFeeRemainderCents,
    },
  };
}

export { stripe, PLATFORM_FEE_RATE };
