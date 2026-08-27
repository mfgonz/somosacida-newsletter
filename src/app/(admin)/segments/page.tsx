import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SegmentBuilder } from "@/components/segment-builder";
import { parseSegmentDefinition, describeSegment } from "@/lib/segments";

export const metadata = { title: "Segmentos" };
export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const supabase = await supabaseServer();
  const [{ data: segments }, { data: tags }, { data: lists }] = await Promise.all([
    supabase.from("segments").select("*").order("name"),
    supabase.from("tags").select("id,name").order("name"),
    supabase.from("lists").select("id,name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Segmentos"
        description="Filtros guardados para dirigir tus campañas a la gente adecuada."
      />
      <SegmentBuilder
        segments={(segments ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          summary: describeSegment(parseSegmentDefinition(s.definition)),
          definition: parseSegmentDefinition(s.definition),
        }))}
        tags={tags ?? []}
        lists={lists ?? []}
      />
    </div>
  );
}
