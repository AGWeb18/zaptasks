import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY. Export your Stripe secret key before running this script."
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-09-30.clover",
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

const PAGE_SIZE = 100;

async function fetchProviders(page) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("providers")
    .select("id, stripe_account_id")
    .not("stripe_account_id", "is", null)
    .range(from, to);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function updateAccountController(accountId, providerId) {
  try {
    await stripe.accounts.update(accountId, {
      controller: {
        fees: { payer: "account" },
        losses: { payments: "stripe" },
        stripe_dashboard: { type: "express" },
      },
    });

    console.log(`Updated controller settings for provider ${providerId} (${accountId}).`);
  } catch (error) {
    console.error(
      `Failed to update controller settings for provider ${providerId} (${accountId}).`,
      error,
    );
  }
}

async function main() {
  let page = 0;
  let totalUpdated = 0;

  while (true) {
    const providers = await fetchProviders(page);
    if (providers.length === 0) {
      break;
    }

    for (const provider of providers) {
      if (!provider.stripe_account_id) {
        continue;
      }

      await updateAccountController(provider.stripe_account_id, provider.id);
      totalUpdated += 1;
    }

    if (providers.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  console.log(`Finished updating ${totalUpdated} Stripe accounts.`);
}

main().catch((error) => {
  console.error("Unexpected failure while updating controller settings.", error);
  process.exit(1);
});
