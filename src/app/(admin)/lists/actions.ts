"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";

export type Result = { ok: true } | { ok: false; error: string };

const listSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300),
  is_public: z.boolean(),
});

export async function createList(input: unknown): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("lists").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    is_public: parsed.data.is_public,
  });

  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "list.create",
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/lists");
  return { ok: true };
}

export async function deleteList(id: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "list.delete",
    entityType: "list",
    entityId: id,
  });
  revalidatePath("/lists");
  return { ok: true };
}
