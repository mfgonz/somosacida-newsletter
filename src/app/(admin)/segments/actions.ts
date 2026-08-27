"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { segmentDefinitionSchema, resolveSegment } from "@/lib/segments";

export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export async function saveSegment(input: {
  id?: string;
  name: string;
  definition: unknown;
}): Promise<Result<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Ponle un nombre al segmento." };

  const parsed = segmentDefinitionSchema.safeParse(input.definition);
  if (!parsed.success) return { ok: false, error: "Reglas inválidas." };

  const supabase = await supabaseServer();

  if (input.id) {
    const { error } = await supabase
      .from("segments")
      .update({ name, definition: parsed.data })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/segments");
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("segments")
    .insert({ name, definition: parsed.data })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "segment.create",
    entityType: "segment",
    entityId: data.id,
  });
  revalidatePath("/segments");
  return { ok: true, id: data.id };
}

export async function previewSegment(
  definition: unknown,
): Promise<Result<{ count: number }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = segmentDefinitionSchema.safeParse(definition);
  if (!parsed.success) return { ok: false, error: "Reglas inválidas." };

  const supabase = await supabaseServer();
  const { ids, error } = await resolveSegment(supabase, parsed.data, {
    onlySendable: false,
  });
  if (error) return { ok: false, error };

  return { ok: true, count: ids.length };
}

export async function deleteSegment(id: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("segments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "segment.delete",
    entityType: "segment",
    entityId: id,
  });
  revalidatePath("/segments");
  return { ok: true };
}
