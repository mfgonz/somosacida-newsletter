import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { isAllowedAdmin } from "@/lib/env";

export type AdminSession = { email: string; userId: string };

/** Returns the signed-in admin, or redirects to /login. */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedAdmin(user.email)) redirect("/login");
  return { email: user.email!, userId: user.id };
}

/** Non-redirecting variant for route handlers. */
export async function getAdmin(): Promise<AdminSession | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedAdmin(user.email)) return null;
  return { email: user.email!, userId: user.id };
}

export async function audit(entry: {
  actorEmail: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  // Written with the service role: the audit log is append-only and no user
  // token is permitted to insert into it.
  await supabaseAdmin()
    .from("audit_log")
    .insert({
      actor_email: entry.actorEmail,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: (entry.metadata ?? {}) as never,
      ip: entry.ip ?? null,
    });
}
