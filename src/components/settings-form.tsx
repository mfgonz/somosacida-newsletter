"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/app/(admin)/settings/actions";

type SettingsState = {
  organization_name: string;
  postal_address: string;
  default_from_name: string;
  default_from_email: string;
  default_reply_to: string;
};

export function SettingsForm({
  initial,
  webhookUrl,
}: {
  initial: SettingsState;
  webhookUrl: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function set<K extends keyof SettingsState>(key: K, value: string) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    start(async () => {
      const r = await saveSettings(state);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h2 className="font-display text-sm font-semibold">Identidad</h2>

        <div>
          <label className="label" htmlFor="org">
            Nombre de la organización
          </label>
          <input
            id="org"
            className="input"
            value={state.organization_name}
            onChange={(e) => set("organization_name", e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="postal">
            Dirección postal
          </label>
          <input
            id="postal"
            className="input"
            value={state.postal_address}
            onChange={(e) => set("postal_address", e.target.value)}
            placeholder="Calle, número, ciudad, país"
          />
          <p className="mt-1 text-xs text-muted">
            Obligatoria en el pie de todo email comercial (CAN-SPAM y normativa
            equivalente). Sin ella no podrás lanzar campañas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fromname">
              Nombre del remitente
            </label>
            <input
              id="fromname"
              className="input"
              value={state.default_from_name}
              onChange={(e) => set("default_from_name", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="fromemail">
              Email del remitente
            </label>
            <input
              id="fromemail"
              type="email"
              className="input"
              value={state.default_from_email}
              onChange={(e) => set("default_from_email", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="replyto">
            Email de respuesta
          </label>
          <input
            id="replyto"
            type="email"
            className="input"
            value={state.default_reply_to}
            onChange={(e) => set("default_reply_to", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-success">Ajustes guardados.</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar ajustes"}
        </button>
      </form>

      <div className="card p-6">
        <h2 className="mb-2 font-display text-sm font-semibold">
          Webhook de Resend
        </h2>
        <p className="mb-2 text-xs text-muted">
          Configura esta URL en Resend → Webhooks para recibir aperturas, clics,
          rebotes y quejas. Copia el signing secret en{" "}
          <code className="font-mono">RESEND_WEBHOOK_SECRET</code>.
        </p>
        <input
          readOnly
          className="input font-mono text-xs"
          value={webhookUrl}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>
    </div>
  );
}
