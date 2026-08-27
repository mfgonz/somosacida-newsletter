import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Stat, CampaignStatusBadge, PageHeader } from "@/components/ui";
import { formatDateTime, pct } from "@/lib/utils";
import { CampaignControls } from "@/components/campaign-controls";
import type { Campaign, CampaignStatus } from "@/lib/database.types";

export async function CampaignReport({ campaign }: { campaign: Campaign }) {
  const supabase = await supabaseServer();

  const [{ data: recipients }, { data: clicks }] = await Promise.all([
    supabase
      .from("campaign_recipients")
      .select("status,open_count,click_count")
      .eq("campaign_id", campaign.id)
      .limit(100_000),
    supabase
      .from("email_events")
      .select("link_url")
      .eq("campaign_id", campaign.id)
      .eq("event_type", "clicked")
      .limit(10_000),
  ]);

  const rows = recipients ?? [];
  const delivered = rows.filter((r) =>
    ["sent", "delivered"].includes(r.status),
  ).length;
  const opened = rows.filter((r) => r.open_count > 0).length;
  const clicked = rows.filter((r) => r.click_count > 0).length;
  const bounced = rows.filter((r) => r.status === "bounced").length;
  const complained = rows.filter((r) => r.status === "complained").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const queued = rows.filter((r) => r.status === "queued").length;

  const linkCounts = new Map<string, number>();
  for (const c of clicks ?? []) {
    if (!c.link_url) continue;
    linkCounts.set(c.link_url, (linkCounts.get(c.link_url) ?? 0) + 1);
  }
  const topLinks = [...linkCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={campaign.subject}
        action={<CampaignStatusBadge status={campaign.status as CampaignStatus} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>
          {campaign.sent_at
            ? `Enviada ${formatDateTime(campaign.sent_at)}`
            : campaign.send_started_at
              ? `Iniciada ${formatDateTime(campaign.send_started_at)}`
              : "—"}
        </span>
        <Link href={`/archive/${campaign.id}`} className="hover:text-ink hover:underline">
          Ver el correo
        </Link>
      </div>

      {campaign.error_message && (
        <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">
          {campaign.error_message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Entregados"
          value={delivered.toLocaleString("es-ES")}
          sub={`de ${campaign.total_recipients.toLocaleString("es-ES")}`}
        />
        <Stat label="Aperturas" value={pct(opened, delivered)} sub={`${opened} únicas`} />
        <Stat label="Clics" value={pct(clicked, delivered)} sub={`${clicked} únicos`} />
        <Stat
          label="Rebotes"
          value={pct(bounced, campaign.total_recipients)}
          sub={`${bounced} rebotes · ${complained} quejas`}
        />
      </div>

      {(queued > 0 || failed > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {queued > 0 && (
            <Stat label="En cola" value={queued} sub="Pendientes de envío" />
          )}
          {failed > 0 && (
            <Stat label="Fallidos" value={failed} sub="Error del proveedor" />
          )}
        </div>
      )}

      <CampaignControls
        campaignId={campaign.id}
        status={campaign.status as CampaignStatus}
      />

      {topLinks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-base font-semibold">
            Enlaces más clicados
          </h2>
          <div className="card divide-y divide-line">
            {topLinks.map(([url, count]) => (
              <div
                key={url}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <span className="truncate text-ink-soft" title={url}>
                  {url}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-muted">
        Las aperturas se miden con un píxel de seguimiento y son orientativas:
        muchos clientes de correo las bloquean o las precargan. Los clics son
        una señal más fiable.
      </p>
    </>
  );
}
