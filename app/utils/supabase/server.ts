
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "node:crypto";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const buildSupabaseUserJwt = (userId: string) => {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "Missing SUPABASE_JWT_SECRET. Set this secret to mint user-scoped Supabase tokens."
    );
  }

  const base64Url = (value: string) => Buffer.from(value).toString("base64url");

  const header = { alg: "HS256", typ: "JWT" };
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    aud: "authenticated",
    sub: userId,
    role: "authenticated",
    iss: "clerk-bridge",
    iat: issuedAt,
    exp: issuedAt + 60 * 10,
  };

  const headerSegment = base64Url(JSON.stringify(header));
  const payloadSegment = base64Url(JSON.stringify(payload));
  const data = `${headerSegment}.${payloadSegment}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
};

const initSupabaseClient = async (
  cookieStoreInput?: CookieStore,
  userId?: string
) => {
  const cookieStore = cookieStoreInput ?? (await cookies());

  const globalHeaders: Record<string, string> = {};

  if (userId) {
    globalHeaders.Authorization = `Bearer ${buildSupabaseUserJwt(userId)}`;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: globalHeaders,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

export const createClient = async (cookieStoreInput?: CookieStore) =>
  initSupabaseClient(cookieStoreInput);

export const createClientWithUser = async (
  userId: string,
  cookieStoreInput?: CookieStore
) => initSupabaseClient(cookieStoreInput, userId);
