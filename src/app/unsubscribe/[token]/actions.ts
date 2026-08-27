"use server";

import { verifyToken } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";
import { suppressContact } from "@/lib/compliance";

export async function unsubscribeAction(
  token: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  // The signed token is the only authorization here — there is no session.
  const verified = verifyToken(token, "unsubscribe");
  if (!verified) return { ok: false, error: "Enlace no válido." };

  const { data: contact } = await supabaseAdmin()
    .from("contacts")
    .select("id,email")
    .eq("id", verified.contactId)
    .single();

  if (!contact) return { ok: false, error: "Contacto no encontrado." };

  await suppressContact({
    contactId: contact.id,
    email: contact.email,
    reason: "unsubscribed",
    notes: reason.trim().slice(0, 300) || undefined,
  });

  return { ok: true };
}
