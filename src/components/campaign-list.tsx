"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignStatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import {
  deleteCampaign,
  setCampaignFolder,
} from "@/app/(admin)/campaigns/actions";
import type { CampaignStatus } from "@/lib/database.types";

export type CampaignRow = {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  folder: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
};

const UNFILED = "Sin carpeta";

export function CampaignList({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const c of campaigns) if (c.folder) set.add(c.folder);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [campaigns]);

  const visible = useMemo(() => {
    if (filter === null) return campaigns;
    if (filter === UNFILED) return campaigns.filter((c) => !c.folder);
    return campaigns.filter((c) => c.folder === filter);
  }, [campaigns, filter]);

  function move(id: string, current: string | null) {
    const next = window.prompt(
      "Carpeta para esta campaña (deja vacío para quitarla):",
      current ?? "",
    );
    if (next === null) return;
    start(async () => {
      const r = await setCampaignFolder(id, next);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  function remove(c: CampaignRow) {
    const warning =
      c.status === "sent" || c.status === "sending"
        ? `Se eliminará "${c.name}" y todo su historial de aperturas y clics. No se puede deshacer.`
        : `¿Eliminar el borrador "${c.name}"?`;
    if (!window.confirm(warning)) return;

    setError("");
    start(async () => {
      const r = await deleteCampaign(c.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  const chip = (label: string, value: string | null, count: number) => (
    <button
      key={label}
      onClick={() => setFilter(value)}
      className={`badge border transition ${
        filter === value
          ? "border-ink bg-ink text-white"
          : "border-line text-muted hover:border-ink hover:text-ink"
      }`}
    >
      {label} <span className="ml-1 opacity-60">{count}</span>
    </button>
  );

  return (
    <>
      {(folders.length > 0 || campaigns.some((c) => !c.folder)) && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {chip("Todas", null, campaigns.length)}
          {folders.map((f) =>
            chip(f, f, campaigns.filter((c) => c.folder === f).length),
          )}
          {campaigns.some((c) => !c.folder) &&
            chip(UNFILED, UNFILED, campaigns.filter((c) => !c.folder).length)}
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="card divide-y divide-line" aria-busy={pending}>
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No hay campañas en esta carpeta.
          </p>
        )}

        {visible.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/campaigns/${c.id}`}
                className="truncate font-medium hover:underline"
              >
                {c.name}
              </Link>
              <p className="truncate text-xs text-muted">
                {c.subject || "Sin asunto"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
              {c.folder && (
                <span className="badge border border-line text-muted">
                  {c.folder}
                </span>
              )}
              {c.total_recipients > 0 && (
                <span>{c.total_recipients.toLocaleString("es-ES")} dest.</span>
              )}
              <span>
                {c.sent_at
                  ? formatDateTime(c.sent_at)
                  : c.scheduled_at
                    ? `Programada ${formatDateTime(c.scheduled_at)}`
                    : "—"}
              </span>
              <CampaignStatusBadge status={c.status} />

              <button
                onClick={() => move(c.id, c.folder)}
                className="hover:text-ink"
                disabled={pending}
                title="Mover a una carpeta"
              >
                Carpeta
              </button>
              <button
                onClick={() => remove(c)}
                className="hover:text-danger"
                // A send in flight must be paused first, or the queue would
                // keep draining against a deleted campaign.
                disabled={pending || c.status === "sending"}
                title={
                  c.status === "sending"
                    ? "Pausa el envío antes de eliminar"
                    : "Eliminar campaña"
                }
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
