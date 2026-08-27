import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CampaignEditor } from "@/components/campaign-editor";
import { CampaignReport } from "@/components/campaign-report";
import type { Audience } from "@/app/(admin)/campaigns/actions";

export const dynamic = "force-dynamic";

const EDITABLE = ["draft", "scheduled", "paused"];

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  // Once sending has begun the design is frozen, so the page becomes a report.
  if (!EDITABLE.includes(campaign.status)) {
    return <CampaignReport campaign={campaign} />;
  }

  const [{ data: segments }, { data: lists }, { data: tags }, { data: templates }] =
    await Promise.all([
      supabase.from("segments").select("id,name").order("name"),
      supabase.from("lists").select("id,name").order("name"),
      supabase.from("tags").select("id,name").order("name"),
      supabase
        .from("templates")
        .select("id,name,design")
        .order("updated_at", { ascending: false }),
    ]);

  return (
    <>
      {campaign.status === "scheduled" && campaign.scheduled_at && (
        <p className="mb-4 rounded-md bg-info/10 p-3 text-sm text-info">
          Programada para{" "}
          {new Date(campaign.scheduled_at).toLocaleString("es-ES")}. Guardar
          cambios no cancela la programación.
        </p>
      )}
      {campaign.status === "paused" && (
        <p className="mb-4 rounded-md bg-warning/10 p-3 text-sm text-warning">
          Campaña pausada. Puedes reanudarla desde el informe.
        </p>
      )}

      <CampaignEditor
        campaignId={campaign.id}
        initial={{
          name: campaign.name,
          subject: campaign.subject,
          preheader: campaign.preheader ?? "",
          design: campaign.design,
          audience: campaign.audience as unknown as Audience,
        }}
        segments={segments ?? []}
        lists={lists ?? []}
        tags={tags ?? []}
        templates={templates ?? []}
        editable
      />
    </>
  );
}
