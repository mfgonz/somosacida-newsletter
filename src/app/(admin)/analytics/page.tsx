import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, SectionHeading } from "@/components/ui";
import { IconAudience, IconSend, IconContent } from "@/components/icons";
import { loadAnalytics, type Kpi, type AnalyticsRange } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Analítica" };
export const dynamic = "force-dynamic";

const RANGES: { days: AnalyticsRange; label: string }[] = [
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 365, label: "12 meses" },
];

/**
 * Status is never carried by colour alone: each state pairs a hue with a word,
 * so it survives colourblindness, greyscale printing and forced-colors mode.
 */
const HEALTH: Record<string, { chip: string; label: string }> = {
  good: { chip: "bg-success/12 text-success", label: "Bien" },
  warning: { chip: "bg-warning/15 text-warning", label: "Vigilar" },
  critical: { chip: "bg-danger/12 text-danger", label: "Crítico" },
};

function KpiTile({ kpi }: { kpi: Kpi }) {
  const health = kpi.health ? HEALTH[kpi.health] : null;
  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {kpi.label}
        </p>
        {health && (
          <span className={`badge shrink-0 ${health.chip}`}>{health.label}</span>
        )}
      </div>
      <p className="mt-1.5 font-display text-3xl font-bold tabular-nums leading-none">
        {kpi.display}
      </p>
      {kpi.sub && <p className="mt-1 text-xs text-muted">{kpi.sub}</p>}
      {kpi.note && (
        <p className="mt-auto pt-3 text-[11px] leading-snug text-muted">
          {kpi.note}
        </p>
      )}
    </div>
  );
}

function Group({
  icon,
  title,
  kpis,
}: {
  icon: React.ReactNode;
  title: string;
  kpis: Kpi[];
}) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <SectionHeading icon={icon} title={title} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiTile key={k.key} kpi={k} />
        ))}
      </div>
    </section>
  );
}

/** Percentage cell with the value also written out, never colour alone. */
function Rate({ value, warnAt, critAt }: { value: number; warnAt?: number; critAt?: number }) {
  let tone = "text-ink";
  if (critAt !== undefined && value >= critAt) tone = "text-danger font-semibold";
  else if (warnAt !== undefined && value >= warnAt) tone = "text-warning font-medium";
  return (
    <span className={`tabular-nums ${tone}`}>
      {value.toFixed(value >= 10 ? 0 : 1)}%
    </span>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = ([30, 90, 365] as const).includes(Number(range) as AnalyticsRange)
    ? (Number(range) as AnalyticsRange)
    : 30;

  const supabase = await supabaseServer();
  const data = await loadAnalytics(supabase, days);

  return (
    <>
      <PageHeader
        title="Analítica"
        description={`${data.totals.campaigns} campaña(s) · ${data.totals.sends.toLocaleString("es-ES")} envío(s) en el periodo.`}
        action={
          <div className="flex rounded-md border border-line p-0.5">
            {RANGES.map((r) => (
              <Link
                key={r.days}
                href={`/analytics?range=${r.days}`}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  days === r.days
                    ? "bg-ink text-white"
                    : "text-muted hover:bg-canvas"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <Group icon={<IconAudience />} title="Audiencia" kpis={data.audience} />
      <Group
        icon={<IconSend />}
        title="Entregabilidad — lo que decide si llegas a la bandeja"
        kpis={data.deliverability}
      />
      <Group icon={<IconContent />} title="Interacción" kpis={data.engagement} />

      <section className="mb-8">
        <h2 className="mb-3 font-display text-base font-semibold">
          Rendimiento por campaña
        </h2>
        {data.campaigns.length === 0 ? (
          <p className="card px-4 py-8 text-center text-sm text-muted">
            Todavía no hay envíos en este periodo.
          </p>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Campaña</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Entregados</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Apert.</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Clics</th>
                    <th className="px-3 py-2.5 text-right font-semibold">C/A</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Rebotes</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Spam</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Bajas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas">
                      <td className="px-4 py-2.5">
                        <Link href={`/campaigns/${c.id}`} className="hover:underline">
                          {c.name}
                        </Link>
                        <span className="block text-xs text-muted">
                          {formatDate(c.sentAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {c.delivered.toLocaleString("es-ES")}
                      </td>
                      <td className="px-3 py-2.5 text-right"><Rate value={c.openRate} /></td>
                      <td className="px-3 py-2.5 text-right"><Rate value={c.clickRate} /></td>
                      <td className="px-3 py-2.5 text-right"><Rate value={c.ctor} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <Rate value={c.bounceRate} warnAt={2} critAt={5} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Rate value={c.complaintRate} warnAt={0.1} critAt={0.3} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Rate value={c.unsubRate} warnAt={0.5} critAt={1} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          C/A = clics por apertura. Es la mejor medida de si el contenido
          funciona, porque no depende de cuánta gente abrió.
        </p>
      </section>

      {data.topLinks.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-base font-semibold">
            Enlaces más clicados
          </h2>
          <div className="card divide-y divide-line">
            {data.topLinks.map((l) => (
              <div
                key={l.url}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <span className="truncate text-ink-soft" title={l.url}>
                  {l.url}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {l.clicks}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="card border-l-4 border-l-accent p-5">
        <h2 className="font-display text-sm font-semibold">Cómo leer esto</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>
            <strong className="text-ink">Quejas de spam</strong> es la cifra que
            puede cerrarte la puerta. Gmail y Yahoo exigen menos de 0,30%; por
            encima empiezan a mandar tus correos a spam de forma sistemática.
          </li>
          <li>
            <strong className="text-ink">Rebotes</strong> por encima del 2%
            sugieren una lista antigua o sin verificar. Se suprimen solos, pero
            el daño a la reputación ya está hecho.
          </li>
          <li>
            <strong className="text-ink">Aperturas</strong> están infladas: Apple
            Mail precarga el píxel de seguimiento aunque nadie lea. Sirven como
            tendencia, no como verdad.
          </li>
          <li>
            <strong className="text-ink">Clics por apertura</strong> es lo que
            miramos para saber si el contenido conecta.
          </li>
        </ul>
      </div>
    </>
  );
}
