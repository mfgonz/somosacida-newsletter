import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { SuppressionManager } from "@/components/suppression-manager";

export const metadata = { title: "Supresiones" };
export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  unsubscribed: "Baja voluntaria",
  bounced: "Rebote permanente",
  complained: "Marcó como spam",
  manual: "Bloqueo manual",
  invalid: "Dirección inválida",
};

export default async function SuppressionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const supabase = await supabaseServer();

  let query = supabase
    .from("suppressions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(200);

  if (q.trim()) {
    query = query.ilike("email", `%${q.trim().replace(/([%_])/g, "\\$1")}%`);
  }

  const { data: rows, count } = await query;

  return (
    <>
      <PageHeader
        title="Supresiones"
        description={`${(count ?? 0).toLocaleString("es-ES")} dirección(es) excluidas de todos los envíos.`}
      />

      <p className="mb-4 rounded-md bg-canvas p-3 text-sm text-muted">
        Esta lista es la última barrera antes de cada envío. Nadie que aparezca
        aquí recibe correos, ni siquiera si vuelve a importarse desde un CSV.
      </p>

      <form className="mb-4 flex gap-2" action="/suppressions">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar dirección…"
          className="input max-w-xs"
        />
        <button className="btn-secondary">Buscar</button>
      </form>

      <SuppressionManager />

      <div className="card mt-4 divide-y divide-line">
        {!rows?.length && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q ? "Sin resultados." : "No hay direcciones suprimidas."}
          </p>
        )}
        {(rows ?? []).map((s) => (
          <div
            key={s.email}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
          >
            <span className="font-mono text-xs">{s.email}</span>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>{REASON_LABELS[s.reason] ?? s.reason}</span>
              <span>{formatDate(s.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
