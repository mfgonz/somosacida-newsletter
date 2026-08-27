import "server-only";
import { Resend } from "resend";
import { env, appUrl } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createToken } from "@/lib/tokens";
import { parseDesign } from "@/lib/email/blocks";
import { renderDesign, renderPlainText, type MergeContext } from "@/lib/email/render";

let client: Resend | null = null;
function resend() {
  if (!client) client = new Resend(env().RESEND_API_KEY);
  return client;
}

/** Resend's batch endpoint accepts up to 100 messages per call. */
const BATCH_SIZE = 100;

export type SendableContact = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
};

export function buildMergeContext(
  contact: SendableContact,
  org: { organizationName: string; postalAddress: string },
  campaignId?: string,
): MergeContext {
  return {
    firstName: contact.first_name,
    lastName: contact.last_name,
    company: contact.company,
    email: contact.email,
    unsubscribeUrl: appUrl(
      `/unsubscribe/${createToken("unsubscribe", contact.id)}`,
    ),
    preferencesUrl: appUrl(
      `/preferences/${createToken("preferences", contact.id)}`,
    ),
    webviewUrl: campaignId ? appUrl(`/archive/${campaignId}`) : undefined,
    organizationName: org.organizationName,
    postalAddress: org.postalAddress,
  };
}

export async function loadOrgSettings() {
  const { data } = await supabaseAdmin()
    .from("settings")
    .select("organization_name,postal_address,default_from_name,default_from_email,default_reply_to")
    .eq("id", true)
    .single();

  const e = env();
  return {
    organizationName: data?.organization_name || e.RESEND_FROM_NAME,
    postalAddress: data?.postal_address || "",
    fromName: data?.default_from_name || e.RESEND_FROM_NAME,
    fromEmail: data?.default_from_email || e.RESEND_FROM_EMAIL,
    replyTo: data?.default_reply_to || e.RESEND_REPLY_TO || undefined,
  };
}

export type SingleSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

/**
 * Sends one message. Every outbound email carries List-Unsubscribe headers so
 * mailbox providers can offer one-click unsubscribe (RFC 8058), which is a
 * requirement for bulk senders at Gmail and Yahoo.
 */
export async function sendOne(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  unsubscribeUrl: string;
  headers?: Record<string, string>;
}): Promise<SingleSendResult> {
  try {
    const { data, error } = await resend().emails.send({
      from: `${params.fromName} <${params.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      headers: {
        "List-Unsubscribe": `<${params.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        ...params.headers,
      },
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, messageId: data?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de envío desconocido",
    };
  }
}

export type CampaignSendProgress = {
  attempted: number;
  sent: number;
  failed: number;
  remaining: number;
};

/**
 * Processes one slice of a campaign's queue. Designed to be called repeatedly
 * (by the cron worker or the manual send action) so a large campaign is spread
 * across invocations and never exceeds a serverless time limit.
 *
 * Suppression is re-checked here, immediately before dispatch, rather than only
 * when the queue was built: a contact who unsubscribed while the campaign was
 * in flight must not receive it.
 */
export async function processCampaignBatch(
  campaignId: string,
  limit = BATCH_SIZE,
): Promise<CampaignSendProgress> {
  const db = supabaseAdmin();
  const org = await loadOrgSettings();

  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) return { attempted: 0, sent: 0, failed: 0, remaining: 0 };

  const { data: queued } = await db
    .from("campaign_recipients")
    .select("id,contact_id,email")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .limit(limit);

  if (!queued?.length) {
    return { attempted: 0, sent: 0, failed: 0, remaining: 0 };
  }

  const contactIds = queued.map((r) => r.contact_id);

  const [{ data: contacts }, { data: suppressions }] = await Promise.all([
    db
      .from("contacts")
      .select("id,email,first_name,last_name,company,status")
      .in("id", contactIds),
    db
      .from("suppressions")
      .select("email")
      .in("email", queued.map((r) => r.email)),
  ]);

  const blocked = new Set(
    (suppressions ?? []).map((s) => s.email.toLowerCase()),
  );
  const byId = new Map((contacts ?? []).map((c) => [c.id, c]));

  const design = parseDesign(campaign.design);
  const fromName = campaign.from_name || org.fromName;
  const fromEmail = campaign.from_email || org.fromEmail;
  const replyTo = campaign.reply_to || org.replyTo;

  let sent = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const recipient of queued) {
    const contact = byId.get(recipient.contact_id);

    // Skip anyone who is suppressed, missing, or no longer subscribed.
    if (
      !contact ||
      contact.status !== "subscribed" ||
      blocked.has(recipient.email.toLowerCase())
    ) {
      await db
        .from("campaign_recipients")
        .update({ status: "skipped", error_message: "Suprimido o no suscrito" })
        .eq("id", recipient.id);
      continue;
    }

    const ctx = buildMergeContext(contact, org, campaignId);
    const html = renderDesign(design, ctx, { preheader: campaign.preheader });
    const text = renderPlainText(design, ctx);
    const subject = applySubjectTags(campaign.subject, contact);

    const result = await sendOne({
      to: contact.email,
      subject,
      html,
      text,
      fromName,
      fromEmail,
      replyTo,
      unsubscribeUrl: ctx.unsubscribeUrl,
      headers: { "X-Entity-Ref-ID": recipient.id },
    });

    if (result.ok) {
      sent += 1;
      await db
        .from("campaign_recipients")
        .update({
          status: "sent",
          provider_message_id: result.messageId,
          sent_at: now,
        })
        .eq("id", recipient.id);

      await db.from("email_events").insert({
        contact_id: contact.id,
        campaign_id: campaignId,
        recipient_id: recipient.id,
        event_type: "sent",
        provider_message_id: result.messageId,
      });

      await db
        .from("contacts")
        .update({ last_emailed_at: now })
        .eq("id", contact.id);
    } else {
      failed += 1;
      await db
        .from("campaign_recipients")
        .update({ status: "failed", error_message: result.error.slice(0, 500) })
        .eq("id", recipient.id);
    }
  }

  const { count: remaining } = await db
    .from("campaign_recipients")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const left = remaining ?? 0;

  if (left === 0) {
    await db
      .from("campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", campaignId);
  }

  return { attempted: queued.length, sent, failed, remaining: left };
}

/** Subject lines support the name tags only; URLs make no sense in a subject. */
function applySubjectTags(subject: string, contact: SendableContact): string {
  return subject
    .replace(/\{\{\s*first_name\s*\}\}/g, contact.first_name || "")
    .replace(/\{\{\s*last_name\s*\}\}/g, contact.last_name || "")
    .replace(/\{\{\s*company\s*\}\}/g, contact.company || "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
