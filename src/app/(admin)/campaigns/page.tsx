import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { CampaignList, type CampaignRow } from "@/components/campaign-list";

export const metadata = { title: "Campañas" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const supabase = await supabaseServer();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id,name,subject,status,folder,scheduled_at,sent_at,total_recipients",
    )
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
        <CampaignList campaigns={campaigns as CampaignRow[]} />
      )}
    </>
  );
}
