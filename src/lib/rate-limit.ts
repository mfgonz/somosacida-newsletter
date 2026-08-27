import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Database-backed fixed-window rate limiter for public endpoints.
 *
 * An in-memory counter is useless on serverless, where each request may hit a
 * fresh instance, so the counter lives in Postgres. Failures are deliberately
 * fail-open: a database hiccup should not take the signup form offline.
 */
export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  const db = supabaseAdmin();
  const windowStart = new Date(
    Math.floor(Date.now() / (params.windowSeconds * 1000)) *
      params.windowSeconds *
      1000,
  ).toISOString();

  try {
    const { data, error } = await db
      .from("rate_limits")
      .select("count")
      .eq("key", params.key)
      .eq("window_start", windowStart)
      .maybeSingle();

    if (error) return { allowed: true, remaining: params.limit };

    const current = data?.count ?? 0;
    if (current >= params.limit) return { allowed: false, remaining: 0 };

    await db.rpc("increment_rate_limit", {
      p_key: params.key,
      p_window_start: windowStart,
    });

    return { allowed: true, remaining: params.limit - current - 1 };
  } catch {
    return { allowed: true, remaining: params.limit };
  }
}
