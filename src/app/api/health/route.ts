import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint.
 *
 * Reports only whether each required variable is PRESENT and whether it passes
 * its basic shape check — never the value, and never a fragment of one. Reads
 * process.env directly rather than going through env(), so it still answers
 * when the configuration is exactly what is broken.
 *
 * Remove once deployment is confirmed healthy.
 */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_FROM_NAME",
  "RESEND_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_EMAIL_ALLOWLIST",
  "TOKEN_SIGNING_SECRET",
  "CRON_SECRET",
] as const;

function shapeOk(key: string, value: string): boolean {
  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL":
    case "NEXT_PUBLIC_APP_URL":
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    case "RESEND_FROM_EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case "TOKEN_SIGNING_SECRET":
      return value.length >= 32;
    case "CRON_SECRET":
      return value.length >= 16;
    case "ADMIN_EMAIL_ALLOWLIST":
      return value.trim().length >= 3;
    default:
      return value.length >= 1;
  }
}

export async function GET() {
  const report = REQUIRED.map((key) => {
    const raw = process.env[key];
    const present = typeof raw === "string" && raw.length > 0;
    return {
      key,
      present,
      shapeOk: present ? shapeOk(key, raw) : false,
      length: present ? raw.length : 0,
      // Flags a value pasted with surrounding quotes or stray whitespace,
      // the most common way an env var looks set but is not.
      suspiciousWrapping: present
        ? /^["'\s]|["'\s]$/.test(raw)
        : false,
    };
  });

  const problems = report.filter((r) => !r.present || !r.shapeOk);

  // Also surface whether the app can reach Supabase at all from the function.
  let supabaseReachable: number | string = "not tested";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      });
      supabaseReachable = res.status;
    } catch (err) {
      supabaseReachable = err instanceof Error ? err.message : "fetch failed";
    }
  }

  return NextResponse.json(
    {
      ok: problems.length === 0,
      nodeVersion: process.version,
      problems: problems.map((p) => p.key),
      env: report,
      supabaseReachable,
    },
    { status: problems.length === 0 ? 200 : 500 },
  );
}
