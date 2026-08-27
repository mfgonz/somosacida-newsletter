import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { TemplateEditor } from "@/components/template-editor";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (!template) notFound();

  return (
    <TemplateEditor
      templateId={template.id}
      initialName={template.name}
      initialDesign={template.design}
    />
  );
}
