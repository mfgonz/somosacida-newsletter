"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { importContacts, type ImportSummary } from "@/app/(admin)/contacts/import/actions";

const TARGET_FIELDS = [
  { key: "", label: "— Ignorar —" },
  { key: "email", label: "Email (obligatorio)" },
  { key: "first_name", label: "Nombre" },
  { key: "last_name", label: "Apellido" },
  { key: "company", label: "Empresa" },
  { key: "phone", label: "Teléfono" },
] as const;

const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Best-effort guess so the common export formats need no manual mapping. */
function guessField(header: string): string {
  const h = header.toLowerCase().replace(/[\s_-]/g, "");
  if (/^(e?mail|correo|emailaddress)$/.test(h)) return "email";
  if (/^(first|firstname|nombre|name|givenname)$/.test(h)) return "first_name";
  if (/^(last|lastname|apellidos?|surname|familyname)$/.test(h)) return "last_name";
  if (/^(company|empresa|organization|organisation|negocio)$/.test(h)) return "company";
  if (/^(phone|telefono|tel|mobile|movil|celular)$/.test(h)) return "phone";
  return "";
}

export function ImportWizard({
  tags,
  lists,
}: {
  tags: { id: string; name: string; color: string }[];
  lists: { id: string; name: string }[];
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [status, setStatus] = useState<"subscribed" | "pending">("subscribed");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [listIds, setListIds] = useState<string[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  const [pending, start] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSummary(null);

    if (file.size > MAX_FILE_BYTES) {
      setError("El archivo supera los 15 MB.");
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = result.meta.fields ?? [];
        if (!fields.length) {
          setError("No se detectaron columnas. ¿El CSV tiene fila de cabecera?");
          return;
        }
        setHeaders(fields);
        setRows(result.data);
        setFileName(file.name);
        setMapping(
          Object.fromEntries(fields.map((f) => [f, guessField(f)])),
        );
      },
      error: () => setError("No se pudo leer el archivo."),
    });
  }

  const emailColumn = Object.entries(mapping).find(([, v]) => v === "email")?.[0];

  function runImport() {
    if (!emailColumn) {
      setError("Debes asignar una columna al campo Email.");
      return;
    }
    setError("");

    const mapped = rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (field) out[field] = row[header] ?? "";
      }
      return out;
    });

    start(async () => {
      const result = await importContacts({
        rows: mapped,
        status,
        tagIds,
        listIds,
        updateExisting,
        source: `csv:${fileName}`,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result);
      setRows([]);
      setHeaders([]);
    });
  }

  if (summary) {
    return (
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Importación completada</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Nuevos</dt>
            <dd className="font-display text-2xl font-bold">{summary.inserted}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Actualizados</dt>
            <dd className="font-display text-2xl font-bold">{summary.updated}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Omitidos</dt>
            <dd className="font-display text-2xl font-bold">{summary.skipped}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-muted">
          Se omiten los duplicados y cualquier email en la lista de supresión
          (bajas, rebotes y quejas previas).
        </p>

        {summary.invalid.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-warning">
              {summary.invalid.length} email(s) con formato inválido:
            </p>
            <p className="mt-1 break-all text-xs text-muted">
              {summary.invalid.slice(0, 20).join(", ")}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Link href="/contacts" className="btn-primary">
            Ver contactos
          </Link>
          <button onClick={() => setSummary(null)} className="btn-secondary">
            Importar otro archivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <label className="label" htmlFor="csv">
          Archivo CSV
        </label>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="input file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        <p className="mt-2 text-xs text-muted">
          La primera fila debe contener los nombres de las columnas. Máximo 15 MB.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</p>
      )}

      {headers.length > 0 && (
        <>
          <div className="card p-6">
            <h2 className="mb-1 font-display text-sm font-semibold">
              Asignar columnas
            </h2>
            <p className="mb-4 text-xs text-muted">
              {rows.length.toLocaleString("es-ES")} fila(s) detectadas en {fileName}.
            </p>

            <div className="space-y-2">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="w-1/2 truncate text-sm" title={h}>
                    {h}
                    <span className="block truncate text-xs text-muted">
                      {rows[0]?.[h] || "—"}
                    </span>
                  </span>
                  <select
                    className="input w-1/2"
                    value={mapping[h] ?? ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [h]: e.target.value })
                    }
                  >
                    {TARGET_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="font-display text-sm font-semibold">Opciones</h2>

            <div>
              <label className="label" htmlFor="status">
                Estado inicial
              </label>
              <select
                id="status"
                className="input"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "subscribed" | "pending")
                }
              >
                <option value="subscribed">
                  Suscrito — ya dieron su consentimiento
                </option>
                <option value="pending">
                  Pendiente — enviar confirmación (doble opt-in)
                </option>
              </select>
            </div>

            {tags.length > 0 && (
              <div>
                <span className="label">Aplicar etiquetas</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setTagIds((prev) =>
                          prev.includes(t.id)
                            ? prev.filter((x) => x !== t.id)
                            : [...prev, t.id],
                        )
                      }
                      className="badge border"
                      style={
                        tagIds.includes(t.id)
                          ? { backgroundColor: t.color, borderColor: t.color, color: "#fff" }
                          : { borderColor: "#E4E4E7", color: "#71717A" }
                      }
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lists.length > 0 && (
              <div>
                <span className="label">Añadir a listas</span>
                <div className="flex flex-wrap gap-1.5">
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        setListIds((prev) =>
                          prev.includes(l.id)
                            ? prev.filter((x) => x !== l.id)
                            : [...prev, l.id],
                        )
                      }
                      className={`badge border ${
                        listIds.includes(l.id)
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

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Completar datos de contactos existentes
                <span className="block text-xs text-muted">
                  Solo rellena campos vacíos; nunca sobrescribe información.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-md bg-canvas p-3 text-sm">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Confirmo que estas personas dieron su consentimiento para recibir
                mis correos.
                <span className="block text-xs text-muted">
                  Importar listas compradas o sin consentimiento daña tu
                  reputación de envío y puede infringir el RGPD.
                </span>
              </span>
            </label>
          </div>

          <button
            onClick={runImport}
            className="btn-primary"
            disabled={pending || !emailColumn || !consentConfirmed}
          >
            {pending
              ? "Importando…"
              : `Importar ${rows.length.toLocaleString("es-ES")} contacto(s)`}
          </button>

          {!emailColumn && (
            <p className="text-xs text-warning">
              Asigna una columna al campo Email para continuar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
