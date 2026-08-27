"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteContact } from "@/app/(admin)/contacts/actions";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function remove() {
    setError("");
    start(async () => {
      const result = await deleteContact(contactId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/contacts");
    });
  }

  return (
    <div className="card border-danger/30 p-4">
      <h2 className="font-display text-sm font-semibold text-danger">
        Eliminar contacto
      </h2>
      <p className="mt-1 text-xs text-muted">
        Borra el contacto y todo su historial de forma permanente. Para cumplir
        con el derecho al olvido (RGPD).
      </p>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {confirming ? (
        <div className="mt-3 flex gap-2">
          <button onClick={remove} className="btn-danger" disabled={pending}>
            {pending ? "Eliminando…" : "Sí, eliminar"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="btn-secondary"
            disabled={pending}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="btn-secondary mt-3">
          Eliminar
        </button>
      )}
    </div>
  );
}
