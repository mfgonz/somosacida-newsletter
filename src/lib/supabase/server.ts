import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Request-scoped client carrying the signed-in admin's session.
 * All queries run under RLS, so a policy bug cannot be papered over here.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  const e = env();

  return createServerClient<Database>(
    e.NEXT_PUBLIC_SUPABASE_URL,
    e.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled by middleware instead.
          }
        },
      },
    },
  );
}

/**
 * Bypasses RLS entirely. Use ONLY for operations that have no admin session by
 * definition — public form submissions, unsubscribe links, provider webhooks,
 * and the scheduled-send worker — and only after the caller has been
 * authenticated by its own means (signed token, webhook signature, cron secret).
 *
 * Never import this into a client component or pass its results to one
 * unfiltered.
 */
export function supabaseAdmin() {
  const e = env();
  return createClient<Database>(
    e.NEXT_PUBLIC_SUPABASE_URL,
    e.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
