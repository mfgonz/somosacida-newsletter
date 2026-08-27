"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote } from "@/app/(admin)/contacts/actions";

export function NoteForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const result = await addNote(contactId, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Añade una nota interna sobre este contacto…"
        className="input resize-y"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        className="btn-secondary"
        disabled={pending || !body.trim()}
      >
        {pending ? "Guardando…" : "Añadir nota"}
      </button>
    </form>
  );
}
