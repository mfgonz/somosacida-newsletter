"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { designSchema } from "@/lib/email/blocks";

export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const stepSchema = z.object({
  step_type: z.enum(["wait", "email", "tag"]),
  wait_minutes: z.number().int().min(0).max(525_600),
  subject: z.string().trim().max(250).optional().default(""),
  design: z.unknown().optional(),
  tag_id: z.string().uuid().nullable().optional(),
});

const automationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trigger_type: z.enum(["contact_created", "tag_added", "list_joined", "form_submitted"]),
  trigger_config: z.record(z.string(), z.string()).default({}),
  is_active: z.boolean(),
  steps: z.array(stepSchema).max(20),
});

export async function saveAutomation(
  input: unknown,
  id?: string,
): Promise<Result<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = automationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const d = parsed.data;

  for (const [i, step] of d.steps.entries()) {
    if (step.step_type === "email") {
      if (!step.subject.trim()) {
        return { ok: false, error: `El paso ${i + 1} necesita un asunto.` };
      }
      if (!designSchema.safeParse(step.design).success) {
        return { ok: false, error: `El paso ${i + 1} tiene un diseño inválido.` };
      }
    }
    if (step.step_type === "tag" && !step.tag_id) {
      return { ok: false, error: `El paso ${i + 1} necesita una etiqueta.` };
    }
  }

  const supabase = await supabaseServer();
  const payload = {
    name: d.name,
    trigger_type: d.trigger_type,
    trigger_config: d.trigger_config,
    is_active: d.is_active,
  };

  let automationId = id;

  if (automationId) {
    const { error } = await supabase
      .from("automations")
      .update(payload)
      .eq("id", automationId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("automations")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    automationId = data.id;
  }

  // Steps are positional, so they are replaced wholesale rather than diffed.
  await supabase.from("automation_steps").delete().eq("automation_id", automationId);

  if (d.steps.length) {
    const { error } = await supabase.from("automation_steps").insert(
      d.steps.map((s, position) => ({
        automation_id: automationId!,
        position,
        step_type: s.step_type,
        wait_minutes: s.wait_minutes,
        subject: s.step_type === "email" ? s.subject : null,
        design: s.step_type === "email" ? (s.design as never) : null,
        tag_id: s.step_type === "tag" ? (s.tag_id ?? null) : null,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  await audit({
    actorEmail: admin.email,
    action: id ? "automation.update" : "automation.create",
    entityType: "automation",
    entityId: automationId,
  });

  revalidatePath("/automations");
  return { ok: true, id: automationId! };
}

export async function deleteAutomation(id: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "automation.delete",
    entityType: "automation",
    entityId: id,
  });

  revalidatePath("/automations");
  return { ok: true };
}
