import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ImportWizard } from "@/components/import-wizard";

export const metadata = { title: "Importar contactos" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await supabaseServer();
  const [{ data: tags }, { data: lists }] = await Promise.all([
    supabase.from("tags").select("id,name,color").order("name"),
    supabase.from("lists").select("id,name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Importar contactos"
        description="Sube un CSV y asigna cada columna a un campo."
      />
      <ImportWizard tags={tags ?? []} lists={lists ?? []} />
    </div>
  );
}
