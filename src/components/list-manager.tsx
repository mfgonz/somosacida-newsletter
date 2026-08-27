"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createList, deleteList } from "@/app/(admin)/lists/actions";

type ListRow = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  count: number;
};

export function ListManager({ lists }: { lists: ListRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await createList({ name, description, is_public: isPublic });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setName("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card space-y-3 p-4">
        <input
          className="input"
          placeholder="Nombre de la lista"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
        <input
          className="input"
          placeholder="Descripción (se muestra en el centro de preferencias)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Visible en el centro de preferencias
            <span className="block text-xs text-muted">
              Si la desmarcas, es una lista interna y nadie puede darse de baja
              de ella por su cuenta.
            </span>
          </span>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary" disabled={pending || !name.trim()}>
          Crear lista
        </button>
      </form>

      <div className="card divide-y divide-line">
        {!lists.length && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Aún no has creado listas.
          </p>
        )}
        {lists.map((l) => (
          <div key={l.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{l.name}</p>
              {l.description && (
                <p className="truncate text-xs text-muted">{l.description}</p>
              )}
            </div>
            {!l.is_public && (
              <span className="badge bg-muted/15 text-muted">Interna</span>
            )}
            <span className="text-xs text-muted">{l.count} suscrito(s)</span>
            <button
              onClick={() => {
                if (!window.confirm(`¿Eliminar la lista "${l.name}"?`)) return;
                start(async () => {
                  const r = await deleteList(l.id);
                  if (!r.ok) setError(r.error);
                  router.refresh();
                });
              }}
              className="text-xs text-muted hover:text-danger"
              disabled={pending}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
