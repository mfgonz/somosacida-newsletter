"use client";

import type { Block, DesignSettings } from "@/lib/email/blocks";
import { AVAILABLE_MERGE_TAGS } from "@/lib/email/render";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded border border-line"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input font-mono text-xs"
      />
    </div>
  );
}

function AlignInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "left" | "center" | "right") => void;
}) {
  return (
    <div className="flex gap-1">
      {(["left", "center", "right"] as const).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={`flex-1 rounded border px-2 py-1.5 text-xs ${
            value === a
              ? "border-ink bg-ink text-white"
              : "border-line text-muted hover:bg-canvas"
          }`}
        >
          {a === "left" ? "Izq." : a === "center" ? "Centro" : "Der."}
        </button>
      ))}
    </div>
  );
}

export function Inspector({
  block,
  settings,
  onBlockChange,
  onSettingsChange,
}: {
  block: Block | null;
  settings: DesignSettings;
  onBlockChange: (patch: Partial<Block>) => void;
  onSettingsChange: (patch: Partial<DesignSettings>) => void;
}) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const set = (patch: Record<string, unknown>) => onBlockChange(patch as any);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (!block) {
    return (
      <div className="card p-4">
        <h3 className="mb-3 font-display text-sm font-semibold">
          Estilo del correo
        </h3>
        <div className="space-y-3">
          <Field label="Fondo">
            <ColorInput
              value={settings.background}
              onChange={(background) => onSettingsChange({ background })}
            />
          </Field>
          <Field label="Superficie">
            <ColorInput
              value={settings.surface}
              onChange={(surface) => onSettingsChange({ surface })}
            />
          </Field>
          <Field label="Color de texto">
            <ColorInput
              value={settings.textColor}
              onChange={(textColor) => onSettingsChange({ textColor })}
            />
          </Field>
          <Field label={`Ancho: ${settings.contentWidth}px`}>
            <input
              type="range"
              min={320}
              max={800}
              step={20}
              value={settings.contentWidth}
              onChange={(e) =>
                onSettingsChange({ contentWidth: Number(e.target.value) })
              }
              className="w-full"
            />
          </Field>
          <Field label={`Margen interior: ${settings.padding}px`}>
            <input
              type="range"
              min={0}
              max={60}
              step={4}
              value={settings.padding}
              onChange={(e) =>
                onSettingsChange({ padding: Number(e.target.value) })
              }
              className="w-full"
            />
          </Field>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <h4 className="label">Etiquetas personalizables</h4>
          <ul className="space-y-1">
            {AVAILABLE_MERGE_TAGS.map((t) => (
              <li key={t.tag} className="flex justify-between text-[11px]">
                <code className="font-mono text-ink-soft">{t.tag}</code>
                <span className="text-muted">{t.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Pégalas en cualquier texto y se sustituyen al enviar.
          </p>
        </div>

        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Selecciona un bloque para editar sus propiedades.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <h3 className="font-display text-sm font-semibold">Propiedades</h3>

      {block.type === "heading" && (
        <>
          <Field label="Texto">
            <input
              className="input"
              value={block.text}
              onChange={(e) => set({ text: e.target.value })}
            />
          </Field>
          <Field label="Nivel">
            <select
              className="input"
              value={block.level}
              onChange={(e) => set({ level: Number(e.target.value) })}
            >
              <option value={1}>Título grande</option>
              <option value={2}>Título medio</option>
              <option value={3}>Título pequeño</option>
            </select>
          </Field>
          <Field label="Alineación">
            <AlignInput value={block.align} onChange={(align) => set({ align })} />
          </Field>
          <Field label="Color">
            <ColorInput value={block.color} onChange={(color) => set({ color })} />
          </Field>
        </>
      )}

      {block.type === "text" && (
        <>
          <Field
            label="Contenido"
            hint="Admite HTML básico: <p>, <strong>, <em>, <a>, listas."
          >
            <textarea
              className="input resize-y font-mono text-xs"
              rows={7}
              value={block.html}
              onChange={(e) => set({ html: e.target.value })}
            />
          </Field>
          <Field label={`Tamaño: ${block.fontSize}px`}>
            <input
              type="range"
              min={10}
              max={32}
              value={block.fontSize}
              onChange={(e) => set({ fontSize: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label="Alineación">
            <AlignInput value={block.align} onChange={(align) => set({ align })} />
          </Field>
          <Field label="Color">
            <ColorInput value={block.color} onChange={(color) => set({ color })} />
          </Field>
        </>
      )}

      {block.type === "image" && (
        <>
          <Field label="URL de la imagen" hint="Debe empezar por https://">
            <input
              className="input"
              value={block.src}
              placeholder="https://…"
              onChange={(e) => set({ src: e.target.value })}
            />
          </Field>
          <Field
            label="Texto alternativo"
            hint="Se muestra si el cliente de correo bloquea imágenes."
          >
            <input
              className="input"
              value={block.alt}
              onChange={(e) => set({ alt: e.target.value })}
            />
          </Field>
          <Field label="Enlace (opcional)">
            <input
              className="input"
              value={block.href}
              placeholder="https://…"
              onChange={(e) => set({ href: e.target.value })}
            />
          </Field>
          <Field label={`Ancho: ${block.width}%`}>
            <input
              type="range"
              min={10}
              max={100}
              value={block.width}
              onChange={(e) => set({ width: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label="Alineación">
            <AlignInput value={block.align} onChange={(align) => set({ align })} />
          </Field>
        </>
      )}

      {block.type === "button" && (
        <>
          <Field label="Texto">
            <input
              className="input"
              value={block.label}
              onChange={(e) => set({ label: e.target.value })}
            />
          </Field>
          <Field label="Enlace" hint="Debe empezar por https:// o mailto:">
            <input
              className="input"
              value={block.href}
              placeholder="https://…"
              onChange={(e) => set({ href: e.target.value })}
            />
          </Field>
          <Field label="Fondo">
            <ColorInput
              value={block.background}
              onChange={(background) => set({ background })}
            />
          </Field>
          <Field label="Color del texto">
            <ColorInput value={block.color} onChange={(color) => set({ color })} />
          </Field>
          <Field label={`Redondeo: ${block.radius}px`}>
            <input
              type="range"
              min={0}
              max={40}
              value={block.radius}
              onChange={(e) => set({ radius: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.fullWidth}
              onChange={(e) => set({ fullWidth: e.target.checked })}
            />
            Ancho completo
          </label>
          <Field label="Alineación">
            <AlignInput value={block.align} onChange={(align) => set({ align })} />
          </Field>
        </>
      )}

      {block.type === "divider" && (
        <>
          <Field label="Color">
            <ColorInput value={block.color} onChange={(color) => set({ color })} />
          </Field>
          <Field label={`Grosor: ${block.thickness}px`}>
            <input
              type="range"
              min={1}
              max={8}
              value={block.thickness}
              onChange={(e) => set({ thickness: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </>
      )}

      {block.type === "spacer" && (
        <Field label={`Altura: ${block.height}px`}>
          <input
            type="range"
            min={4}
            max={120}
            step={4}
            value={block.height}
            onChange={(e) => set({ height: Number(e.target.value) })}
            className="w-full"
          />
        </Field>
      )}

      {block.type === "columns" && (
        <>
          <Field label="Número de columnas">
            <select
              className="input"
              value={block.columns.length}
              onChange={(e) => {
                const n = Number(e.target.value);
                const cols = Array.from({ length: n }, (_, i) =>
                  block.columns[i] ?? { html: "<p>Columna</p>" },
                );
                set({ columns: cols });
              }}
            >
              <option value={2}>2 columnas</option>
              <option value={3}>3 columnas</option>
            </select>
          </Field>
          {block.columns.map((c, i) => (
            <Field key={i} label={`Columna ${i + 1}`}>
              <textarea
                className="input resize-y font-mono text-xs"
                rows={4}
                value={c.html}
                onChange={(e) => {
                  const cols = [...block.columns];
                  cols[i] = { html: e.target.value };
                  set({ columns: cols });
                }}
              />
            </Field>
          ))}
          <Field label={`Separación: ${block.gap}px`}>
            <input
              type="range"
              min={0}
              max={40}
              value={block.gap}
              onChange={(e) => set({ gap: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </>
      )}

      {block.type === "social" && (
        <>
          {block.links.map((l, i) => (
            <div key={i} className="space-y-1.5 rounded border border-line p-2">
              <input
                className="input"
                placeholder="Nombre (Instagram)"
                value={l.label}
                onChange={(e) => {
                  const links = [...block.links];
                  links[i] = { ...l, label: e.target.value };
                  set({ links });
                }}
              />
              <input
                className="input"
                placeholder="https://…"
                value={l.href}
                onChange={(e) => {
                  const links = [...block.links];
                  links[i] = { ...l, href: e.target.value };
                  set({ links });
                }}
              />
              <button
                type="button"
                className="text-xs text-muted hover:text-danger"
                onClick={() =>
                  set({ links: block.links.filter((_, j) => j !== i) })
                }
              >
                Quitar
              </button>
            </div>
          ))}
          {block.links.length < 8 && (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() =>
                set({ links: [...block.links, { label: "", href: "" }] })
              }
            >
              + Añadir red
            </button>
          )}
          <Field label="Alineación">
            <AlignInput value={block.align} onChange={(align) => set({ align })} />
          </Field>
        </>
      )}

      {block.type === "html" && (
        <Field
          label="HTML"
          hint="Se limpia automáticamente: se eliminan scripts y atributos peligrosos."
        >
          <textarea
            className="input resize-y font-mono text-xs"
            rows={10}
            value={block.html}
            onChange={(e) => set({ html: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}
