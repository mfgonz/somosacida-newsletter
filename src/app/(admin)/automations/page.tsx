import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Automatizaciones" };
export const dynamic = "force-dynamic";

const TRIGGER_LABELS: Record<string, string> = {
  contact_created: "Al darse de alta",
  tag_added: "Al recibir una etiqueta",
  list_joined: "Al unirse a una lista",
  form_submitted: "Al enviar un formulario",
};

export default async function AutomationsPage() {
  const supabase = await supabaseServer();
  const [{ data: automations }, { data: enrollments }] = await Promise.all([
    supabase
      .from("automations")
      .select("id,name,trigger_type,is_active")
      .order("created_at", { ascending: false }),
    supabase.from("automation_enrollments").select("automation_id,status"),
  ]);

  const activeCounts = new Map<string, number>();
  for (const e of enrollments ?? []) {
    if (e.status === "active") {
      activeCounts.set(e.automation_id, (activeCounts.get(e.automation_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <PageHeader
        title="Automatizaciones"
        description="Secuencias que se envían solas: bienvenida, seguimiento, reactivación."
        action={
          <Link href="/automations/new" className="btn-primary">
            Nueva automatización
          </Link>
        }
      />

      {!automations?.length ? (
        <EmptyState
          title="Sin automatizaciones"
          description="Crea una secuencia de bienvenida para saludar a cada nuevo suscriptor."
          actionLabel="Nueva automatización"
          actionHref="/automations/new"
        />
      ) : (
        <div className="card divide-y divide-line">
          {automations.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/automations/${a.id}`}
                  className="font-medium hover:underline"
                >
                  {a.name}
                </Link>
                <p className="text-xs text-muted">
                  {TRIGGER_LABELS[a.trigger_type] ?? a.trigger_type}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>{activeCounts.get(a.id) ?? 0} en curso</span>
                <span
                  className={`badge ${
                    a.is_active
                      ? "bg-success/10 text-success"
                      : "bg-muted/15 text-muted"
                  }`}
                >
                  {a.is_active ? "Activa" : "Pausada"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
