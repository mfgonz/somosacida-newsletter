"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTag, deleteTag } from "@/app/(admin)/tags/actions";
import { brand } from "@/lib/brand";

// The site's own categorical palette, so tags stay on-brand.
const PALETTE = Object.values(brand.palette);

type TagRow = { id: string; name: string; color: string; count: number };

export function TagManager({ tags }: { tags: TagRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const result = await createTag(name, color);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const result = await deleteTag(id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card space-y-3 p-4">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Nombre de la etiqueta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
          <button
            type="submit"
            className="btn-primary shrink-0"
            disabled={pending || !name.trim()}
          >
            Crear
          </button>
        </div>
        <div className="flex gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-6 w-6 rounded-full border-2 ${
                color === c ? "border-ink" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <div className="card divide-y divide-line">
        {!tags.length && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Aún no has creado etiquetas.
          </p>
        )}
        {tags.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="flex-1 text-sm font-medium">{t.name}</span>
            <span className="text-xs text-muted">{t.count} contacto(s)</span>
            <button
              onClick={() => remove(t.id)}
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
