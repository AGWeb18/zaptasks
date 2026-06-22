import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const createClientWithUser = async (_userId?: string): Promise<SupabaseClient> => {
  const { getToken } = await auth();
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    accessToken: () => getToken(),
  });
};

export const createClient = async (): Promise<SupabaseClient> => {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
};

let cachedServiceRoleClient: SupabaseClient | null = null;

export const createServiceRoleClient = (): SupabaseClient => {
  if (cachedServiceRoleClient) return cachedServiceRoleClient;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cachedServiceRoleClient = createSupabaseClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedServiceRoleClient;
};
