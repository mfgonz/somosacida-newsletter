"use client";

import { useState } from "react";

export type FormField = { key: string; label: string; required?: boolean };

export function SignupForm({
  slug,
  fields,
  buttonLabel,
  successMessage,
  compact = false,
}: {
  slug: string;
  fields: FormField[];
  buttonLabel: string;
  successMessage: string;
  compact?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...values, website: honeypot }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "No se pudo completar la suscripción.");
        return;
      }

      setStatus("done");
      setMessage(data.message ?? successMessage);
      if (data.redirect) window.location.href = data.redirect;
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-md bg-success/10 p-4 text-sm text-success">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-2" : "space-y-3"}>
      {fields.map((f) => (
        <div key={f.key}>
          {!compact && (
            <label className="label" htmlFor={`f-${f.key}`}>
              {f.label}
              {f.required && " *"}
            </label>
          )}
          <input
            id={`f-${f.key}`}
            type={f.key === "email" ? "email" : "text"}
            required={f.required}
            placeholder={compact ? f.label : undefined}
            className="input"
            value={values[f.key] ?? ""}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            autoComplete={
              f.key === "email"
                ? "email"
                : f.key === "first_name"
                  ? "given-name"
                  : f.key === "last_name"
                    ? "family-name"
                    : "off"
            }
          />
        </div>
      ))}

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`website-${slug}`}>No rellenar</label>
        <input
          id={`website-${slug}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Enviando…" : buttonLabel}
      </button>
    </form>
  );
}
