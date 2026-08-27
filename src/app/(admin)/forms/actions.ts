"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const formSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80),
  headline: z.string().trim().max(160),
  description: z.string().trim().max(600),
  button_label: z.string().trim().min(1).max(60),
  success_message: z.string().trim().min(1).max(300),
  redirect_url: z.string().trim().max(500),
  double_opt_in: z.boolean(),
  is_active: z.boolean(),
  fields: z
    .array(
      z.object({
        key: z.enum(["email", "first_name", "last_name", "company", "phone"]),
        label: z.string().trim().min(1).max(60),
        required: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(6),
  target_list_ids: z.array(z.string().uuid()).max(20),
  target_tag_ids: z.array(z.string().uuid()).max(20),
});

export async function saveForm(
  input: unknown,
  id?: string,
): Promise<Result<{ id: string; slug: string }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = formSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const d = parsed.data;

  // An email field is what makes this a subscription form at all.
  if (!d.fields.some((f) => f.key === "email")) {
    return { ok: false, error: "El formulario necesita un campo de email." };
  }

  if (d.redirect_url && !/^https?:\/\//i.test(d.redirect_url)) {
    return { ok: false, error: "La URL de redirección debe empezar por https://" };
  }

  const slug = slugify(d.slug || d.name);
  if (!slug) return { ok: false, error: "No se pudo generar la URL del formulario." };

  const payload = {
    name: d.name,
    slug,
    headline: d.headline || null,
    description: d.description || null,
    button_label: d.button_label,
    success_message: d.success_message,
    redirect_url: d.redirect_url || null,
    double_opt_in: d.double_opt_in,
    is_active: d.is_active,
    fields: d.fields.map((f) => ({
      key: f.key,
      label: f.label,
      required: f.key === "email" ? true : Boolean(f.required),
    })),
    target_list_ids: d.target_list_ids,
    target_tag_ids: d.target_tag_ids,
  };

  const supabase = await supabaseServer();

  if (id) {
    const { error } = await supabase.from("forms").update(payload).eq("id", id);
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Esa URL ya está en uso." };
      return { ok: false, error: error.message };
    }
    revalidatePath("/forms");
    return { ok: true, id, slug };
  }

  const { data, error } = await supabase
    .from("forms")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esa URL ya está en uso." };
    return { ok: false, error: error.message };
  }

  await audit({
    actorEmail: admin.email,
    action: "form.create",
    entityType: "form",
    entityId: data.id,
  });

  revalidatePath("/forms");
  return { ok: true, id: data.id, slug };
}

export async function deleteForm(id: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("forms").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "form.delete",
    entityType: "form",
    entityId: id,
  });

  revalidatePath("/forms");
  return { ok: true };
}
