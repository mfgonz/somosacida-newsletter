import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, EmptyState, CampaignStatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { CampaignStatus } from "@/lib/database.types";

export const metadata = { title: "Campañas" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const supabase = await supabaseServer();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id,name,subject,status,scheduled_at,sent_at,total_recipients,created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Campañas"
        description="Crea, programa y analiza tus envíos."
        action={
          <Link href="/campaigns/new" className="btn-primary">
            Nueva campaña
          </Link>
        }
      />

      {!campaigns?.length ? (
        <EmptyState
          title="Sin campañas"
          description="Diseña tu primer boletín y envíalo a tu audiencia."
          actionLabel="Nueva campaña"
          actionHref="/campaigns/new"
        />
      ) : (
        <div className="card divide-y divide-line">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-canvas"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  {c.subject || "Sin asunto"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-xs text-muted">
                {c.total_recipients > 0 && (
                  <span>{c.total_recipients.toLocaleString("es-ES")} dest.</span>
                )}
                <span>
                  {c.sent_at
                    ? formatDateTime(c.sent_at)
                    : c.scheduled_at
                      ? `Programada ${formatDateTime(c.scheduled_at)}`
                      : "—"}
                </span>
                <CampaignStatusBadge status={c.status as CampaignStatus} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
