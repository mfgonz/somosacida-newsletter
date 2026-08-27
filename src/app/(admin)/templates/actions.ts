"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { designSchema } from "@/lib/email/blocks";

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveTemplate(input: {
  id?: string;
  name: string;
  design: unknown;
}): Promise<SaveResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Ponle un nombre a la plantilla." };

  // Re-validated server-side: the client sends whatever the editor produced,
  // and only a well-formed design may be persisted.
  const parsed = designSchema.safeParse(input.design);
  if (!parsed.success) {
    return { ok: false, error: "El diseño contiene bloques inválidos." };
  }

  const supabase = await supabaseServer();

  if (input.id) {
    const { error } = await supabase
      .from("templates")
      .update({ name, design: parsed.data })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };

    await audit({
      actorEmail: admin.email,
      action: "template.update",
      entityType: "template",
      entityId: input.id,
    });
    revalidatePath("/templates");
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({ name, design: parsed.data })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "template.create",
    entityType: "template",
    entityId: data.id,
  });
  revalidatePath("/templates");
  return { ok: true, id: data.id };
}

export async function deleteTemplate(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "template.delete",
    entityType: "template",
    entityId: id,
  });
  revalidatePath("/templates");
  return { ok: true };
}
