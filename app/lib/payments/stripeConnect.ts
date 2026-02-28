import Stripe from "stripe";

const STRIPE_API_VERSION = "2025-09-30.clover";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add your Stripe secret key to the environment before using Stripe-backed APIs."
    );
  }

  stripeClient = new Stripe(secretKey, {
    // Cast to Stripe.LatestApiVersion until official typings include this release.
    apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
  });

  return stripeClient;
}

export type EscrowTier = "simple";

export interface EscrowSchedule {
  tier: EscrowTier;
  escrowPercentage: 100;
  progressPercentage: null;
  completionPercentage: 0;
  platformFeeRate: 0.1;
  amounts: {
    escrowCents: number;
    progressCents: 0;
    completionCents: 0;
    platformFeeTotalCents: number;
    platformFeeEscrowCents: number;
    platformFeeProgressCents: 0;
    platformFeeCompletionCents: 0;
  };
}

const PLATFORM_FEE_RATE = 0.1;

export function determineEscrowTier(totalAmountCents: number): EscrowTier {
  return "simple";
}

function pickPlatformFeeRate(tier: EscrowTier): number {
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

// Simplified: always 100% escrow
export function buildEscrowSchedule(totalAmountCents: number): EscrowSchedule {
  if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
    throw new Error("Job total must be a positive integer representing cents");
  }

  const tier = "simple";
  const platformFeeRate = PLATFORM_FEE_RATE;
  const escrowCents = totalAmountCents;
  const platformFeeTotalCents = Math.round(totalAmountCents * platformFeeRate);
  const platformFeeEscrowCents = platformFeeTotalCents;

  return {
    tier,
    escrowPercentage: 100,
    progressPercentage: null,
    completionPercentage: 0,
    platformFeeRate,
    amounts: {
      escrowCents,
      progressCents: 0,
      completionCents: 0,
      platformFeeTotalCents,
      platformFeeEscrowCents,
      platformFeeProgressCents: 0,
      platformFeeCompletionCents: 0,
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

  if (!providerStripeAccountId) {
    throw new Error("Provider Stripe account id is required for destination charge");
  }

  const applicationFeeCents = Math.max(Math.min(Math.round(platformFeeCents), amountCents), 0);

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: amountCents,
    currency: "cad",
    customer: customerId,
    capture_method: captureMethod,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: applicationFeeCents,
    transfer_data: {
      destination: providerStripeAccountId,
    },
    metadata: {
      ...metadata,
      jobId,
      paymentType,
      providerStripeAccountId,
      platformFeeCents: String(applicationFeeCents),
    },
    transfer_group: jobId,
  });

  return paymentIntent;
}

export async function captureJobPaymentIntent(paymentIntentId: string) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to capture");
  }

  return getStripe().paymentIntents.capture(paymentIntentId);
}

export async function cancelJobPaymentIntent(paymentIntentId: string) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to cancel");
  }

  return getStripe().paymentIntents.cancel(paymentIntentId);
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

  return getStripe().refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });
}

export function calculateProviderShare(amountCents: number, platformFeeCents: number): number {
  const gross = Math.max(Number(amountCents) || 0, 0);
  const platformFee = Math.max(Number(platformFeeCents) || 0, 0);
  return Math.max(gross - platformFee, 0);
}

export function calculateProviderReserve(providerShareCents: number) {
  const share = Math.max(Number(providerShareCents) || 0, 0);
  if (share === 0) {
    return { reserveCents: 0, immediateTransferCents: 0 };
  }

  const reserveCents = Math.min(
    share,
    Math.max(Math.round(share * 0.1), 1000),
  );

  return {
    reserveCents,
    immediateTransferCents: Math.max(share - reserveCents, 0),
  };
}

type ProviderTransferInput = {
  jobId: string;
  providerStripeAccountId: string;
  amountCents: number;
  reason: "payout" | "reserve_release";
  metadata?: Record<string, string | number | null | undefined>;
};

export async function createProviderTransfer({
  jobId,
  providerStripeAccountId,
  amountCents,
  reason,
  metadata = {},
}: ProviderTransferInput) {
  if (!jobId) {
    throw new Error("A job id is required to create a provider transfer");
  }

  if (!providerStripeAccountId) {
    throw new Error("Provider account id is required to create a transfer");
  }

  if (!amountCents || amountCents <= 0) {
    throw new Error("Transfer amount must be greater than zero");
  }

  return getStripe().transfers.create({
    amount: amountCents,
    currency: "cad",
    destination: providerStripeAccountId,
    transfer_group: jobId,
    metadata: {
      ...metadata,
      jobId,
      reason,
    },
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
  const existing = await getStripe().customers.search({ query: searchQuery, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await getStripe().customers.create({
    email: trimmedEmail,
    name: name ?? undefined,
  });

  return customer.id;
}


export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, prop, receiver);

    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }

    return value;
  },
});

// Ensure constants exported at top after vars
export const PROVIDER_RESERVE_RATE = 0.1;
export const PROVIDER_RESERVE_MIN_CENTS = 1000;
export const PROVIDER_RESERVE_HOLD_DAYS = 7;
export const PROVIDER_RESERVE_HOLD_MS = PROVIDER_RESERVE_HOLD_DAYS * 24 * 60 * 60 * 1000;

export { PLATFORM_FEE_RATE };
