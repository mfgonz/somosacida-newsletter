import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { suppressContact } from "@/lib/compliance";
import type { EmailEventType } from "@/lib/database.types";

export const dynamic = "force-dynamic";

/**
 * Ingests delivery events from Resend.
 *
 * This endpoint writes to the database with the service role, so the Svix
 * signature check is the only thing standing between an anonymous caller and
 * forged analytics or forged unsubscribes. An unverified payload is rejected
 * before it is even parsed as JSON.
 */

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    subject?: string;
    click?: { link?: string };
    bounce?: { type?: string; message?: string };
  };
};

const EVENT_MAP: Record<string, EmailEventType> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "failed",
  "email.failed": "failed",
};

export async function POST(request: Request) {
  const raw = await request.text();

  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: ResendEvent;
  try {
    const wh = new Webhook(env().RESEND_WEBHOOK_SECRET);
    event = wh.verify(raw, headers) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const eventType = EVENT_MAP[event.type];
  if (!eventType) return NextResponse.json({ ok: true, ignored: event.type });

  const messageId = event.data?.email_id ?? null;
  const to = Array.isArray(event.data?.to) ? event.data?.to[0] : event.data?.to;
  const db = supabaseAdmin();

  // Correlate back to the campaign via the provider's message id.
  const { data: recipient } = messageId
    ? await db
        .from("campaign_recipients")
        .select("id,campaign_id,contact_id,open_count,click_count")
        .eq("provider_message_id", messageId)
        .maybeSingle()
    : { data: null };

  const { data: contact } = to
    ? await db
        .from("contacts")
        .select("id,email")
        .eq("email", to.toLowerCase())
        .maybeSingle()
    : { data: null };

  const contactId = recipient?.contact_id ?? contact?.id ?? null;
  const occurredAt = event.created_at ?? new Date().toISOString();

  await db.from("email_events").insert({
    contact_id: contactId,
    campaign_id: recipient?.campaign_id ?? null,
    recipient_id: recipient?.id ?? null,
    event_type: eventType,
    provider_message_id: messageId,
    link_url: event.data?.click?.link ?? null,
    metadata: { type: event.type },
    occurred_at: occurredAt,
  });

  if (recipient) {
    switch (eventType) {
      case "delivered":
        await db
          .from("campaign_recipients")
          .update({ status: "delivered" })
          .eq("id", recipient.id);
        break;

      case "opened":
        await db
          .from("campaign_recipients")
          .update({
            open_count: recipient.open_count + 1,
            opened_at: recipient.open_count === 0 ? occurredAt : undefined,
          })
          .eq("id", recipient.id);
        break;

      case "clicked":
        await db
          .from("campaign_recipients")
          .update({
            click_count: recipient.click_count + 1,
            clicked_at: recipient.click_count === 0 ? occurredAt : undefined,
          })
          .eq("id", recipient.id);
        break;

      case "bounced":
        await db
          .from("campaign_recipients")
          .update({ status: "bounced" })
          .eq("id", recipient.id);
        break;

      case "complained":
        await db
          .from("campaign_recipients")
          .update({ status: "complained" })
          .eq("id", recipient.id);
        break;
    }
  }

  // A hard bounce or a spam complaint permanently removes the address from
  // sending. Continuing to mail either one is what destroys sender reputation.
  if (to && (eventType === "bounced" || eventType === "complained")) {
    const isHardBounce =
      eventType === "bounced" && event.data?.bounce?.type !== "Transient";

    if (isHardBounce || eventType === "complained") {
      await suppressContact({
        contactId,
        email: to.toLowerCase(),
        reason: eventType === "complained" ? "complained" : "bounced",
        notes: event.data?.bounce?.message?.slice(0, 300),
        campaignId: recipient?.campaign_id ?? null,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
