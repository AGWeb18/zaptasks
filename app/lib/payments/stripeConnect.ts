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
  providerStripeAccountId: string;
  paymentType: "escrow" | "progress" | "completion";
  captureMethod: "automatic" | "manual";
  metadata?: Record<string, string | number | null | undefined>;
};

// Direct charge on the provider's connected account. The provider is the
// merchant of record: disputes and refunds are their responsibility (with
// Stripe bearing unresolved negative balances per the account's controller
// settings), the provider pays Stripe processing fees, and ZapTasks keeps
// the full application fee.
export async function createJobPaymentIntent({
  jobId,
  amountCents,
  platformFeeCents,
  providerStripeAccountId,
  paymentType,
  captureMethod,
  metadata = {},
}: CreatePaymentIntentInput) {
  if (!amountCents || amountCents <= 0) {
    throw new Error("Payment intent amount must be greater than zero");
  }

  if (!providerStripeAccountId) {
    throw new Error("Provider Stripe account id is required for a direct charge");
  }

  const applicationFeeCents = Math.max(Math.min(Math.round(platformFeeCents), amountCents), 0);

  const paymentIntent = await getStripe().paymentIntents.create(
    {
      amount: amountCents,
      currency: "cad",
      capture_method: captureMethod,
      automatic_payment_methods: { enabled: true },
      application_fee_amount: applicationFeeCents,
      metadata: {
        ...metadata,
        jobId,
        paymentType,
        providerStripeAccountId,
        platformFeeCents: String(applicationFeeCents),
      },
    },
    {
      stripeAccount: providerStripeAccountId,
      // Unique per attempt: reusing a key after cancelling a previous intent
      // would return the cancelled intent instead of a fresh one.
      idempotencyKey: `pi-${jobId}-${paymentType}-${Date.now()}`,
    },
  );

  return paymentIntent;
}

export async function retrieveJobPaymentIntent(
  paymentIntentId: string,
  providerStripeAccountId: string,
) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to retrieve");
  }

  return getStripe().paymentIntents.retrieve(paymentIntentId, {
    stripeAccount: providerStripeAccountId,
  });
}

export async function captureJobPaymentIntent(
  paymentIntentId: string,
  providerStripeAccountId: string,
) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to capture");
  }

  return getStripe().paymentIntents.capture(paymentIntentId, undefined, {
    stripeAccount: providerStripeAccountId,
  });
}

export async function cancelJobPaymentIntent(
  paymentIntentId: string,
  providerStripeAccountId: string,
) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to cancel");
  }

  return getStripe().paymentIntents.cancel(paymentIntentId, undefined, {
    stripeAccount: providerStripeAccountId,
  });
}

export async function refundJobPaymentIntent({
  paymentIntentId,
  amountCents,
  providerStripeAccountId,
}: {
  paymentIntentId: string;
  amountCents?: number;
  providerStripeAccountId: string;
}) {
  if (!paymentIntentId) {
    throw new Error("Payment intent id is required to refund");
  }

  return getStripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: amountCents,
      // Return ZapTasks' fee so the provider isn't out of pocket for it.
      refund_application_fee: true,
    },
    {
      stripeAccount: providerStripeAccountId,
      idempotencyKey: `re-${paymentIntentId}-${amountCents ?? "full"}`,
    },
  );
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
  }, { idempotencyKey: `cu-${trimmedEmail}` });

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

export { PLATFORM_FEE_RATE };
