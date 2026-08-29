import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * The email KPIs that actually govern whether a list keeps reaching inboxes.
 *
 * Thresholds are the published bulk-sender requirements from Gmail and Yahoo
 * (2024) plus long-standing ESP guidance, not invented numbers:
 *   - Spam complaints must stay under 0.30%; 0.10% is the target to sit at.
 *   - Hard bounces above ~2% signal a stale or unverified list.
 *   - Unsubscribes above ~0.5% per send suggest a mismatch in expectations.
 *
 * Open rate is reported but deliberately de-emphasised: Apple Mail Privacy
 * Protection preloads tracking pixels, inflating it. Click-to-open is the
 * honest content signal.
 */

export type Health = "good" | "warning" | "critical";

export type Kpi = {
  key: string;
  label: string;
  value: number;
  /** Formatted for display; percentages already carry their sign. */
  display: string;
  sub?: string;
  health?: Health;
  /** Why this number matters, shown under the tile. */
  note?: string;
};

const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const fmtPct = (v: number) => `${v.toFixed(v >= 10 ? 0 : 1)}%`;
const fmtNum = (v: number) => v.toLocaleString("es-ES");

function band(value: number, warnAt: number, critAt: number): Health {
  if (value >= critAt) return "critical";
  if (value >= warnAt) return "warning";
  return "good";
}

export type AnalyticsRange = 30 | 90 | 365;

export type AnalyticsData = {
  audience: Kpi[];
  deliverability: Kpi[];
  engagement: Kpi[];
  campaigns: {
    id: string;
    name: string;
    sentAt: string | null;
    delivered: number;
    openRate: number;
    clickRate: number;
    ctor: number;
    bounceRate: number;
    complaintRate: number;
    unsubRate: number;
  }[];
  topLinks: { url: string; clicks: number }[];
  totals: { sends: number; campaigns: number };
  neverEngaged: number;
};

