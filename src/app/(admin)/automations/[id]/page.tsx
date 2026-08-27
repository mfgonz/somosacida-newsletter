import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import {
  AutomationBuilder,
  type AutomationState,
  type Step,
} from "@/components/automation-builder";
import { parseDesign } from "@/lib/email/blocks";
import { starterDesign } from "@/lib/email/starter";

export const dynamic = "force-dynamic";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [
    { data: automation },
    { data: steps },
    { data: tags },
    { data: lists },
    { data: forms },
  ] = await Promise.all([
    supabase.from("automations").select("*").eq("id", id).single(),
    supabase
      .from("automation_steps")
      .select("*")
      .eq("automation_id", id)
      .order("position"),
    supabase.from("tags").select("id,name").order("name"),
    supabase.from("lists").select("id,name").order("name"),
    supabase.from("forms").select("slug,name").order("name"),
  ]);

  if (!automation) notFound();

  const initial: AutomationState = {
    name: automation.name,
    trigger_type: automation.trigger_type,
    trigger_config: (automation.trigger_config ?? {}) as Record<string, string>,
    is_active: automation.is_active,
    steps: (steps ?? []).map(
      (s): Step => ({
        step_type: s.step_type,
        wait_minutes: s.wait_minutes,
        subject: s.subject ?? "",
        design: s.design ? parseDesign(s.design) : parseDesign(starterDesign()),
        tag_id: s.tag_id,
      }),
    ),
  };

  return (
    <>
      <PageHeader title={automation.name} />
      <AutomationBuilder
        automationId={automation.id}
        initial={initial}
        tags={tags ?? []}
        lists={lists ?? []}
        forms={forms ?? []}
      />
    </>
  );
}
