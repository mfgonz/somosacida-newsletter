"use server";

import { z } from "zod";
import { verifyToken } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";
import { suppressContact } from "@/lib/compliance";

const inputSchema = z.object({
  firstName: z.string().trim().max(120),
  lastName: z.string().trim().max(120),
  listIds: z.array(z.string().uuid()).max(100),
});

export async function savePreferences(
  token: string,
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const verified = verifyToken(token, "preferences");
  if (!verified) return { ok: false, error: "Enlace no válido." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const db = supabaseAdmin();

  await db
    .from("contacts")
    .update({
      first_name: parsed.data.firstName || null,
      last_name: parsed.data.lastName || null,
    })
    .eq("id", verified.contactId);

  // Only public lists are shown, so only public lists may be toggled here —
  // a crafted request must not be able to change internal list membership.
  const { data: publicLists } = await db
    .from("lists")
    .select("id")
    .eq("is_public", true);

  const allowed = new Set((publicLists ?? []).map((l) => l.id));
  const chosen = new Set(parsed.data.listIds.filter((id) => allowed.has(id)));

  for (const listId of allowed) {
    await db.from("list_contacts").upsert(
      {
        list_id: listId,
        contact_id: verified.contactId,
        subscribed: chosen.has(listId),
      },
      { onConflict: "list_id,contact_id" },
    );
  }

  return { ok: true };
}

export async function unsubscribeAll(
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  const verified = verifyToken(token, "preferences");
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
    notes: "preference-center",
  });

  return { ok: true };
}