export async function loadAnalytics(
  supabase: SupabaseClient<Database>,
  days: AnalyticsRange,
): Promise<AnalyticsData> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [
    { count: subscribed },
    { count: pendingCount },
    { count: unsubTotal },
    { count: newInRange },
    { count: unsubInRange },
    { data: sentCampaigns },
    { data: recipients },
    { data: clickEvents },
    { data: unsubEvents },
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true })
      .eq("status", "subscribed"),
    supabase.from("contacts").select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("contacts").select("*", { count: "exact", head: true })
      .eq("status", "unsubscribed"),
    supabase.from("contacts").select("*", { count: "exact", head: true })
      .gte("created_at", since),
    supabase.from("contacts").select("*", { count: "exact", head: true })
      .gte("unsubscribed_at", since),
    supabase.from("campaigns").select("id,name,sent_at,total_recipients")
      .in("status", ["sent", "sending"])
      .gte("created_at", since)
      .order("sent_at", { ascending: false, nullsFirst: false }),
    supabase.from("campaign_recipients")
      .select("campaign_id,contact_id,status,open_count,click_count")
      .limit(100_000),
    supabase.from("email_events").select("campaign_id,link_url")
      .eq("event_type", "clicked").gte("occurred_at", since).limit(20_000),
    supabase.from("email_events").select("campaign_id")
      .eq("event_type", "unsubscribed").gte("occurred_at", since).limit(20_000),
  ]);

  const campaignIds = new Set((sentCampaigns ?? []).map((c) => c.id));
  const rows = (recipients ?? []).filter((r) => campaignIds.has(r.campaign_id));

  // A message is "delivered" once the provider accepted and did not bounce it.
  const attempted = rows.filter((r) => r.status !== "skipped" && r.status !== "queued");
  const delivered = attempted.filter((r) =>
    r.status === "sent" || r.status === "delivered",
  );
  const bounced = attempted.filter((r) => r.status === "bounced");
  const complained = attempted.filter((r) => r.status === "complained");
  const opened = delivered.filter((r) => r.open_count > 0);
  const clicked = delivered.filter((r) => r.click_count > 0);

  const unsubsFromSends = (unsubEvents ?? []).length;

  const deliveryRate = pct(delivered.length, attempted.length);
  const bounceRate = pct(bounced.length, attempted.length);
  const complaintRate = pct(complained.length, attempted.length);
  const openRate = pct(opened.length, delivered.length);
  const clickRate = pct(clicked.length, delivered.length);
  const ctor = pct(clicked.length, opened.length);
  const unsubRate = pct(unsubsFromSends, delivered.length);

  const activeList = subscribed ?? 0;
  const netGrowth = (newInRange ?? 0) - (unsubInRange ?? 0);
  const churnRate = pct(unsubInRange ?? 0, activeList + (unsubInRange ?? 0));

  // Distinct people who were mailed at least once and have never opened or
  // clicked. Counted per contact, not per message: someone who ignored five
  // sends is one disengaged person, not five.
  const engagedContacts = new Set<string>();
  const mailedContacts = new Set<string>();
  for (const r of delivered) {
    mailedContacts.add(r.contact_id);
    if (r.open_count > 0 || r.click_count > 0) engagedContacts.add(r.contact_id);
  }
  const neverEngaged = mailedContacts.size - engagedContacts.size;

  const audience: Kpi[] = [
    {
      key: "subscribed", label: "Suscriptores activos",
      value: activeList, display: fmtNum(activeList),
      sub: `${fmtNum(pendingCount ?? 0)} sin confirmar`,
      note: "Contactos a los que puedes escribir hoy.",
    },
    {
      key: "growth", label: "Crecimiento neto",
      value: netGrowth,
      display: `${netGrowth >= 0 ? "+" : ""}${fmtNum(netGrowth)}`,
      sub: `+${fmtNum(newInRange ?? 0)} altas · −${fmtNum(unsubInRange ?? 0)} bajas`,
      health: netGrowth >= 0 ? "good" : "warning",
      note: "Altas menos bajas en el periodo.",
    },
    {
      key: "churn", label: "Tasa de bajas",
      value: churnRate, display: fmtPct(churnRate),
      health: band(churnRate, 2, 5),
      note: "Proporción de la lista que se dio de baja.",
    },
    {
      key: "unsubTotal", label: "Bajas acumuladas",
      value: unsubTotal ?? 0, display: fmtNum(unsubTotal ?? 0),
      note: "Nunca volverán a recibir envíos.",
    },
  ];

  const deliverability: Kpi[] = [
    {
      key: "delivery", label: "Tasa de entrega",
      value: deliveryRate, display: fmtPct(deliveryRate),
      sub: `${fmtNum(delivered.length)} de ${fmtNum(attempted.length)}`,
      health: deliveryRate >= 98 ? "good" : deliveryRate >= 95 ? "warning" : "critical",
      note: "Por debajo del 95% revisa la calidad de la lista.",
    },
    {
      key: "bounce", label: "Rebotes",
      value: bounceRate, display: fmtPct(bounceRate),
      sub: `${fmtNum(bounced.length)} direcciones`,
      health: band(bounceRate, 2, 5),
      note: "Mantenlo bajo el 2%. Se suprimen automáticamente.",
    },
    {
      key: "complaints", label: "Quejas de spam",
      value: complaintRate, display: `${complaintRate.toFixed(2)}%`,
      sub: `${fmtNum(complained.length)} quejas`,
      health: band(complaintRate, 0.1, 0.3),
      note: "Gmail exige menos de 0,30%. Objetivo: 0,10%.",
    },
    {
      key: "unsub", label: "Bajas por envío",
      value: unsubRate, display: fmtPct(unsubRate),
      health: band(unsubRate, 0.5, 1),
      note: "Sobre 0,5% indica desajuste de expectativas.",
    },
  ];

  const engagement: Kpi[] = [
    {
      key: "ctor", label: "Clics por apertura",
      value: ctor, display: fmtPct(ctor),
      sub: `${fmtNum(clicked.length)} de ${fmtNum(opened.length)}`,
      note: "La señal más fiable de si el contenido conecta.",
    },
    {
      key: "click", label: "Tasa de clics",
      value: clickRate, display: fmtPct(clickRate),
      sub: `${fmtNum(clicked.length)} personas`,
      note: "Referencia del sector: 2–5%.",
    },
    {
      key: "open", label: "Tasa de apertura",
      value: openRate, display: fmtPct(openRate),
      sub: `${fmtNum(opened.length)} personas`,
      note: "Inflada por Apple Mail. Úsala solo como tendencia.",
    },
    {
      key: "neverEngaged", label: "Nunca interactuaron",
      value: neverEngaged, display: fmtNum(neverEngaged),
      sub: `de ${fmtNum(mailedContacts.size)} contactados`,
      note: "Candidatos a una campaña de reactivación.",
    },
  ];

  const perCampaign = (sentCampaigns ?? []).map((c) => {
    const cr = rows.filter((r) => r.campaign_id === c.id);
    const att = cr.filter((r) => r.status !== "skipped" && r.status !== "queued");
    const del = att.filter((r) => r.status === "sent" || r.status === "delivered");
    const op = del.filter((r) => r.open_count > 0).length;
    const cl = del.filter((r) => r.click_count > 0).length;
    const bo = att.filter((r) => r.status === "bounced").length;
    const co = att.filter((r) => r.status === "complained").length;
    const un = (unsubEvents ?? []).filter((e) => e.campaign_id === c.id).length;

    return {
      id: c.id,
      name: c.name,
      sentAt: c.sent_at,
      delivered: del.length,
      openRate: pct(op, del.length),
      clickRate: pct(cl, del.length),
      ctor: pct(cl, op),
      bounceRate: pct(bo, att.length),
      complaintRate: pct(co, att.length),
      unsubRate: pct(un, del.length),
    };
  });

  const linkCounts = new Map<string, number>();
  for (const e of clickEvents ?? []) {
    if (!e.link_url) continue;
    linkCounts.set(e.link_url, (linkCounts.get(e.link_url) ?? 0) + 1);
  }

  return {
    audience,
    deliverability,
    engagement,
    campaigns: perCampaign,
    topLinks: [...linkCounts.entries()]
      .map(([url, clicks]) => ({ url, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10),
    totals: { sends: attempted.length, campaigns: perCampaign.length },
    neverEngaged,
  };
}
