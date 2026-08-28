import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, Stat, CampaignStatusBadge } from "@/components/ui";
import { formatDate, pct } from "@/lib/utils";
import type { CampaignStatus } from "@/lib/database.types";

export const metadata = { title: "Resumen" };
export const dynamic = "force-dynamic";

/** Kept out of the render body: the purity rule forbids clock reads there. */
function windowStart(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  const thirtyDaysAgo = windowStart(30);

  const [subscribed, pending, unsubscribed, recentContacts, campaigns, sends] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("status", "subscribed"),
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("status", "unsubscribed"),
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("campaigns")
        .select("id,name,subject,status,sent_at,total_recipients")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("campaign_recipients")
        .select("status,open_count,click_count")
        .in("status", ["sent", "delivered", "bounced", "complained"])
        .limit(5000),
    ]);

  const rows = sends.data ?? [];
  const opened = rows.filter((r) => r.open_count > 0).length;
  const clicked = rows.filter((r) => r.click_count > 0).length;

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Estado general de tu audiencia y tus envíos."
        action={
          <Link href="/campaigns/new" className="btn-primary">
            Nueva campaña
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Suscriptores"
          value={subscribed.count ?? 0}
          sub={`+${recentContacts.count ?? 0} en 30 días`}
        />
        <Stat label="Pendientes" value={pending.count ?? 0} sub="Sin confirmar" />
        <Stat label="Bajas" value={unsubscribed.count ?? 0} />
        <Stat
          label="Apertura media"
          value={pct(opened, rows.length)}
          sub={`Clics ${pct(clicked, rows.length)}`}
        />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">
            Campañas recientes
          </h2>
          <Link href="/campaigns" className="text-sm text-muted hover:text-ink">
            Ver todas
          </Link>
        </div>

        <div className="card divide-y divide-line">
          {(campaigns.data ?? []).length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Todavía no has creado ninguna campaña.
            </p>
          )}
          {(campaigns.data ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-canvas"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  {c.subject || "Sin asunto"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted">
                  {c.sent_at ? formatDate(c.sent_at) : "—"}
                </span>
                <CampaignStatusBadge status={c.status as CampaignStatus} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
