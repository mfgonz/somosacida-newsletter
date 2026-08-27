"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContact, updateContact } from "@/app/(admin)/contacts/actions";
import type { Contact } from "@/lib/database.types";

const STATUSES: { value: string; label: string }[] = [
  { value: "subscribed", label: "Suscrito" },
  { value: "pending", label: "Pendiente de confirmar" },
  { value: "unsubscribed", label: "Baja" },
  { value: "bounced", label: "Rebotado" },
  { value: "complained", label: "Marcó como spam" },
  { value: "cleaned", label: "Depurado" },
];

export function ContactForm({ contact }: { contact?: Contact }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    setSaved(false);

    start(async () => {
      const result = contact
        ? await updateContact(contact.id, formData)
        : await createContact(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (contact) {
        setSaved(true);
        router.refresh();
      } else {
        router.push("/contacts");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          defaultValue={contact?.email}
          // Changing an address would silently break the consent trail tied to it.
          readOnly={Boolean(contact)}
        />
        {contact && (
          <p className="mt-1 text-xs text-muted">
            El email no se puede cambiar. Crea un contacto nuevo si es necesario.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="first_name">
            Nombre
          </label>
          <input
            id="first_name"
            name="first_name"
            className="input"
            defaultValue={contact?.first_name ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="last_name">
            Apellido
          </label>
          <input
            id="last_name"
            name="last_name"
            className="input"
            defaultValue={contact?.last_name ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="company">
            Empresa
          </label>
          <input
            id="company"
            name="company"
            className="input"
            defaultValue={contact?.company ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            className="input"
            defaultValue={contact?.phone ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="status">
          Estado
        </label>
        <select
          id="status"
          name="status"
          className="input"
          defaultValue={contact?.status ?? "subscribed"}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-success">Guardado.</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : contact ? "Guardar cambios" : "Crear contacto"}
      </button>
    </form>
  );
}
