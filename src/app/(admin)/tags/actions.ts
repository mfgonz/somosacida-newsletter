"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const tagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
});

export async function createTag(
  name: string,
  color: string,
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = tagSchema.safeParse({ name, color });
  if (!parsed.success) return { ok: false, error: "Nombre o color inválido." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("tags").insert(parsed.data);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esa etiqueta ya existe." };
    return { ok: false, error: error.message };
  }

  await audit({ actorEmail: admin.email, action: "tag.create", metadata: { name } });
  revalidatePath("/tags");
  return { ok: true };
}

export async function deleteTag(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "tag.delete",
    entityType: "tag",
    entityId: id,
  });
  revalidatePath("/tags");
  return { ok: true };
}
