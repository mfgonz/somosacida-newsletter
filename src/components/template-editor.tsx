"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Designer } from "@/components/designer/designer";
import { saveTemplate, deleteTemplate } from "@/app/(admin)/templates/actions";
import { parseDesign, type Design } from "@/lib/email/blocks";

export function TemplateEditor({
  templateId,
  initialName,
  initialDesign,
}: {
  templateId?: string;
  initialName: string;
  initialDesign: unknown;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [design, setDesign] = useState<Design>(() => parseDesign(initialDesign));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setError("");
    setSaved(false);
    start(async () => {
      const result = await saveTemplate({ id: templateId, name, design });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (templateId) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/templates/${result.id}`);
      }
    });
  }

  function remove() {
    if (!templateId) return;
    start(async () => {
      const result = await deleteTemplate(templateId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/templates");
    });
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs font-display text-lg font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la plantilla"
        />
        <div className="ml-auto flex items-center gap-2">
          {saved && <span className="text-sm text-success">Guardada</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
          {templateId && (
            <button
              onClick={remove}
              className="btn-ghost text-danger"
              disabled={pending}
            >
              Eliminar
            </button>
          )}
          <button onClick={save} className="btn-primary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <Designer design={design} onChange={setDesign} />
    </>
  );
}
