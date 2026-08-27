import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Auditoría" };
export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "contact.create": "Creó un contacto",
  "contact.update": "Editó un contacto",
  "contact.delete": "Eliminó un contacto",
  "contacts.import": "Importó contactos",
  "contacts.export": "Exportó contactos",
  "campaign.create": "Creó una campaña",
  "campaign.send": "Envió una campaña",
  "campaign.schedule": "Programó una campaña",
  "campaign.pause": "Pausó una campaña",
  "campaign.delete": "Eliminó una campaña",
  "campaign.test_send": "Envió una prueba",
  "template.create": "Creó una plantilla",
  "template.update": "Editó una plantilla",
  "template.delete": "Eliminó una plantilla",
  "form.create": "Creó un formulario",
  "form.delete": "Eliminó un formulario",
  "segment.create": "Creó un segmento",
  "segment.delete": "Eliminó un segmento",
  "list.create": "Creó una lista",
  "list.delete": "Eliminó una lista",
  "tag.create": "Creó una etiqueta",
  "tag.delete": "Eliminó una etiqueta",
  "suppression.add": "Bloqueó una dirección",
  "suppression.remove": "Desbloqueó una dirección",
  "settings.update": "Cambió los ajustes",
};

export default async function AuditPage() {
  const supabase = await supabaseServer();
  const { data: entries } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Registro de acciones sobre datos de clientes. Solo lectura."
      />

      <div className="card divide-y divide-line">
        {!entries?.length && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Aún no hay actividad registrada.
          </p>
        )}
        {(entries ?? []).map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <span className="font-medium">
                {ACTION_LABELS[e.action] ?? e.action}
              </span>
              {Object.keys(e.metadata as object).length > 0 && (
                <span className="ml-2 break-all text-xs text-muted">
                  {JSON.stringify(e.metadata)}
                </span>
              )}
            </div>
            <div className="flex shrink-0 gap-3 text-xs text-muted">
              <span>{e.actor_email}</span>
              <span>{formatDateTime(e.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
