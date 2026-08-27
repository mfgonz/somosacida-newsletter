import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * The single place that records a withdrawal of consent. Everything that can
 * unsubscribe someone — the link, the one-click header, a spam complaint, a
 * hard bounce — funnels through here so the contact record and the suppression
 * list can never disagree.
 */
export async function suppressContact(params: {
  contactId?: string | null;
  email: string;
  reason: "unsubscribed" | "bounced" | "complained" | "manual" | "invalid";
  notes?: string;
  campaignId?: string | null;
}) {
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const status =
    params.reason === "complained"
      ? "complained"
      : params.reason === "bounced"
        ? "bounced"
        : params.reason === "invalid"
          ? "cleaned"
          : "unsubscribed";

  await db.from("suppressions").upsert(
    {
      email: params.email.toLowerCase(),
      reason: params.reason,
      notes: params.notes ?? null,
    },
    { onConflict: "email" },
  );

  const contactPatch = {
    status,
    unsubscribed_at: now,
    unsubscribe_reason: params.notes ?? params.reason,
  } as const;

  if (params.contactId) {
    await db.from("contacts").update(contactPatch).eq("id", params.contactId);
  } else {
    await db.from("contacts").update(contactPatch).eq("email", params.email);
  }

  await db.from("email_events").insert({
    contact_id: params.contactId ?? null,
    campaign_id: params.campaignId ?? null,
    event_type: params.reason === "complained" ? "complained" : "unsubscribed",
    metadata: { reason: params.reason },
  });

  // Being suppressed globally implies leaving every topic list.
  const contactId =
    params.contactId ??
    (
      await db
        .from("contacts")
        .select("id")
        .eq("email", params.email)
        .maybeSingle()
    ).data?.id;

  if (contactId) {
    await db
      .from("list_contacts")
      .update({ subscribed: false })
      .eq("contact_id", contactId);

    await db
      .from("automation_enrollments")
      .update({ status: "cancelled" })
      .eq("contact_id", contactId)
      .eq("status", "active");
  }
}

/** Confirms a double opt-in signup. */
export async function confirmContact(contactId: string) {
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data } = await db
    .from("contacts")
    .select("id,email,status")
    .eq("id", contactId)
    .single();

  if (!data) return { ok: false as const, error: "Contacto no encontrado." };

  // Someone who previously unsubscribed re-confirming is a fresh opt-in, so the
  // suppression entry is cleared deliberately rather than left to block them.
  await db.from("suppressions").delete().eq("email", data.email);

  await db
    .from("contacts")
    .update({
      status: "subscribed",
      confirmed_at: now,
      unsubscribed_at: null,
      unsubscribe_reason: null,
    })
    .eq("id", contactId);

  return { ok: true as const, email: data.email };
}
