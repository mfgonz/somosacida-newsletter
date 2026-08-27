import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { FormBuilder, type FormState } from "@/components/form-builder";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: form }, { data: lists }, { data: tags }] = await Promise.all([
    supabase.from("forms").select("*").eq("id", id).single(),
    supabase.from("lists").select("id,name").order("name"),
    supabase.from("tags").select("id,name").order("name"),
  ]);

  if (!form) notFound();

  const initial: FormState = {
    name: form.name,
    slug: form.slug,
    headline: form.headline ?? "",
    description: form.description ?? "",
    button_label: form.button_label,
    success_message: form.success_message,
    redirect_url: form.redirect_url ?? "",
    double_opt_in: form.double_opt_in,
    is_active: form.is_active,
    fields: form.fields as unknown as FormState["fields"],
    target_list_ids: form.target_list_ids,
    target_tag_ids: form.target_tag_ids,
  };

  return (
    <>
      <PageHeader
        title={form.name}
        description={`${form.submission_count} suscripción(es) recibidas`}
      />
      <FormBuilder
        formId={form.id}
        initial={initial}
        lists={lists ?? []}
        tags={tags ?? []}
        appUrl={appUrl()}
      />
    </>
  );
}
