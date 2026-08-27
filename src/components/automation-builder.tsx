"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Designer } from "@/components/designer/designer";
import {
  saveAutomation,
  deleteAutomation,
} from "@/app/(admin)/automations/actions";
import { parseDesign, type Design } from "@/lib/email/blocks";
import { starterDesign } from "@/lib/email/starter";

type StepType = "wait" | "email" | "tag";

export type Step = {
  step_type: StepType;
  wait_minutes: number;
  subject: string;
  design: Design;
  tag_id: string | null;
};

export type AutomationState = {
  name: string;
  trigger_type: "contact_created" | "tag_added" | "list_joined" | "form_submitted";
  trigger_config: Record<string, string>;
  is_active: boolean;
  steps: Step[];
};

const TRIGGERS = [
  { value: "contact_created", label: "Cuando alguien se suscribe" },
  { value: "form_submitted", label: "Cuando envían un formulario" },
  { value: "tag_added", label: "Cuando recibe una etiqueta" },
  { value: "list_joined", label: "Cuando se une a una lista" },
] as const;

const DELAY_PRESETS = [
  { minutes: 0, label: "Inmediatamente" },
  { minutes: 60, label: "1 hora después" },
  { minutes: 1440, label: "1 día después" },
  { minutes: 4320, label: "3 días después" },
  { minutes: 10080, label: "1 semana después" },
];

export function AutomationBuilder({
  automationId,
  initial,
  tags,
  lists,
  forms,
}: {
  automationId?: string;
  initial: AutomationState;
  tags: { id: string; name: string }[];
  lists: { id: string; name: string }[];
  forms: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function setStep(i: number, patch: Partial<Step>) {
    setState((s) => ({
      ...s,
      steps: s.steps.map((st, j) => (j === i ? { ...st, ...patch } : st)),
    }));
  }

  function addStep(type: StepType) {
    setState((s) => ({
      ...s,
      steps: [
        ...s.steps,
        {
          step_type: type,
          wait_minutes: s.steps.length === 0 ? 0 : 1440,
          subject: "",
          design: parseDesign(starterDesign()),
          tag_id: null,
        },
      ],
    }));
    setOpenStep(state.steps.length);
  }

  function save() {
    setError("");
    setSaved(false);
    start(async () => {
      const r = await saveAutomation(state, automationId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (automationId) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/automations/${r.id}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            className="input"
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="trigger">
            Disparador
          </label>
          <select
            id="trigger"
            className="input"
            value={state.trigger_type}
            onChange={(e) =>
              setState({
                ...state,
                trigger_type: e.target.value as AutomationState["trigger_type"],
                trigger_config: {},
              })
            }
          >
            {TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {state.trigger_type === "tag_added" && tags.length > 0 && (
          <div>
            <label className="label" htmlFor="tag">
              Etiqueta
            </label>
            <select
              id="tag"
              className="input"
              value={state.trigger_config.tagId ?? ""}
              onChange={(e) =>
                setState({ ...state, trigger_config: { tagId: e.target.value } })
              }
            >
              <option value="">Cualquiera</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {state.trigger_type === "list_joined" && lists.length > 0 && (
          <div>
            <label className="label" htmlFor="list">
              Lista
            </label>
            <select
              id="list"
              className="input"
              value={state.trigger_config.listId ?? ""}
              onChange={(e) =>
                setState({ ...state, trigger_config: { listId: e.target.value } })
              }
            >
              <option value="">Cualquiera</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {state.trigger_type === "form_submitted" && forms.length > 0 && (
          <div>
            <label className="label" htmlFor="form">
              Formulario
            </label>
            <select
              id="form"
              className="input"
              value={state.trigger_config.formSlug ?? ""}
              onChange={(e) =>
                setState({ ...state, trigger_config: { formSlug: e.target.value } })
              }
            >
              <option value="">Cualquiera</option>
              {forms.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.is_active}
            onChange={(e) => setState({ ...state, is_active: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            Automatización activa
            <span className="block text-xs text-muted">
              Mientras esté pausada nadie nuevo entra en la secuencia.
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-3">
        {state.steps.map((step, i) => (
          <div key={i} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge bg-ink text-white">{i + 1}</span>

              <select
                className="input max-w-[180px]"
                value={step.wait_minutes}
                onChange={(e) =>
                  setStep(i, { wait_minutes: Number(e.target.value) })
                }
              >
                {DELAY_PRESETS.map((d) => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </select>

              <span className="text-sm font-medium">
                {step.step_type === "email"
                  ? "Enviar correo"
                  : step.step_type === "tag"
                    ? "Aplicar etiqueta"
                    : "Esperar"}
              </span>

              <div className="ml-auto flex gap-2">
                {step.step_type === "email" && (
                  <button
                    onClick={() => setOpenStep(openStep === i ? null : i)}
                    className="text-xs text-muted hover:text-ink"
                  >
                    {openStep === i ? "Cerrar" : "Editar correo"}
                  </button>
                )}
                <button
                  onClick={() =>
                    setState({
                      ...state,
                      steps: state.steps.filter((_, j) => j !== i),
                    })
                  }
                  className="text-xs text-muted hover:text-danger"
                >
                  Quitar
                </button>
              </div>
            </div>

            {step.step_type === "email" && (
              <div className="mt-3">
                <input
                  className="input"
                  placeholder="Asunto del correo"
                  value={step.subject}
                  onChange={(e) => setStep(i, { subject: e.target.value })}
                />
                {openStep === i && (
                  <div className="mt-4 border-t border-line pt-4">
                    <Designer
                      design={step.design}
                      onChange={(design) => setStep(i, { design })}
                    />
                  </div>
                )}
              </div>
            )}

            {step.step_type === "tag" && (
              <select
                className="input mt-3"
                value={step.tag_id ?? ""}
                onChange={(e) => setStep(i, { tag_id: e.target.value || null })}
              >
                <option value="">Elige una etiqueta…</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => addStep("email")} className="btn-secondary">
            + Correo
          </button>
          <button onClick={() => addStep("tag")} className="btn-secondary">
            + Etiqueta
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {error && <span className="text-sm text-danger">{error}</span>}
        {saved && <span className="text-sm text-success">Guardada.</span>}
        <button onClick={save} className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar automatización"}
        </button>
        {automationId && (
          <button
            onClick={() => {
              if (!window.confirm("¿Eliminar esta automatización?")) return;
              start(async () => {
                await deleteAutomation(automationId);
                router.push("/automations");
              });
            }}
            className="btn-ghost text-danger"
            disabled={pending}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
