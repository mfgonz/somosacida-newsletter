import { supabaseServer } from "@/lib/supabase/server";
import { CampaignEditor } from "@/components/campaign-editor";
import { starterDesign } from "@/lib/email/starter";

export const metadata = { title: "Nueva campaña" };
export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const supabase = await supabaseServer();
  const [{ data: segments }, { data: lists }, { data: tags }, { data: templates }] =
    await Promise.all([
      supabase.from("segments").select("id,name").order("name"),
      supabase.from("lists").select("id,name").order("name"),
      supabase.from("tags").select("id,name").order("name"),
      supabase.from("templates").select("id,name,design").order("updated_at", {
        ascending: false,
      }),
    ]);

  return (
    <CampaignEditor
      initial={{
        name: "Campaña sin título",
        subject: "",
        preheader: "",
        design: starterDesign(),
        audience: { type: "all" },
      }}
      segments={segments ?? []}
      lists={lists ?? []}
      tags={tags ?? []}
      templates={templates ?? []}
      editable
    />
  );
}
