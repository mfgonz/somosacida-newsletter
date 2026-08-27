import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ListManager } from "@/components/list-manager";

export const metadata = { title: "Listas" };
export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const supabase = await supabaseServer();
  const [{ data: lists }, { data: memberships }] = await Promise.all([
    supabase.from("lists").select("*").order("name"),
    supabase.from("list_contacts").select("list_id,subscribed"),
  ]);

  const counts = new Map<string, number>();
  for (const m of memberships ?? []) {
    if (m.subscribed) counts.set(m.list_id, (counts.get(m.list_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Listas"
        description="Temas a los que la gente se suscribe. Aparecen en el centro de preferencias."
      />
      <ListManager
        lists={(lists ?? []).map((l) => ({ ...l, count: counts.get(l.id) ?? 0 }))}
      />
    </div>
  );
}
