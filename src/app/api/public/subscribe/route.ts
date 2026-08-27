import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { createToken } from "@/lib/tokens";
import { sendOne, loadOrgSettings } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import { normalizeEmail, isValidEmail, clientIp } from "@/lib/utils";
import { escapeHtml } from "@/lib/email/sanitize";
import { triggerAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(80),
  email: z.string().trim().max(254),
  first_name: z.string().trim().max(120).optional().default(""),
  last_name: z.string().trim().max(120).optional().default(""),
  company: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(60).optional().default(""),
  // Honeypot: a real person never fills a field they cannot see.
  website: z.string().max(200).optional().default(""),
});

/**
 * Public subscription endpoint. Unauthenticated by nature, so it is defended by
 * rate limiting, a honeypot field, and a deliberately uniform response: the
 * reply never reveals whether an address was already on the list, which would
 * otherwise turn the form into a subscriber-enumeration oracle.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Silently accept bot submissions so the bot has no signal to adapt to.
  if (parsed.data.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request.headers) ?? "unknown";
  const limited = await rateLimit({
    key: `subscribe:${ip}`,
    limit: 10,
    windowSeconds: 600,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: form } = await db
    .from("forms")
    .select("*")
    .eq("slug", parsed.data.slug)
    .eq("is_active", true)
    .single();

  if (!form) {
    return NextResponse.json({ error: "Formulario no disponible" }, { status: 404 });
  }

  const blank = (v: string) => (v.trim() === "" ? null : v.trim());
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("contacts")
    .select("id,status")
    .eq("email", email)
    .maybeSingle();

  let contactId: string;
  const needsConfirmation = form.double_opt_in;

  if (existing) {
    // Someone already subscribed is left untouched; the response is identical
    // to a fresh signup so the form cannot be used to probe the list.
    if (existing.status === "subscribed") {
      return NextResponse.json({ ok: true, message: form.success_message });
    }
    contactId = existing.id;
    await db
      .from("contacts")
      .update({
        first_name: blank(parsed.data.first_name),
        last_name: blank(parsed.data.last_name),
        company: blank(parsed.data.company),
        phone: blank(parsed.data.phone),
        status: form.double_opt_in ? "pending" : "subscribed",
        consent_source: `form:${form.slug}`,
        consent_at: now,
        consent_ip: ip === "unknown" ? null : ip,
        consent_user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
        confirmed_at: form.double_opt_in ? null : now,
        unsubscribed_at: null,
        unsubscribe_reason: null,
      })
      .eq("id", contactId);

    // Re-subscribing is a fresh, deliberate act of consent, so any prior
    // suppression for this address is cleared.
    if (!form.double_opt_in) {
      await db.from("suppressions").delete().eq("email", email);
    }
  } else {
    const { data: created, error } = await db
      .from("contacts")
      .insert({
        email,
        first_name: blank(parsed.data.first_name),
        last_name: blank(parsed.data.last_name),
        company: blank(parsed.data.company),
        phone: blank(parsed.data.phone),
        status: form.double_opt_in ? "pending" : "subscribed",
        consent_source: `form:${form.slug}`,
        consent_at: now,
        consent_ip: ip === "unknown" ? null : ip,
        consent_user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
        confirmed_at: form.double_opt_in ? null : now,
      })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 });
    }
    contactId = created.id;
  }

  if (form.target_list_ids.length) {
    await db.from("list_contacts").upsert(
      form.target_list_ids.map((list_id) => ({
        list_id,
        contact_id: contactId,
        subscribed: true,
      })),
      { onConflict: "list_id,contact_id" },
    );
  }

  if (form.target_tag_ids.length) {
    await db.from("contact_tags").upsert(
      form.target_tag_ids.map((tag_id) => ({ tag_id, contact_id: contactId })),
      { onConflict: "contact_id,tag_id", ignoreDuplicates: true },
    );
  }

  await db
    .from("forms")
    .update({ submission_count: form.submission_count + 1 })
    .eq("id", form.id);

  if (needsConfirmation) {
    const org = await loadOrgSettings();
    const confirmUrl = appUrl(`/confirm/${createToken("confirm", contactId)}`);
    const name = parsed.data.first_name.trim();

    await sendOne({
      to: email,
      subject: `Confirma tu suscripción a ${org.organizationName}`,
      html: confirmationHtml(confirmUrl, org.organizationName, name, org.postalAddress),
      text: `${name ? `Hola ${name},\n\n` : ""}Confirma tu suscripción a ${org.organizationName} abriendo este enlace:\n\n${confirmUrl}\n\nSi no te suscribiste, ignora este mensaje.`,
      fromName: org.fromName,
      fromEmail: org.fromEmail,
      replyTo: org.replyTo,
      unsubscribeUrl: confirmUrl,
    });
  }

  // Sequences start only once consent is settled: immediately for single
  // opt-in, and on confirmation for double opt-in (see /confirm).
  if (!needsConfirmation) {
    await triggerAutomations({
      trigger: "form_submitted",
      contactId,
      formSlug: form.slug,
    });
    await triggerAutomations({ trigger: "contact_created", contactId });
  }

  return NextResponse.json({
    ok: true,
    message: form.success_message,
    redirect: form.redirect_url ?? null,
  });
}

function confirmationHtml(
  url: string,
  org: string,
  name: string,
  postalAddress: string,
): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background:#fff;border-radius:12px;">
<tr><td style="padding:34px;">
<h1 style="margin:0 0 14px;font-size:22px;color:#0E0E10;">Confirma tu suscripción</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3A3A42;">
${name ? `Hola ${escapeHtml(name)}, ` : ""}pulsa el botón para confirmar que quieres recibir correos de ${escapeHtml(org)}.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#C8F31D;border-radius:8px;">
<a href="${url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#0E0E10;text-decoration:none;">Confirmar suscripción</a>
</td></tr></table>
<p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#8A8A93;">
Si no te suscribiste, ignora este correo y no pasará nada.<br>
Este enlace caduca en 7 días.
</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#8A8A93;">${escapeHtml(org)}${postalAddress ? ` · ${escapeHtml(postalAddress)}` : ""}</p>
</td></tr></table></body></html>`;
}
