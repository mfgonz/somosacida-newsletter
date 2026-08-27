"use client";

import type { Block, DesignSettings } from "@/lib/email/blocks";
import { sanitizeHtml } from "@/lib/email/sanitize";

/**
 * Approximates the rendered email inside the editor. The authoritative output
 * is src/lib/email/render.ts; this trades exactness for editability.
 */
export function BlockPreview({
  block,
  settings,
}: {
  block: Block;
  settings: DesignSettings;
}) {
  const pad = { paddingLeft: settings.padding, paddingRight: settings.padding };

  switch (block.type) {
    case "heading": {
      const sizes = { 1: 30, 2: 24, 3: 19 } as const;
      return (
        <div style={{ ...pad, paddingTop: 8, paddingBottom: 8 }}>
          <p
            style={{
              margin: 0,
              fontFamily: settings.fontFamily,
              fontSize: sizes[block.level],
              lineHeight: 1.25,
              fontWeight: 700,
              color: block.color,
              textAlign: block.align,
            }}
          >
            {block.text}
          </p>
        </div>
      );
    }

    case "text":
      return (
        <div
          style={{
            ...pad,
            paddingTop: 6,
            paddingBottom: 6,
            fontFamily: settings.fontFamily,
            fontSize: block.fontSize,
            lineHeight: 1.6,
            color: block.color,
            textAlign: block.align,
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
        />
      );

    case "image":
      return (
        <div
          style={{ ...pad, paddingTop: 10, paddingBottom: 10, textAlign: block.align }}
        >
          {block.src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={block.src}
              alt={block.alt}
              style={{
                width: `${block.width}%`,
                maxWidth: "100%",
                height: "auto",
                display: "inline-block",
              }}
            />
          ) : (
            <div className="rounded border border-dashed border-line py-8 text-xs text-muted">
              Añade la URL de una imagen
            </div>
          )}
        </div>
      );

    case "button":
      return (
        <div style={{ ...pad, paddingTop: 14, paddingBottom: 14, textAlign: block.align }}>
          <span
            style={{
              display: "inline-block",
              padding: "13px 26px",
              backgroundColor: block.background,
              color: block.color,
              borderRadius: block.radius,
              fontFamily: settings.fontFamily,
              fontSize: 15,
              fontWeight: 700,
              width: block.fullWidth ? "100%" : undefined,
              textAlign: "center",
            }}
          >
            {block.label}
          </span>
          {!block.href && (
            <p className="mt-1 text-[10px] text-warning">Falta el enlace</p>
          )}
        </div>
      );

    case "divider":
      return (
        <div style={{ ...pad, paddingTop: 12, paddingBottom: 12 }}>
          <div
            style={{ borderTop: `${block.thickness}px solid ${block.color}` }}
          />
        </div>
      );

    case "spacer":
      return <div style={{ height: block.height }} />;

    case "columns":
      return (
        <div
          style={{
            ...pad,
            paddingTop: 8,
            paddingBottom: 8,
            display: "flex",
            gap: block.gap,
          }}
        >
          {block.columns.map((c, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                fontFamily: settings.fontFamily,
                fontSize: 15,
                lineHeight: 1.6,
                color: settings.textColor,
              }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.html) }}
            />
          ))}
        </div>
      );

    case "social":
      return (
        <div
          style={{
            ...pad,
            paddingTop: 12,
            paddingBottom: 12,
            textAlign: block.align,
            fontFamily: settings.fontFamily,
            fontSize: 13,
            color: block.color,
          }}
        >
          {block.links.length ? (
            block.links.map((l, i) => (
              <span key={i} style={{ padding: "0 8px" }}>
                {l.label}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted">Añade tus redes sociales</span>
          )}
        </div>
      );

    case "html":
      return block.html ? (
        <div
          style={{ ...pad, fontFamily: settings.fontFamily, color: settings.textColor }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
        />
      ) : (
        <div className="px-4 py-6 text-center text-xs text-muted">
          Bloque HTML vacío
        </div>
      );
  }
}
