import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, ContactStatusBadge, EmptyState } from "@/components/ui";
import { formatDate, contactName } from "@/lib/utils";
import type { ContactStatus } from "@/lib/database.types";

export const metadata = { title: "Contactos" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "subscribed", label: "Suscritos" },
  { value: "pending", label: "Pendientes" },
  { value: "unsubscribed", label: "Bajas" },
  { value: "bounced", label: "Rebotados" },
];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q = "", status = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;

  const supabase = await supabaseServer();

  let query = supabase
    .from("contacts")
    .select("id,email,first_name,last_name,company,status,created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status as ContactStatus);

  if (q.trim()) {
    // Escape PostgREST `or=` control characters before interpolating.
    const term = q.trim().replace(/([,().*\\])/g, "\\$1");
    query = query.or(
      `email.ilike.*${term}*,first_name.ilike.*${term}*,last_name.ilike.*${term}*,company.ilike.*${term}*`,
    );
  }

  const { data: contacts, count, error } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(n: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return `/contacts${s ? `?${s}` : ""}`;
  }

  return (
    <>
      <PageHeader
        title="Contactos"
        description={`${total.toLocaleString("es-ES")} contacto(s)`}
        action={
          <div className="flex gap-2">
            <Link href="/contacts/import" className="btn-secondary">
              Importar CSV
            </Link>
            <Link href="/contacts/new" className="btn-primary">
              Nuevo contacto
            </Link>
          </div>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" action="/contacts">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por email, nombre o empresa…"
          className="input max-w-xs"
        />
        <select name="status" defaultValue={status} className="input max-w-[150px]">
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
        <a
          href={`/api/contacts/export${status ? `?status=${status}` : ""}`}
          className="btn-ghost ml-auto"
        >
          Exportar CSV
        </a>
      </form>

      {error && (
        <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">
          {error.message}
        </p>
      )}

      {!contacts?.length ? (
        <EmptyState
          title={q || status ? "Sin resultados" : "Aún no tienes contactos"}
          description={
            q || status
              ? "Prueba con otros filtros de búsqueda."
              : "Importa un CSV o crea tu primer contacto para empezar."
          }
          actionLabel={q || status ? undefined : "Importar CSV"}
          actionHref={q || status ? undefined : "/contacts/import"}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-canvas text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Contacto</th>
                  <th className="px-4 py-2.5 font-semibold">Empresa</th>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5 font-semibold">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-canvas">
                    <td className="px-4 py-2.5">
                      <Link href={`/contacts/${c.id}`} className="block">
                        <span className="font-medium">{contactName(c)}</span>
                        <span className="block text-xs text-muted">{c.email}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.company || "—"}</td>
                    <td className="px-4 py-2.5">
                      <ContactStatusBadge status={c.status as ContactStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Página {pageNum} de {totalPages}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link href={pageHref(pageNum - 1)} className="btn-secondary">
                Anterior
              </Link>
            )}
            {pageNum < totalPages && (
              <Link href={pageHref(pageNum + 1)} className="btn-secondary">
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
