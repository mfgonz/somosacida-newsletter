"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Designer } from "@/components/designer/designer";
import {
  saveCampaign,
  previewAudienceSize,
  sendTestEmail,
  launchCampaign,
  type Audience,
} from "@/app/(admin)/campaigns/actions";
import { parseDesign, type Design } from "@/lib/email/blocks";

type Option = { id: string; name: string };

export function CampaignEditor({
  campaignId,
  initial,
  segments,
  lists,
  tags,
  templates,
  editable,
}: {
  campaignId?: string;
  initial: {
    name: string;
    subject: string;
    preheader: string;
    design: unknown;
    audience: Audience;
  };
  segments: Option[];
  lists: Option[];
  tags: Option[];
  templates: { id: string; name: string; design: unknown }[];
  editable: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"design" | "settings">("design");

  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const [preheader, setPreheader] = useState(initial.preheader);
  const [design, setDesign] = useState<Design>(() => parseDesign(initial.design));
  const [audience, setAudience] = useState<Audience>(initial.audience);

  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    previewAudienceSize(audience).then((r) => {
      if (!cancelled) setAudienceCount(r.ok ? r.count : null);
    });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  function persist(): Promise<string | null> {
    return saveCampaign({
      id: campaignId,
      name,
      subject,
      preheader,
      design,
      audience,
    }).then((r) => {
      if (!r.ok) {
        setError(r.error);
        return null;
      }
      return r.id;
    });
  }

  function onSave() {
    setError("");
    setMessage("");
    start(async () => {
      const id = await persist();
      if (!id) return;
      if (campaignId) {
        setMessage("Guardada.");
        router.refresh();
      } else {
        router.push(`/campaigns/${id}`);
      }
    });
  }

  function onTest() {
    setError("");
    setMessage("");
    start(async () => {
      const id = await persist();
      if (!id) return;
      const r = await sendTestEmail(id, testEmail);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMessage(`Correo de prueba enviado a ${testEmail}.`);
    });
  }

  function onLaunch() {
    setError("");
    setMessage("");
    const when = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const label = when
      ? `¿Programar el envío para ${new Date(scheduledAt).toLocaleString("es-ES")}?`
      : `¿Enviar ahora a ${audienceCount ?? "?"} contacto(s)? Esta acción no se puede deshacer.`;

    if (!window.confirm(label)) return;

    start(async () => {
      const id = await persist();
      if (!id) return;
      const r = await launchCampaign(id, { scheduledAt: when });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/campaigns/${id}`);
      router.refresh();
    });
  }

  function applyTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    if (
      design.blocks.length &&
      !window.confirm("Se reemplazará el diseño actual. ¿Continuar?")
    ) {
      return;
    }
    setDesign(parseDesign(t.design));
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs font-display text-lg font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre interno"
          disabled={!editable}
        />

        <div className="flex rounded-md border border-line p-0.5">
          {(["design", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                tab === t ? "bg-ink text-white" : "text-muted hover:bg-canvas"
              }`}
            >
              {t === "design" ? "Diseño" : "Envío"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {message && <span className="text-sm text-success">{message}</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
          {editable && (
            <button onClick={onSave} className="btn-secondary" disabled={pending}>
              {pending ? "…" : "Guardar"}
            </button>
          )}
        </div>
      </div>

      {tab === "design" ? (
        <>
          {editable && templates.length > 0 && (
            <div className="mb-3">
              <select
                className="input max-w-xs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">Aplicar una plantilla…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Designer design={design} onChange={setDesign} />
        </>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="card space-y-4 p-6">
            <h2 className="font-display text-sm font-semibold">Contenido</h2>

            <div>
              <label className="label" htmlFor="subject">
                Asunto
              </label>
              <input
                id="subject"
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Lo que verán en la bandeja de entrada"
                disabled={!editable}
                maxLength={250}
              />
              <p className="mt-1 text-xs text-muted">
                Puedes usar {"{{first_name}}"} para personalizarlo.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="preheader">
                Texto de vista previa
              </label>
              <input
                id="preheader"
                className="input"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Se muestra junto al asunto en la bandeja"
                disabled={!editable}
                maxLength={250}
              />
            </div>
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="font-display text-sm font-semibold">Audiencia</h2>

            <select
              className="input"
              value={JSON.stringify(audience)}
              onChange={(e) => setAudience(JSON.parse(e.target.value))}
              disabled={!editable}
            >
              <option value='{"type":"all"}'>Todos los suscriptores</option>
              {segments.map((s) => (
                <option
                  key={s.id}
                  value={JSON.stringify({ type: "segment", segmentId: s.id })}
                >
                  Segmento: {s.name}
                </option>
              ))}
              {lists.map((l) => (
                <option
                  key={l.id}
                  value={JSON.stringify({ type: "list", listId: l.id })}
                >
                  Lista: {l.name}
                </option>
              ))}
              {tags.map((t) => (
                <option
                  key={t.id}
                  value={JSON.stringify({ type: "tag", tagId: t.id })}
                >
                  Etiqueta: {t.name}
                </option>
              ))}
            </select>

            <p className="text-sm">
              {audienceCount === null ? (
                <span className="text-muted">Calculando destinatarios…</span>
              ) : (
                <span>
                  <strong>{audienceCount.toLocaleString("es-ES")}</strong>{" "}
                  contacto(s) recibirán este envío.
                </span>
              )}
            </p>
            <p className="text-xs text-muted">
              Solo se incluyen contactos suscritos. Las bajas, los rebotes y
              quienes marcaron spam se excluyen automáticamente.
            </p>
          </div>

          {editable && (
            <>
              <div className="card space-y-3 p-6">
                <h2 className="font-display text-sm font-semibold">
                  Enviar una prueba
                </h2>
                <div className="flex gap-2">
                  <input
                    type="email"
                    className="input"
                    placeholder="tu@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <button
                    onClick={onTest}
                    className="btn-secondary shrink-0"
                    disabled={pending || !testEmail}
                  >
                    Enviar prueba
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Revisa siempre una prueba antes del envío real.
                </p>
              </div>

              <div className="card space-y-3 p-6">
                <h2 className="font-display text-sm font-semibold">Programar</h2>
                <input
                  type="datetime-local"
                  className="input"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-muted">
                  Déjalo vacío para enviar inmediatamente.
                </p>
                <button
                  onClick={onLaunch}
                  className="btn-primary w-full"
                  disabled={pending || !audienceCount}
                >
                  {pending
                    ? "Procesando…"
                    : scheduledAt
                      ? "Programar envío"
                      : "Enviar ahora"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
