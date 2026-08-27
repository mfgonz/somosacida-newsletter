"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSuppression, removeSuppression } from "@/app/(admin)/suppressions/actions";

export function SuppressionManager() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [removeEmail, setRemoveEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    start(async () => {
      const r = await addSuppression(email);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMessage(`${email} bloqueado.`);
      setEmail("");
      router.refresh();
    });
  }

  function remove(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (
      !window.confirm(
        `Vas a permitir el envío a ${removeEmail} otra vez. Solo hazlo si esa persona te ha pedido volver a suscribirse. ¿Continuar?`,
      )
    ) {
      return;
    }
    start(async () => {
      const r = await removeSuppression(removeEmail);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMessage(`${removeEmail} desbloqueado. Debe volver a suscribirse.`);
      setRemoveEmail("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <form onSubmit={add} className="card space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold">Bloquear dirección</h2>
        <input
          type="email"
          className="input"
          placeholder="email@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn-secondary" disabled={pending || !email}>
          Bloquear
        </button>
      </form>

      <form onSubmit={remove} className="card space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold">Desbloquear</h2>
        <input
          type="email"
          className="input"
          placeholder="email@ejemplo.com"
          value={removeEmail}
          onChange={(e) => setRemoveEmail(e.target.value)}
        />
        <button className="btn-ghost text-warning" disabled={pending || !removeEmail}>
          Desbloquear
        </button>
      </form>

      {(message || error) && (
        <p
          className={`sm:col-span-2 text-sm ${error ? "text-danger" : "text-success"}`}
        >
          {error || message}
        </p>
      )}
    </div>
  );
}
