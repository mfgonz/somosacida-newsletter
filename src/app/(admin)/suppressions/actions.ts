"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { suppressContact } from "@/lib/compliance";
import { normalizeEmail, isValidEmail } from "@/lib/utils";

export type Result = { ok: true } | { ok: false; error: string };

export async function addSuppression(rawEmail: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) return { ok: false, error: "Email inválido." };

  await suppressContact({ email, reason: "manual", notes: "Añadido manualmente" });

  await audit({
    actorEmail: admin.email,
    action: "suppression.add",
    metadata: { email },
  });

  revalidatePath("/suppressions");
  return { ok: true };
}

/**
 * Removing a suppression re-enables mail to an address that previously opted
 * out, so it is logged loudly and never resubscribes the contact automatically:
 * the person must opt in again themselves.
 */
export async function removeSuppression(email: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("suppressions")
    .delete()
    .eq("email", normalizeEmail(email));

  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "suppression.remove",
    metadata: { email, warning: "address re-enabled for sending" },
  });

  revalidatePath("/suppressions");
  return { ok: true };
}
