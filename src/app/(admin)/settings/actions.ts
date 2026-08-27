"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";

export type Result = { ok: true } | { ok: false; error: string };

const schema = z.object({
  organization_name: z.string().trim().min(1).max(160),
  postal_address: z.string().trim().max(300),
  default_from_name: z.string().trim().max(160),
  default_from_email: z.string().trim().max(254),
  default_reply_to: z.string().trim().max(254),
});

export async function saveSettings(input: unknown): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const d = parsed.data;
  const emailish = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (d.default_from_email && !emailish.test(d.default_from_email)) {
    return { ok: false, error: "El email del remitente no es válido." };
  }
  if (d.default_reply_to && !emailish.test(d.default_reply_to)) {
    return { ok: false, error: "El email de respuesta no es válido." };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("settings")
    .update({
      organization_name: d.organization_name,
      postal_address: d.postal_address,
      default_from_name: d.default_from_name || null,
      default_from_email: d.default_from_email || null,
      default_reply_to: d.default_reply_to || null,
    })
    .eq("id", true);

  if (error) return { ok: false, error: error.message };

  await audit({ actorEmail: admin.email, action: "settings.update" });
  revalidatePath("/settings");
  return { ok: true };
}
