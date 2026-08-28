"use client";

import { useState, useRef, useCallback } from "react";

/**
 * Drag-and-drop (or click-to-browse) image upload.
 * Posts to /api/uploads and hands back the stored public URL.
 */
export function ImageDrop({
  onUploaded,
  compact = false,
}: {
  onUploaded: (url: string) => void;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError("");
      setBusy(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "No se pudo subir la imagen.");
          return;
        }
        onUploaded(data.url);
      } catch {
        setError("Error de red al subir la imagen.");
      } finally {
        setBusy(false);
      }
    },
    [onUploaded],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-center transition ${
          compact ? "px-3 py-4" : "px-4 py-7"
        } ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-line hover:border-ink hover:bg-canvas"
        }`}
      >
        {busy ? (
          <span className="text-xs text-muted">Subiendo…</span>
        ) : (
          <>
            <span className="text-sm font-medium">
              {dragging ? "Suelta la imagen" : "Arrastra una imagen aquí"}
            </span>
            <span className="mt-0.5 text-[11px] text-muted">
              o haz clic para elegir · PNG, JPG, GIF, WebP · máx. 10 MB
            </span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
