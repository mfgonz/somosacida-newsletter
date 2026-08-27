"use client";

import { useState, useTransition } from "react";
import { unsubscribeAction } from "./actions";

const REASONS = [
  "Recibo demasiados correos",
  "El contenido no me interesa",
  "Nunca me suscribí",
  "Otro motivo",
];

export function UnsubscribeForm({ token }: { token: string }) {
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    setError("");
    start(async () => {
      const r = await unsubscribeAction(token, reason);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div>
        <p className="text-sm">
          Listo, te has dado de baja. No volverás a recibir nuestros correos.
        </p>
        <p className="mt-3 text-sm text-muted">
          Gracias por el tiempo que nos dedicaste.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">
          ¿Nos cuentas por qué? (opcional)
        </legend>
        <div className="space-y-1.5">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={(e) => setReason(e.target.value)}
              />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button onClick={submit} className="btn-primary w-full" disabled={pending}>
        {pending ? "Procesando…" : "Confirmar baja"}
      </button>
    </div>
  );
}
