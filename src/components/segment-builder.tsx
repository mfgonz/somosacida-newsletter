"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveSegment,
  previewSegment,
  deleteSegment,
} from "@/app/(admin)/segments/actions";
import {
  FIELDS,
  OPERATORS,
  EMPTY_SEGMENT,
  type SegmentDefinition,
  type SegmentField,
  type SegmentOperator,
} from "@/lib/segments";

const VALUELESS: SegmentOperator[] = ["is_set", "is_empty"];

type SavedSegment = {
  id: string;
  name: string;
  summary: string;
  definition: SegmentDefinition;
};

export function SegmentBuilder({
  segments,
  tags,
  lists,
}: {
  segments: SavedSegment[];
  tags: { id: string; name: string }[];
  lists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [def, setDef] = useState<SegmentDefinition>(EMPTY_SEGMENT);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    previewSegment(def).then((r) => {
      if (!cancelled) setCount(r.ok ? r.count : null);
    });
    return () => {
      cancelled = true;
    };
  }, [def]);

  function reset() {
    setEditingId(null);
    setName("");
    setDef(EMPTY_SEGMENT);
  }

  function edit(s: SavedSegment) {
    setEditingId(s.id);
    setName(s.name);
    setDef(s.definition);
  }

  function save() {
    setError("");
    start(async () => {
      const r = await saveSegment({
        id: editingId ?? undefined,
        name,
        definition: def,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  function addRule() {
    setDef({
      ...def,
      rules: [...def.rules, { field: "email", operator: "contains", value: "" }],
    });
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold">
            {editingId ? "Editar segmento" : "Nuevo segmento"}
          </h2>
          {editingId && (
            <button onClick={reset} className="text-xs text-muted hover:text-ink">
              Cancelar edición
            </button>
          )}
        </div>

        <input
          className="input"
          placeholder="Nombre del segmento"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Cumplir</span>
          <select
            className="input max-w-[130px]"
            value={def.match}
            onChange={(e) =>
              setDef({ ...def, match: e.target.value as "all" | "any" })
            }
          >
            <option value="all">todas las reglas</option>
            <option value="any">alguna regla</option>
          </select>
        </div>

        <div className="space-y-2">
          {def.rules.map((rule, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <select
                className="input max-w-[160px]"
                value={rule.field}
                onChange={(e) => {
                  const rules = [...def.rules];
                  rules[i] = { ...rule, field: e.target.value as SegmentField };
                  setDef({ ...def, rules });
                }}
              >
                {Object.entries(FIELDS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="input max-w-[150px]"
                value={rule.operator}
                onChange={(e) => {
                  const rules = [...def.rules];
                  rules[i] = {
                    ...rule,
                    operator: e.target.value as SegmentOperator,
                  };
                  setDef({ ...def, rules });
                }}
              >
                {Object.entries(OPERATORS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              {!VALUELESS.includes(rule.operator) && (
                <input
                  className="input max-w-[180px]"
                  value={rule.value}
                  placeholder="Valor"
                  onChange={(e) => {
                    const rules = [...def.rules];
                    rules[i] = { ...rule, value: e.target.value };
                    setDef({ ...def, rules });
                  }}
                />
              )}

              <button
                onClick={() =>
                  setDef({ ...def, rules: def.rules.filter((_, j) => j !== i) })
                }
                className="text-xs text-muted hover:text-danger"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        <button onClick={addRule} className="btn-secondary">
          + Añadir regla
        </button>

        {tags.length > 0 && (
          <div>
            <span className="label">Y tiene alguna de estas etiquetas</span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setDef({
                      ...def,
                      tagIds: def.tagIds.includes(t.id)
                        ? def.tagIds.filter((x) => x !== t.id)
                        : [...def.tagIds, t.id],
                    })
                  }
                  className={`badge border ${
                    def.tagIds.includes(t.id)
                      ? "border-ink bg-ink text-white"
                      : "border-line text-muted"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {lists.length > 0 && (
          <div>
            <span className="label">Y pertenece a alguna de estas listas</span>
            <div className="flex flex-wrap gap-1.5">
              {lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() =>
                    setDef({
                      ...def,
                      listIds: def.listIds.includes(l.id)
                        ? def.listIds.filter((x) => x !== l.id)
                        : [...def.listIds, l.id],
                    })
                  }
                  className={`badge border ${
                    def.listIds.includes(l.id)
                      ? "border-ink bg-ink text-white"
                      : "border-line text-muted"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm">
          {count === null ? (
            <span className="text-muted">Calculando…</span>
          ) : (
            <span>
              Coinciden <strong>{count.toLocaleString("es-ES")}</strong> contacto(s).
            </span>
          )}
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button onClick={save} className="btn-primary" disabled={pending || !name.trim()}>
          {pending ? "Guardando…" : editingId ? "Guardar cambios" : "Crear segmento"}
        </button>
      </div>

      <div className="card divide-y divide-line">
        {!segments.length && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Aún no has guardado segmentos.
          </p>
        )}
        {segments.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="truncate text-xs text-muted">{s.summary}</p>
            </div>
            <button
              onClick={() => edit(s)}
              className="text-xs text-muted hover:text-ink"
            >
              Editar
            </button>
            <button
              onClick={() => {
                if (!window.confirm(`¿Eliminar el segmento "${s.name}"?`)) return;
                start(async () => {
                  await deleteSegment(s.id);
                  router.refresh();
                });
              }}
              className="text-xs text-muted hover:text-danger"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
