"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveForm, deleteForm } from "@/app/(admin)/forms/actions";
import { slugify } from "@/lib/utils";

type FieldKey = "email" | "first_name" | "last_name" | "company" | "phone";

const AVAILABLE_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "first_name", label: "Nombre" },
  { key: "last_name", label: "Apellido" },
  { key: "company", label: "Empresa" },
  { key: "phone", label: "Teléfono" },
];

export type FormState = {
  name: string;
  slug: string;
  headline: string;
  description: string;
  button_label: string;
  success_message: string;
  redirect_url: string;
  double_opt_in: boolean;
  is_active: boolean;
  fields: { key: FieldKey; label: string; required?: boolean }[];
  target_list_ids: string[];
  target_tag_ids: string[];
};

export function FormBuilder({
  formId,
  initial,
  lists,
  tags,
  appUrl,
}: {
  formId?: string;
  initial: FormState;
  lists: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  appUrl: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const slug = slugify(state.slug || state.name);
  const hostedUrl = `${appUrl}/subscribe/${slug}`;
  const embedUrl = `${appUrl}/f/${slug}`;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function toggleField(key: FieldKey) {
    if (key === "email") return;
    const exists = state.fields.some((f) => f.key === key);
    set(
      "fields",
      exists
        ? state.fields.filter((f) => f.key !== key)
        : [
            ...state.fields,
            {
              key,
              label: AVAILABLE_FIELDS.find((f) => f.key === key)!.label,
              required: false,
            },
          ],
    );
  }

  function save() {
    setError("");
    setSaved(false);
    start(async () => {
      const r = await saveForm(state, formId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (formId) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/forms/${r.id}`);
      }
    });
  }

  function remove() {
    if (!formId) return;
    if (!window.confirm("¿Eliminar este formulario?")) return;
    start(async () => {
      const r = await deleteForm(formId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/forms");
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="card space-y-4 p-6">
          <h2 className="font-display text-sm font-semibold">Identificación</h2>

          <div>
            <label className="label" htmlFor="name">
              Nombre interno
            </label>
            <input
              id="name"
              className="input"
              value={state.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="slug">
              URL
            </label>
            <input
              id="slug"
              className="input font-mono text-xs"
              value={state.slug}
              placeholder={slugify(state.name)}
              onChange={(e) => set("slug", e.target.value)}
            />
            <p className="mt-1 break-all text-xs text-muted">{hostedUrl}</p>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="font-display text-sm font-semibold">Contenido</h2>

          <div>
            <label className="label" htmlFor="headline">
              Titular
            </label>
            <input
              id="headline"
              className="input"
              value={state.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="Suscríbete a nuestro boletín"
            />
          </div>

          <div>
            <label className="label" htmlFor="description">
              Descripción
            </label>
            <textarea
              id="description"
              className="input resize-y"
              rows={2}
              value={state.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="button">
                Texto del botón
              </label>
              <input
                id="button"
                className="input"
                value={state.button_label}
                onChange={(e) => set("button_label", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="redirect">
                Redirección tras enviar
              </label>
              <input
                id="redirect"
                className="input"
                placeholder="Opcional — https://…"
                value={state.redirect_url}
                onChange={(e) => set("redirect_url", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="success">
              Mensaje de éxito
            </label>
            <input
              id="success"
              className="input"
              value={state.success_message}
              onChange={(e) => set("success_message", e.target.value)}
            />
          </div>
        </div>

        <div className="card space-y-3 p-6">
          <h2 className="font-display text-sm font-semibold">Campos</h2>
          {AVAILABLE_FIELDS.map((f) => {
            const active = state.fields.some((x) => x.key === f.key);
            const isEmail = f.key === "email";
            return (
              <div key={f.key} className="flex items-center gap-3">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={isEmail}
                    onChange={() => toggleField(f.key)}
                  />
                  {f.label}
                  {isEmail && (
                    <span className="text-xs text-muted">(obligatorio)</span>
                  )}
                </label>
                {active && !isEmail && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={
                        state.fields.find((x) => x.key === f.key)?.required ?? false
                      }
                      onChange={(e) =>
                        set(
                          "fields",
                          state.fields.map((x) =>
                            x.key === f.key
                              ? { ...x, required: e.target.checked }
                              : x,
                          ),
                        )
                      }
                    />
                    Obligatorio
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card space-y-3 p-4">
          <h2 className="font-display text-sm font-semibold">Comportamiento</h2>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.double_opt_in}
              onChange={(e) => set("double_opt_in", e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Doble opt-in
              <span className="block text-xs text-muted">
                Envía un correo de confirmación. Muy recomendable: protege tu
                reputación de envío y evita altas fraudulentas.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
            />
            Formulario activo
          </label>
        </div>

        {lists.length > 0 && (
          <div className="card p-4">
            <h2 className="label">Añadir a listas</h2>
            <div className="flex flex-wrap gap-1.5">
              {lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() =>
                    set(
                      "target_list_ids",
                      state.target_list_ids.includes(l.id)
                        ? state.target_list_ids.filter((x) => x !== l.id)
                        : [...state.target_list_ids, l.id],
                    )
                  }
                  className={`badge border ${
                    state.target_list_ids.includes(l.id)
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

        {tags.length > 0 && (
          <div className="card p-4">
            <h2 className="label">Aplicar etiquetas</h2>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    set(
                      "target_tag_ids",
                      state.target_tag_ids.includes(t.id)
                        ? state.target_tag_ids.filter((x) => x !== t.id)
                        : [...state.target_tag_ids, t.id],
                    )
                  }
                  className={`badge border ${
                    state.target_tag_ids.includes(t.id)
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

        {formId && (
          <div className="card p-4">
            <h2 className="label">Insertar en tu web</h2>
            <textarea
              readOnly
              rows={4}
              className="input font-mono text-[10px]"
              value={`<iframe src="${embedUrl}" width="100%" height="380" frameborder="0" style="border:0;" title="Suscríbete"></iframe>`}
              onFocus={(e) => e.currentTarget.select()}
            />
            <p className="mt-1.5 text-xs text-muted">
              Pega este código en somosacida.com.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {error && <p className="text-sm text-danger">{error}</p>}
          {saved && <p className="text-sm text-success">Guardado.</p>}
          <button onClick={save} className="btn-primary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar formulario"}
          </button>
          {formId && (
            <button onClick={remove} className="btn-ghost text-danger" disabled={pending}>
              Eliminar formulario
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
