import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { TagManager } from "@/components/tag-manager";

export const metadata = { title: "Etiquetas" };
export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const supabase = await supabaseServer();
  const { data: tags } = await supabase.from("tags").select("*").order("name");

  const { data: counts } = await supabase.from("contact_tags").select("tag_id");
  const usage = new Map<string, number>();
  for (const row of counts ?? []) {
    usage.set(row.tag_id, (usage.get(row.tag_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Etiquetas"
        description="Clasifica contactos para segmentar tus envíos."
      />
      <TagManager
        tags={(tags ?? []).map((t) => ({ ...t, count: usage.get(t.id) ?? 0 }))}
      />
    </div>
  );
}
