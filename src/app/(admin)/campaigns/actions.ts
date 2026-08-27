"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import { designSchema, parseDesign } from "@/lib/email/blocks";
import {
  parseSegmentDefinition,
  resolveSegment,
  type SegmentDefinition,
} from "@/lib/segments";
import {
  buildMergeContext,
  loadOrgSettings,
  processCampaignBatch,
  sendOne,
} from "@/lib/email/send";
import { renderDesign, renderPlainText } from "@/lib/email/render";
import { isValidEmail, normalizeEmail } from "@/lib/utils";

export type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const audienceSchema = z.union([
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("segment"), segmentId: z.string().uuid() }),
  z.object({ type: z.literal("list"), listId: z.string().uuid() }),
  z.object({ type: z.literal("tag"), tagId: z.string().uuid() }),
]);

export type Audience = z.infer<typeof audienceSchema>;

export async function saveCampaign(input: {
  id?: string;
  name: string;
  subject: string;
  preheader: string;
  design: unknown;
  audience: unknown;
}): Promise<Result<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const name = input.name.trim().slice(0, 160);
  if (!name) return { ok: false, error: "Ponle un nombre a la campaña." };

  const design = designSchema.safeParse(input.design);
  if (!design.success) {
    return { ok: false, error: "El diseño contiene bloques inválidos." };
  }

  const audience = audienceSchema.safeParse(input.audience);
  if (!audience.success) return { ok: false, error: "Audiencia inválida." };

  const supabase = await supabaseServer();
  const payload = {
    name,
    subject: input.subject.trim().slice(0, 250),
    preheader: input.preheader.trim().slice(0, 250) || null,
    design: design.data,
    audience: audience.data,
  };

  if (input.id) {
    // A campaign that is sending or already sent is immutable: editing it would
    // desynchronise the stored design from what recipients actually received.
    const { data: existing } = await supabase
      .from("campaigns")
      .select("status")
      .eq("id", input.id)
      .single();

    if (existing && !["draft", "scheduled", "paused"].includes(existing.status)) {
      return { ok: false, error: "No se puede editar una campaña ya enviada." };
    }

    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/campaigns/${input.id}`);
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "campaign.create",
    entityType: "campaign",
    entityId: data.id,
  });

  revalidatePath("/campaigns");
  return { ok: true, id: data.id };
}

/** Resolves an audience descriptor to the contacts eligible to receive it. */
async function resolveAudience(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  audience: Audience,
): Promise<{ ids: string[]; error: string | null }> {
  switch (audience.type) {
    case "all":
      return resolveSegment(supabase, parseSegmentDefinition({}), {
        onlySendable: true,
      });

    case "segment": {
      const { data } = await supabase
        .from("segments")
        .select("definition")
        .eq("id", audience.segmentId)
        .single();
      if (!data) return { ids: [], error: "Segmento no encontrado." };
      return resolveSegment(
        supabase,
        parseSegmentDefinition(data.definition) as SegmentDefinition,
        { onlySendable: true },
      );
    }

    case "list":
      return resolveSegment(
        supabase,
        parseSegmentDefinition({ listIds: [audience.listId] }),
        { onlySendable: true },
      );

    case "tag":
      return resolveSegment(
        supabase,
        parseSegmentDefinition({ tagIds: [audience.tagId] }),
        { onlySendable: true },
      );
  }
}

export async function previewAudienceSize(
  audience: unknown,
): Promise<Result<{ count: number }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = audienceSchema.safeParse(audience);
  if (!parsed.success) return { ok: false, error: "Audiencia inválida." };

  const supabase = await supabaseServer();
  const { ids, error } = await resolveAudience(supabase, parsed.data);
  if (error) return { ok: false, error };

  return { ok: true, count: ids.length };
}

export async function sendTestEmail(
  campaignId: string,
  toEmail: string,
): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const to = normalizeEmail(toEmail);
  if (!isValidEmail(to)) return { ok: false, error: "Email de prueba inválido." };

  const supabase = await supabaseServer();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) return { ok: false, error: "Campaña no encontrada." };
  if (!campaign.subject.trim()) {
    return { ok: false, error: "La campaña necesita un asunto." };
  }

  const org = await loadOrgSettings();
  const design = parseDesign(campaign.design);

  // A synthetic contact keeps the preview honest without touching real data.
  const ctx = buildMergeContext(
    {
      id: "00000000-0000-0000-0000-000000000000",
      email: to,
      first_name: "Prueba",
      last_name: "",
      company: "",
    },
    org,
    campaignId,
  );

  const result = await sendOne({
    to,
    subject: `[PRUEBA] ${campaign.subject}`,
    html: renderDesign(design, ctx, { preheader: campaign.preheader }),
    text: renderPlainText(design, ctx),
    fromName: campaign.from_name || org.fromName,
    fromEmail: campaign.from_email || org.fromEmail,
    replyTo: campaign.reply_to || org.replyTo,
    unsubscribeUrl: ctx.unsubscribeUrl,
  });

  if (!result.ok) return { ok: false, error: result.error };

  await audit({
    actorEmail: admin.email,
    action: "campaign.test_send",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { to },
  });

  return { ok: true };
}

/** Builds the recipient queue and starts (or schedules) delivery. */
export async function launchCampaign(
  campaignId: string,
  opts: { scheduledAt?: string | null } = {},
): Promise<Result<{ queued: number }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) return { ok: false, error: "Campaña no encontrada." };
  if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
    return { ok: false, error: "Esta campaña ya se ha enviado." };
  }
  if (!campaign.subject.trim()) {
    return { ok: false, error: "La campaña necesita un asunto." };
  }

  const design = parseDesign(campaign.design);
  if (!design.blocks.length) {
    return { ok: false, error: "La campaña no tiene contenido." };
  }

  const org = await loadOrgSettings();
  if (!org.postalAddress.trim()) {
    return {
      ok: false,
      error:
        "Añade tu dirección postal en Ajustes: es obligatoria por ley en todo email comercial.",
    };
  }

  const audience = audienceSchema.safeParse(campaign.audience);
  if (!audience.success) return { ok: false, error: "Audiencia inválida." };

  const { ids, error } = await resolveAudience(supabase, audience.data);
  if (error) return { ok: false, error };
  if (!ids.length) {
    return { ok: false, error: "La audiencia seleccionada no tiene contactos." };
  }

  const db = supabaseAdmin();

  const { data: contacts } = await db
    .from("contacts")
    .select("id,email")
    .in("id", ids.slice(0, 100_000));

  const { data: suppressed } = await db.from("suppressions").select("email");
  const blocked = new Set((suppressed ?? []).map((s) => s.email.toLowerCase()));

  const rows = (contacts ?? [])
    .filter((c) => !blocked.has(c.email.toLowerCase()))
    .map((c) => ({
      campaign_id: campaignId,
      contact_id: c.id,
      email: c.email,
      status: "queued" as const,
    }));

  if (!rows.length) {
    return { ok: false, error: "Todos los contactos están suprimidos." };
  }

  // Clear any queue left by a previous cancelled attempt before rebuilding it.
  await db
    .from("campaign_recipients")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  for (let i = 0; i < rows.length; i += 500) {
    const { error: insertError } = await db
      .from("campaign_recipients")
      .upsert(rows.slice(i, i + 500), {
        onConflict: "campaign_id,contact_id",
        ignoreDuplicates: true,
      });
    if (insertError) return { ok: false, error: insertError.message };
  }

  const scheduled = opts.scheduledAt ? new Date(opts.scheduledAt) : null;
  const isScheduled = scheduled !== null && scheduled.getTime() > Date.now();

  await db
    .from("campaigns")
    .update({
      status: isScheduled ? "scheduled" : "sending",
      scheduled_at: isScheduled ? scheduled.toISOString() : null,
      send_started_at: isScheduled ? null : new Date().toISOString(),
      total_recipients: rows.length,
      error_message: null,
    })
    .eq("id", campaignId);

  await audit({
    actorEmail: admin.email,
    action: isScheduled ? "campaign.schedule" : "campaign.send",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { recipients: rows.length, scheduledAt: opts.scheduledAt ?? null },
  });

  // Send the first batch inline so the operator sees immediate progress; the
  // cron worker drains whatever remains.
  if (!isScheduled) await processCampaignBatch(campaignId);

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, queued: rows.length };
}

export async function pauseCampaign(campaignId: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "paused" })
    .eq("id", campaignId)
    .in("status", ["sending", "scheduled"]);

  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "campaign.pause",
    entityType: "campaign",
    entityId: campaignId,
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

export async function resumeCampaign(
  campaignId: string,
): Promise<Result<{ remaining: number }>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId)
    .eq("status", "paused");

  if (error) return { ok: false, error: error.message };

  const progress = await processCampaignBatch(campaignId);

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, remaining: progress.remaining };
}

export async function deleteCampaign(campaignId: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const supabase = await supabaseServer();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", campaignId)
    .single();

  if (campaign?.status === "sending") {
    return { ok: false, error: "Pausa la campaña antes de eliminarla." };
  }

  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) return { ok: false, error: error.message };

  await audit({
    actorEmail: admin.email,
    action: "campaign.delete",
    entityType: "campaign",
    entityId: campaignId,
  });

  revalidatePath("/campaigns");
  return { ok: true };
}
