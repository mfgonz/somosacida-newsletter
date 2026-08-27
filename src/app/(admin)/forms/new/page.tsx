import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { FormBuilder } from "@/components/form-builder";
import { appUrl } from "@/lib/env";

export const metadata = { title: "Nuevo formulario" };
export const dynamic = "force-dynamic";

export default async function NewFormPage() {
  const supabase = await supabaseServer();
  const [{ data: lists }, { data: tags }] = await Promise.all([
    supabase.from("lists").select("id,name").order("name"),
    supabase.from("tags").select("id,name").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Nuevo formulario" />
      <FormBuilder
        initial={{
          name: "Boletín",
          slug: "",
          headline: "Suscríbete a nuestro boletín",
          description: "",
          button_label: "Suscribirme",
          success_message: "¡Gracias! Revisa tu correo para confirmar.",
          redirect_url: "",
          double_opt_in: true,
          is_active: true,
          fields: [
            { key: "email", label: "Email", required: true },
            { key: "first_name", label: "Nombre", required: false },
          ],
          target_list_ids: [],
          target_tag_ids: [],
        }}
        lists={lists ?? []}
        tags={tags ?? []}
        appUrl={appUrl()}
      />
    </>
  );
}
