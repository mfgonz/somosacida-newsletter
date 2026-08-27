import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { AutomationBuilder } from "@/components/automation-builder";

export const metadata = { title: "Nueva automatización" };
export const dynamic = "force-dynamic";

export default async function NewAutomationPage() {
  const supabase = await supabaseServer();
  const [{ data: tags }, { data: lists }, { data: forms }] = await Promise.all([
    supabase.from("tags").select("id,name").order("name"),
    supabase.from("lists").select("id,name").order("name"),
    supabase.from("forms").select("slug,name").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Nueva automatización" />
      <AutomationBuilder
        initial={{
          name: "Secuencia de bienvenida",
          trigger_type: "contact_created",
          trigger_config: {},
          is_active: false,
          steps: [],
        }}
        tags={tags ?? []}
        lists={lists ?? []}
        forms={forms ?? []}
      />
    </>
  );
}
