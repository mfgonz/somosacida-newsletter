import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ContactStatusBadge } from "@/components/ui";
import { formatDateTime, contactName, pct } from "@/lib/utils";
import { ContactForm } from "@/components/contact-form";
import { NoteForm } from "@/components/note-form";
import { TagPicker } from "@/components/tag-picker";
import { DeleteContactButton } from "@/components/delete-contact-button";
import type { ContactStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("contacts")
    .select("email,first_name,last_name")
    .eq("id", id)
    .single();
  return { title: data ? contactName(data) : "Contacto" };
}

const EVENT_LABELS: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  opened: "Abierto",
  clicked: "Clic",
  bounced: "Rebotado",
  complained: "Marcado como spam",
  unsubscribed: "Baja",
  failed: "Fallido",
};

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: contact }, { data: notes }, { data: allTags }, { data: myTags }, { data: events }] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", id).single(),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("tags").select("*").order("name"),
      supabase.from("contact_tags").select("tag_id").eq("contact_id", id),
      supabase
        .from("email_events")
        .select("id,event_type,occurred_at,campaign_id")
        .eq("contact_id", id)
        .order("occurred_at", { ascending: false })
        .limit(30),
    ]);

  if (!contact) notFound();

  const campaignIds = [
    ...new Set((events ?? []).map((e) => e.campaign_id).filter((c): c is string => !!c)),
  ];
  const campaignNames = new Map<string, string>();
  if (campaignIds.length) {
    const { data: cs } = await supabase
      .from("campaigns")
      .select("id,name")
      .in("id", campaignIds);
    for (const c of cs ?? []) campaignNames.set(c.id, c.name);
  }

  const opens = (events ?? []).filter((e) => e.event_type === "opened").length;
  const clicks = (events ?? []).filter((e) => e.event_type === "clicked").length;
  const sentCount = (events ?? []).filter((e) => e.event_type === "sent").length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold">
              {contactName(contact)}
            </h1>
            <ContactStatusBadge status={contact.status as ContactStatus} />
          </div>
          <p className="text-sm text-muted">{contact.email}</p>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-sm font-semibold">Datos</h2>
          <ContactForm contact={contact} />
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-sm font-semibold">
            Actividad reciente
          </h2>
          {!events?.length ? (
            <p className="text-sm text-muted">
              Sin actividad de envíos todavía.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between">
                  <span>
                    {EVENT_LABELS[e.event_type] ?? e.event_type}
                    {e.campaign_id && (
                      <span className="text-muted">
                        {" "}
                        ·{" "}
                        <Link
                          href={`/campaigns/${e.campaign_id}`}
                          className="hover:text-ink hover:underline"
                        >
                          {campaignNames.get(e.campaign_id) ?? "Campaña"}
                        </Link>
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDateTime(e.occurred_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-sm font-semibold">Notas</h2>
          <NoteForm contactId={contact.id} />
          <ul className="mt-4 space-y-3">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="border-t border-line pt-3 text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {n.author_email} · {formatDateTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Métricas</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Enviados</dt>
              <dd className="font-medium">{sentCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Aperturas</dt>
              <dd className="font-medium">
                {opens} ({pct(opens, sentCount)})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Clics</dt>
              <dd className="font-medium">
                {clicks} ({pct(clicks, sentCount)})
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Etiquetas</h2>
          <TagPicker
            contactId={contact.id}
            allTags={allTags ?? []}
            selectedIds={(myTags ?? []).map((t) => t.tag_id)}
          />
        </div>

        <div className="card p-4">
          <h2 className="mb-2 font-display text-sm font-semibold">Consentimiento</h2>
          <dl className="space-y-1.5 text-xs text-muted">
            <div className="flex justify-between">
              <dt>Origen</dt>
              <dd className="text-ink-soft">{contact.consent_source || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Fecha</dt>
              <dd className="text-ink-soft">{formatDateTime(contact.consent_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Confirmado</dt>
              <dd className="text-ink-soft">{formatDateTime(contact.confirmed_at)}</dd>
            </div>
            {contact.unsubscribed_at && (
              <div className="flex justify-between">
                <dt>Baja</dt>
                <dd className="text-ink-soft">
                  {formatDateTime(contact.unsubscribed_at)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <DeleteContactButton contactId={contact.id} />
      </div>
    </div>
  );
}
