import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Formularios" };
export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const supabase = await supabaseServer();
  const { data: forms } = await supabase
    .from("forms")
    .select("id,name,slug,is_active,submission_count,double_opt_in")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Formularios"
        description="Capta suscriptores desde tu web o con un enlace directo."
        action={
          <Link href="/forms/new" className="btn-primary">
            Nuevo formulario
          </Link>
        }
      />

      {!forms?.length ? (
        <EmptyState
          title="Sin formularios"
          description="Crea un formulario para empezar a captar suscriptores."
          actionLabel="Nuevo formulario"
          actionHref="/forms/new"
        />
      ) : (
        <div className="card divide-y divide-line">
          {forms.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <Link href={`/forms/${f.id}`} className="font-medium hover:underline">
                  {f.name}
                </Link>
                <p className="text-xs text-muted">/subscribe/{f.slug}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>{f.submission_count} envío(s)</span>
                {f.double_opt_in && <span className="badge bg-info/10 text-info">Doble opt-in</span>}
                <span
                  className={`badge ${
                    f.is_active
                      ? "bg-success/10 text-success"
                      : "bg-muted/15 text-muted"
                  }`}
                >
                  {f.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
