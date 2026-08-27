"use client";

import { useState, useTransition } from "react";
import { savePreferences, unsubscribeAll } from "./actions";

type ListRow = {
  id: string;
  name: string;
  description: string | null;
  subscribed: boolean;
};

export function PreferencesForm({
  token,
  firstName: initialFirst,
  lastName: initialLast,
  lists: initialLists,
  unsubscribed,
}: {
  token: string;
  firstName: string;
  lastName: string;
  lists: ListRow[];
  unsubscribed: boolean;
}) {
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [lists, setLists] = useState(initialLists);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [gone, setGone] = useState(unsubscribed);
  const [pending, start] = useTransition();

  if (gone) {
    return (
      <p className="text-sm">
        Te has dado de baja de todos nuestros correos. Si fue un error, escríbenos
        y te volvemos a añadir.
      </p>
    );
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    start(async () => {
      const r = await savePreferences(token, {
        firstName,
        lastName,
        listIds: lists.filter((l) => l.subscribed).map((l) => l.id),
      });
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      setMessage("Preferencias guardadas.");
    });
  }

  function leaveAll() {
    if (!window.confirm("¿Dejar de recibir todos nuestros correos?")) return;
    start(async () => {
      const r = await unsubscribeAll(token);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      setGone(true);
    });
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fn">
            Nombre
          </label>
          <input
            id="fn"
            className="input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="ln">
            Apellido
          </label>
          <input
            id="ln"
            className="input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      {lists.length > 0 && (
        <fieldset>
          <legend className="label">¿Qué quieres recibir?</legend>
          <div className="space-y-2">
            {lists.map((l) => (
              <label key={l.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={l.subscribed}
                  onChange={(e) =>
                    setLists((prev) =>
                      prev.map((x) =>
                        x.id === l.id ? { ...x, subscribed: e.target.checked } : x,
                      ),
                    )
                  }
                  className="mt-0.5"
                />
                <span>
                  {l.name}
                  {l.description && (
                    <span className="block text-xs text-muted">
                      {l.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar preferencias"}
      </button>

      <button
        type="button"
        onClick={leaveAll}
        className="w-full text-center text-xs text-muted underline hover:text-danger"
        disabled={pending}
      >
        Darme de baja de todos los correos
      </button>
    </form>
  );
}
