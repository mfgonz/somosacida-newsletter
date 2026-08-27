"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import type { ContactStatus, TablesUpdate } from "@/lib/database.types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const contactInput = z.object({
  email: z.string().trim().max(254),
  first_name: z.string().trim().max(120).optional().default(""),
  last_name: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(60).optional().default(""),
  company: z.string().trim().max(160).optional().default(""),
  status: z
    .enum(["pending", "subscribed", "unsubscribed", "bounced", "complained", "cleaned"])
    .default("subscribed"),
});

function nullIfBlank(v: string | undefined) {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

export async function createContact(formData: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = contactInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) return { ok: false, error: "Email inválido." };

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      email,
      first_name: nullIfBlank(parsed.data.first_name),
      last_name: nullIfBlank(parsed.data.last_name),
      phone: nullIfBlank(parsed.data.phone),
      company: nullIfBlank(parsed.data.company),
      status: parsed.data.status as ContactStatus,
      consent_source: "manual",
      consent_at: new Date().toISOString(),
      confirmed_at:
        parsed.data.status === "subscribed" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ese email ya existe." };
    return { ok: false, error: error.message };
  }

  await audit({
    actorEmail: admin.email,
    action: "contact.create",
    entityType: "contact",
    entityId: data.id,
    metadata: { email },
  });

  revalidatePath("/contacts");
  return { ok: true };
}

export async function updateContact(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = contactInput.partial().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const supabase = await supabaseServer();
  const patch: TablesUpdate<"contacts"> = {
    first_name: nullIfBlank(parsed.data.first_name),
    last_name: nullIfBlank(parsed.data.last_name),
    phone: nullIfBlank(parsed.data.phone),
    company: nullIfBlank(parsed.data.company),
  };

  if (parsed.data.status) {
    patch.status = parsed.data.status as ContactStatus;
    if (parsed.data.status === "unsubscribed") {
      patch.unsubscribed_at = new Date().toISOString();
    }
  }

  const { error } = await supabase.from("contacts").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Manually resubscribing must also clear any suppression, or the send
  // pipeline would silently skip the contact forever.
  if (parsed.data.status === "subscribed") {
    const { data: c } = await supabase
      .from("contacts")
      .select("email")
      .eq("id", id)
      .single();
    if (c) await supabaseAdmin().from("suppressions").delete().eq("email", c.email);
  }

  await audit({
    actorEmail: admin.email,
    action: "contact.update",
    entityType: "contact",
    entityId: id,
    metadata: { status: parsed.data.status ?? null },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { ok: true };
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { data: c } = await supabase
    .from("contacts")
    .select("email")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "contact.delete",
    entityType: "contact",
    entityId: id,
    metadata: { email: c?.email ?? null },
  });

  revalidatePath("/contacts");
  return { ok: true };
}

export async function addNote(
  contactId: string,
  body: string,
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const text = body.trim().slice(0, 5000);
  if (!text) return { ok: false, error: "La nota está vacía." };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("contact_notes")
    .insert({ contact_id: contactId, body: text, author_email: admin.email });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}

export async function setContactTags(
  contactId: string,
  tagIds: string[],
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  await supabase.from("contact_tags").delete().eq("contact_id", contactId);

  if (tagIds.length) {
    const { error } = await supabase
      .from("contact_tags")
      .insert(tagIds.map((tag_id) => ({ contact_id: contactId, tag_id })));
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}
