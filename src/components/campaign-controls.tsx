"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
} from "@/app/(admin)/campaigns/actions";
import type { CampaignStatus } from "@/lib/database.types";

export function CampaignControls({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError("");
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      if (after) after();
      else router.refresh();
    });
  }

  const canPause = status === "sending" || status === "scheduled";
  const canResume = status === "paused";
  const canDelete = status !== "sending";

  if (!canPause && !canResume && !canDelete) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {canPause && (
        <button
          onClick={() => run(() => pauseCampaign(campaignId))}
          className="btn-secondary"
          disabled={pending}
        >
          Pausar envío
        </button>
      )}
      {canResume && (
        <button
          onClick={() => run(() => resumeCampaign(campaignId))}
          className="btn-primary"
          disabled={pending}
        >
          Reanudar envío
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => {
            if (!window.confirm("¿Eliminar esta campaña y su historial?")) return;
            run(
              () => deleteCampaign(campaignId),
              () => router.push("/campaigns"),
            );
          }}
          className="btn-ghost text-danger"
          disabled={pending}
        >
          Eliminar
        </button>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
