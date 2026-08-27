import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Plantillas" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await supabaseServer();
  const { data: templates } = await supabase
    .from("templates")
    .select("id,name,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Plantillas"
        description="Diseños reutilizables para tus campañas."
        action={
          <Link href="/templates/new" className="btn-primary">
            Nueva plantilla
          </Link>
        }
      />

      {!templates?.length ? (
        <EmptyState
          title="Sin plantillas"
          description="Crea una plantilla y reutilízala en todas tus campañas."
          actionLabel="Nueva plantilla"
          actionHref="/templates/new"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}`}
              className="card p-4 transition hover:border-ink"
            >
              <p className="font-medium">{t.name}</p>
              <p className="mt-1 text-xs text-muted">
                Editada {formatDate(t.updated_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
