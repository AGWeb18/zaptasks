import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Add your Stripe secret key to the environment before starting the app."
  );
}

const STRIPE_API_VERSION = "2025-09-30.clover";

const stripe = new Stripe(secretKey, {
  // Cast to Stripe.LatestApiVersion until official typings include this release.
  apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
});

const PLATFORM_FEE_RATE = 0.1;
const LARGE_JOB_FEE_RATE = 0.08;
const SMALL_JOB_THRESHOLD_CENTS = 10000; // $100
const MEDIUM_JOB_THRESHOLD_CENTS = 50000; // $500
const DEFAULT_CURRENCY = "cad";

export type EscrowTier = "small" | "medium" | "large";

export interface EscrowSchedule {
  tier: EscrowTier;
  escrowPercentage: number;
  progressPercentage: number | null;
  completionPercentage: number;
  platformFeeRate: number;
  amounts: {
    escrowCents: number;
    progressCents: number;
    completionCents: number;
    platformFeeTotalCents: number;
    platformFeeEscrowCents: number;
    platformFeeProgressCents: number;
    platformFeeCompletionCents: number;
  };
}

export function determineEscrowTier(totalAmountCents: number): EscrowTier {
  if (totalAmountCents <= SMALL_JOB_THRESHOLD_CENTS) {
    return "small";
  }

  if (totalAmountCents <= MEDIUM_JOB_THRESHOLD_CENTS) {
    return "medium";
  }

  return "large";
}

function pickPlatformFeeRate(tier: EscrowTier): number {
  if (tier === "large") {
    return LARGE_JOB_FEE_RATE;
  }

  return PLATFORM_FEE_RATE;
}

function allocateAmounts(total: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let remainder = total;

  return weights.map((weight, index) => {
    if (weight === 0) {
      return 0;
    }

    const rawValue = (total * weight) / totalWeight;
    let amount = Math.round(rawValue);

    if (index === weights.length - 1) {
      amount = remainder;
    }

    remainder -= amount;
    return amount;
  });
}

export function buildEscrowSchedule(totalAmountCents: number): EscrowSchedule {
  if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
    throw new Error("Job total must be a positive integer representing cents");
  }

  const tier = determineEscrowTier(totalAmountCents);
  const platformFeeRate = pickPlatformFeeRate(tier);

  let escrowPercentage = 100;
  let progressPercentage: number | null = null;
  let completionPercentage = 0;

  if (tier === "medium") {
    escrowPercentage = 50;
    completionPercentage = 50;
  } else if (tier === "large") {
    escrowPercentage = 30;
    progressPercentage = 30;
    completionPercentage = 40;
  }

  const paymentPercentages = [
    escrowPercentage,
    progressPercentage ?? 0,
    completionPercentage,
  ];

  const [escrowCents, progressCents, completionCents] = allocateAmounts(
    totalAmountCents,
    paymentPercentages,
  );

  const platformFeeTotalCents = Math.round(totalAmountCents * platformFeeRate);
  const [platformFeeEscrowCents, platformFeeProgressCents, platformFeeCompletionCents] = allocateAmounts(
    platformFeeTotalCents,
    [escrowCents, progressCents, completionCents],
  );

  return {
    tier,
    escrowPercentage,
    progressPercentage,
    completionPercentage,
    platformFeeRate,
    amounts: {
      escrowCents,
      progressCents,
      completionCents,
      platformFeeTotalCents,
      platformFeeEscrowCents,
      platformFeeProgressCents,
      platformFeeCompletionCents,
    },
  };
}

type CreatePaymentIntentInput = {
  jobId: string;
  amountCents: number;
  platformFeeCents: number;
  customerId: string;
  providerStripeAccountId: string;
  paymentType: "escrow" | "progress" | "completion";
  captureMethod: "automatic" | "manual";
  metadata?: Record<string, string | number | null | undefined>;
};

export async function createJobPaymentIntent({
  jobId,
  amountCents,
  platformFeeCents,
  customerId,
  providerStripeAccountId,
  paymentType,
  captureMethod,
  metadata = {},
}: CreatePaymentIntentInput) {
  if (!amountCents || amountCents <= 0) {
    throw new Error("Payment intent amount must be greater than zero");
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: DEFAULT_CURRENCY,
    customer: customerId,
    capture_method: captureMethod,
    automatic_payment_methods: { enabled: true },
    transfer_data: {
      destination: providerStripeAccountId,
    },
    on_behalf_of: providerStripeAccountId,
    application_fee_amount: platformFeeCents,
    metadata: {
      ...metadata,
      jobId,
      paymentType,
    },
  });

  return paymentIntent;
}

export async function captureJobPaymentIntent(paymentIntentId: string) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to capture");
  }

  return stripe.paymentIntents.capture(paymentIntentId);
}

export async function cancelJobPaymentIntent(paymentIntentId: string) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to cancel");
  }

  return stripe.paymentIntents.cancel(paymentIntentId);
}

export async function refundJobPaymentIntent({
  paymentIntentId,
  amountCents,
}: {
  paymentIntentId: string;
  amountCents?: number;
}) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to refund");
  }

  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });
}

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
