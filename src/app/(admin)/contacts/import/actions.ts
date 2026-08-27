"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import type { TablesUpdate } from "@/lib/database.types";

const MAX_ROWS = 50_000;

const rowSchema = z.object({
  email: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
});

export type ImportSummary = {
  ok: true;
  inserted: number;
  updated: number;
  skipped: number;
  invalid: string[];
};

export type ImportResult = ImportSummary | { ok: false; error: string };

export async function importContacts(payload: {
  rows: unknown[];
  status: "subscribed" | "pending";
  tagIds: string[];
  listIds: string[];
  updateExisting: boolean;
  source: string;
}): Promise<ImportResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
    return { ok: false, error: "No hay filas que importar." };
  }
  if (payload.rows.length > MAX_ROWS) {
    return { ok: false, error: `Máximo ${MAX_ROWS.toLocaleString("es-ES")} filas por importación.` };
  }

  const supabase = await supabaseServer();
  const now = new Date().toISOString();

  const invalid: string[] = [];
  const seen = new Set<string>();
  const clean: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    phone: string | null;
  }[] = [];

  for (const raw of payload.rows) {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) continue;

    const email = normalizeEmail(parsed.data.email ?? "");
    if (!isValidEmail(email)) {
      if (email && invalid.length < 50) invalid.push(email);
      continue;
    }
    // Duplicates inside the file itself would make the upsert fail.
    if (seen.has(email)) continue;
    seen.add(email);

    const blank = (v?: string) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t.slice(0, 160);
    };

    clean.push({
      email,
      first_name: blank(parsed.data.first_name),
      last_name: blank(parsed.data.last_name),
      company: blank(parsed.data.company),
      phone: blank(parsed.data.phone),
    });
  }

  if (!clean.length) {
    return { ok: false, error: "Ninguna fila tenía un email válido." };
  }

  // Contacts who previously unsubscribed or complained must never be revived by
  // a re-import; that is the single most common way to earn a spam complaint.
  const { data: suppressed } = await supabase
    .from("suppressions")
    .select("email")
    .in("email", clean.map((c) => c.email).slice(0, 10_000));
  const blocked = new Set((suppressed ?? []).map((s) => s.email.toLowerCase()));

  const { data: existingRows } = await supabase
    .from("contacts")
    .select("email")
    .in("email", clean.map((c) => c.email).slice(0, 10_000));
  const existing = new Set((existingRows ?? []).map((c) => c.email.toLowerCase()));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const insertedIds: string[] = [];

  const CHUNK = 500;
  for (let i = 0; i < clean.length; i += CHUNK) {
    const chunk = clean.slice(i, i + CHUNK);

    const toInsert = chunk.filter(
      (c) => !existing.has(c.email) && !blocked.has(c.email),
    );
    const toUpdate = payload.updateExisting
      ? chunk.filter((c) => existing.has(c.email) && !blocked.has(c.email))
      : [];

    skipped += chunk.length - toInsert.length - toUpdate.length;

    if (toInsert.length) {
      const { data, error } = await supabase
        .from("contacts")
        .insert(
          toInsert.map((c) => ({
            ...c,
            status: payload.status,
            consent_source: payload.source.slice(0, 120) || "import",
            consent_at: now,
            confirmed_at: payload.status === "subscribed" ? now : null,
          })),
        )
        .select("id");

      if (error) return { ok: false, error: error.message };
      inserted += data?.length ?? 0;
      insertedIds.push(...(data ?? []).map((d) => d.id));
    }

    for (const c of toUpdate) {
      // Only fill in blanks; an import must not erase data already on record.
      const patch: TablesUpdate<"contacts"> = {};
      if (c.first_name) patch.first_name = c.first_name;
      if (c.last_name) patch.last_name = c.last_name;
      if (c.company) patch.company = c.company;
      if (c.phone) patch.phone = c.phone;
      if (!Object.keys(patch).length) continue;

      const { error } = await supabase
        .from("contacts")
        .update(patch)
        .eq("email", c.email);
      if (!error) updated += 1;
    }
  }

  if (insertedIds.length && payload.tagIds.length) {
    const pairs = insertedIds.flatMap((contact_id) =>
      payload.tagIds.map((tag_id) => ({ contact_id, tag_id })),
    );
    for (let i = 0; i < pairs.length; i += 1000) {
      await supabase.from("contact_tags").insert(pairs.slice(i, i + 1000));
    }
  }

  if (insertedIds.length && payload.listIds.length) {
    const pairs = insertedIds.flatMap((contact_id) =>
      payload.listIds.map((list_id) => ({ contact_id, list_id })),
    );
    for (let i = 0; i < pairs.length; i += 1000) {
      await supabase.from("list_contacts").insert(pairs.slice(i, i + 1000));
    }
  }

  await audit({
    actorEmail: admin.email,
    action: "contacts.import",
    metadata: { inserted, updated, skipped, source: payload.source },
  });

  revalidatePath("/contacts");
  return { ok: true, inserted, updated, skipped, invalid };
}
