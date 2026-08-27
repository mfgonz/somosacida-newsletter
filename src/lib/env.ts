import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  RESEND_FROM_NAME: z.string().min(1),
  RESEND_REPLY_TO: z.string().email().optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1),

  NEXT_PUBLIC_APP_URL: z.string().url(),
  ADMIN_EMAIL_ALLOWLIST: z.string().min(3),

  // Short secrets would make the unsubscribe-token HMAC forgeable.
  TOKEN_SIGNING_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n  ");
    throw new Error(`Invalid environment configuration:\n  ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

export function adminAllowlist(): string[] {
  return env()
    .ADMIN_EMAIL_ALLOWLIST.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminAllowlist().includes(email.trim().toLowerCase());
}

export function appUrl(path = ""): string {
  const base = env().NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
