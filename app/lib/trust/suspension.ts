import { createServiceRoleClient } from "@/app/utils/supabase/server";

// Providers get an account_status column directly (they already have a
// providers row). Homeowners have no dedicated table -- job_requests.homeowner_id
// is just a Clerk id -- so suspension for them lives in the standalone
// user_flags table instead. Both checks fail open to "active" on any lookup
// error so a transient DB issue never silently blocks legitimate users;
// suspension is an explicit, admin-set state, not a default.

export async function isProviderSuspended(providerId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("providers")
    .select("account_status")
    .eq("user_id", providerId)
    .maybeSingle();

  if (error || !data) return false;
  return data.account_status === "suspended";
}

export async function isHomeownerSuspended(homeownerId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_flags")
    .select("account_status")
    .eq("user_id", homeownerId)
    .maybeSingle();

  if (error || !data) return false;
  return data.account_status === "suspended";
}
