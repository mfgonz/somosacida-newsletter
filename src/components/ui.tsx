import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ContactStatus, CampaignStatus } from "@/lib/database.types";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-5">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/**
 * Section heading with an identifying icon, for use inside a card.
 * `accent` is for sections that must stand apart from the normal flow.
 */
export function SectionHeading({
  icon,
  title,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
}) {
  return (
    <h2 className="flex items-center gap-2.5 font-display text-sm font-semibold">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          accent ? "bg-accent text-accent-ink" : "bg-canvas text-ink-soft",
        )}
      >
        {icon}
      </span>
      {title}
    </h2>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

const CONTACT_STATUS_STYLE: Record<ContactStatus, string> = {
  subscribed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  unsubscribed: "bg-muted/15 text-muted",
  bounced: "bg-danger/10 text-danger",
  complained: "bg-danger/10 text-danger",
  cleaned: "bg-muted/15 text-muted",
};

const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  subscribed: "Suscrito",
  pending: "Pendiente",
  unsubscribed: "Baja",
  bounced: "Rebotado",
  complained: "Spam",
  cleaned: "Depurado",
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span className={cn("badge", CONTACT_STATUS_STYLE[status])}>
      {CONTACT_STATUS_LABEL[status]}
    </span>
  );
}

const CAMPAIGN_STATUS_STYLE: Record<CampaignStatus, string> = {
  draft: "bg-muted/15 text-muted",
  scheduled: "bg-info/10 text-info",
  sending: "bg-warning/10 text-warning",
  sent: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  failed: "bg-danger/10 text-danger",
  cancelled: "bg-muted/15 text-muted",
};

const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  sending: "Enviando",
  sent: "Enviada",
  paused: "Pausada",
  failed: "Fallida",
  cancelled: "Cancelada",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn("badge", CAMPAIGN_STATUS_STYLE[status])}>
      {CAMPAIGN_STATUS_LABEL[status]}
    </span>
  );
}
