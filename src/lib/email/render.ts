import type { Block, Design } from "@/lib/email/blocks";
import { sanitizeHtml, escapeHtml, escapeAttr, htmlToText } from "@/lib/email/sanitize";

/**
 * Renders a design to table-based HTML that survives Outlook, Gmail and Apple
 * Mail. No flexbox, no grid, no external stylesheets — inline styles only.
 */

export type MergeContext = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  company?: string | null;
  unsubscribeUrl: string;
  preferencesUrl: string;
  webviewUrl?: string;
  organizationName: string;
  postalAddress: string;
};

const MERGE_TAGS: { tag: string; label: string }[] = [
  { tag: "{{first_name}}", label: "Nombre" },
  { tag: "{{last_name}}", label: "Apellido" },
  { tag: "{{email}}", label: "Email" },
  { tag: "{{company}}", label: "Empresa" },
  { tag: "{{unsubscribe_url}}", label: "Enlace de baja" },
  { tag: "{{preferences_url}}", label: "Preferencias" },
];

export const AVAILABLE_MERGE_TAGS = MERGE_TAGS;

/**
 * Substitutes merge tags. Values are HTML-escaped, so a contact whose name
 * contains markup cannot inject it into the message body.
 */
export function applyMergeTags(input: string, ctx: MergeContext): string {
  return input
    .replace(/\{\{\s*first_name\s*\}\}/g, escapeHtml(ctx.firstName || ""))
    .replace(/\{\{\s*last_name\s*\}\}/g, escapeHtml(ctx.lastName || ""))
    .replace(/\{\{\s*email\s*\}\}/g, escapeHtml(ctx.email))
    .replace(/\{\{\s*company\s*\}\}/g, escapeHtml(ctx.company || ""))
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, escapeAttr(ctx.unsubscribeUrl))
    .replace(/\{\{\s*preferences_url\s*\}\}/g, escapeAttr(ctx.preferencesUrl))
    .replace(/\{\{\s*organization\s*\}\}/g, escapeHtml(ctx.organizationName));
}

function renderBlock(block: Block, s: Design["settings"]): string {
  const pad = `padding:0 ${s.padding}px;`;

  switch (block.type) {
    case "heading": {
      const sizes = { 1: 30, 2: 24, 3: 19 } as const;
      return `<tr><td style="${pad}padding-top:8px;padding-bottom:8px;">
<h${block.level} style="margin:0;font-family:${escapeAttr(s.fontFamily)};font-size:${sizes[block.level]}px;line-height:1.25;font-weight:700;color:${block.color};text-align:${block.align};">${escapeHtml(block.text)}</h${block.level}>
</td></tr>`;
    }

    case "text":
      return `<tr><td style="${pad}padding-top:6px;padding-bottom:6px;font-family:${escapeAttr(s.fontFamily)};font-size:${block.fontSize}px;line-height:1.6;color:${block.color};text-align:${block.align};">
${sanitizeHtml(block.html)}
</td></tr>`;

    case "image": {
      if (!block.src) return "";
      const img = `<img src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt)}" width="${Math.round((s.contentWidth - s.padding * 2) * (block.width / 100))}" style="display:block;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;margin:${block.align === "center" ? "0 auto" : block.align === "right" ? "0 0 0 auto" : "0"};" />`;
      const wrapped = block.href
        ? `<a href="${escapeAttr(block.href)}" target="_blank" rel="noopener noreferrer">${img}</a>`
        : img;
      return `<tr><td style="${pad}padding-top:10px;padding-bottom:10px;text-align:${block.align};">${wrapped}</td></tr>`;
    }

    case "button": {
      if (!block.href) return "";
      // Rendered as a table so Outlook honours the background colour.
      return `<tr><td style="${pad}padding-top:14px;padding-bottom:14px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${block.align === "center" ? "0 auto" : block.align === "right" ? "0 0 0 auto" : "0"};${block.fullWidth ? "width:100%;" : ""}">
<tr><td align="center" style="background-color:${block.background};border-radius:${block.radius}px;">
<a href="${escapeAttr(block.href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-family:${escapeAttr(s.fontFamily)};font-size:15px;font-weight:700;color:${block.color};text-decoration:none;border-radius:${block.radius}px;${block.fullWidth ? "width:100%;text-align:center;" : ""}">${escapeHtml(block.label)}</a>
</td></tr></table></td></tr>`;
    }

    case "divider":
      return `<tr><td style="${pad}padding-top:12px;padding-bottom:12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:${block.thickness}px solid ${block.color};font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>`;

    case "spacer":
      return `<tr><td style="height:${block.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;

    case "columns": {
      const n = block.columns.length;
      const colWidth = Math.floor((s.contentWidth - s.padding * 2 - block.gap * (n - 1)) / n);
      const cells = block.columns
        .map(
          (c, i) =>
            `<td width="${colWidth}" valign="top" style="width:${colWidth}px;font-family:${escapeAttr(s.fontFamily)};font-size:15px;line-height:1.6;color:${s.textColor};${i < n - 1 ? `padding-right:${block.gap}px;` : ""}">${sanitizeHtml(c.html)}</td>`,
        )
        .join("");
      return `<tr><td style="${pad}padding-top:8px;padding-bottom:8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
</td></tr>`;
    }

    case "social": {
      if (!block.links.length) return "";
      const links = block.links
        .filter((l) => l.href)
        .map(
          (l) =>
            `<a href="${escapeAttr(l.href)}" target="_blank" rel="noopener noreferrer" style="color:${block.color};text-decoration:none;font-size:13px;padding:0 8px;">${escapeHtml(l.label)}</a>`,
        )
        .join("<span style=\"color:#D4D4D8;\">·</span>");
      return `<tr><td style="${pad}padding-top:12px;padding-bottom:12px;text-align:${block.align};font-family:${escapeAttr(s.fontFamily)};">${links}</td></tr>`;
    }

    case "html":
      if (!block.html) return "";
      return `<tr><td style="${pad}font-family:${escapeAttr(s.fontFamily)};color:${s.textColor};">${sanitizeHtml(block.html)}</td></tr>`;
  }
}

export function renderDesign(
  design: Design,
  ctx: MergeContext,
  opts: { preheader?: string | null; includeFooter?: boolean } = {},
): string {
  const { settings: s } = design;
  const { preheader, includeFooter = true } = opts;

  const body = design.blocks.map((b) => renderBlock(b, s)).join("\n");

  const footer = includeFooter
    ? `<tr><td style="padding:26px ${s.padding}px 8px;font-family:${escapeAttr(s.fontFamily)};font-size:12px;line-height:1.6;color:#8A8A93;text-align:center;">
<p style="margin:0 0 6px;">${escapeHtml(ctx.organizationName)}${ctx.postalAddress ? ` · ${escapeHtml(ctx.postalAddress)}` : ""}</p>
<p style="margin:0;">
<a href="${escapeAttr(ctx.unsubscribeUrl)}" style="color:#8A8A93;text-decoration:underline;">Darse de baja</a>
&nbsp;·&nbsp;
<a href="${escapeAttr(ctx.preferencesUrl)}" style="color:#8A8A93;text-decoration:underline;">Preferencias</a>
${ctx.webviewUrl ? `&nbsp;·&nbsp;<a href="${escapeAttr(ctx.webviewUrl)}" style="color:#8A8A93;text-decoration:underline;">Ver en el navegador</a>` : ""}
</p></td></tr>`
    : "";

  // The preheader is the preview line in the inbox list; it must be present in
  // the DOM but not visible when the message is opened.
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;}
  @media only screen and (max-width:620px){
    .sa-container{width:100% !important;}
    .sa-stack{display:block !important;width:100% !important;padding-right:0 !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${s.background};">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${s.background};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="sa-container" width="${s.contentWidth}" cellpadding="0" cellspacing="0" border="0" style="width:${s.contentWidth}px;max-width:100%;background-color:${s.surface};border-radius:12px;overflow:hidden;">
<tr><td style="height:${s.padding}px;font-size:0;line-height:0;">&nbsp;</td></tr>
${body}
<tr><td style="height:${s.padding}px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<table role="presentation" class="sa-container" width="${s.contentWidth}" cellpadding="0" cellspacing="0" border="0" style="width:${s.contentWidth}px;max-width:100%;">
${footer}
</table>
</td></tr></table>
</body></html>`;

  return applyMergeTags(html, ctx);
}

export function renderPlainText(design: Design, ctx: MergeContext): string {
  const parts: string[] = [];

  for (const b of design.blocks) {
    switch (b.type) {
      case "heading":
        parts.push(`\n${b.text.toUpperCase()}\n`);
        break;
      case "text":
        parts.push(htmlToText(b.html));
        break;
      case "button":
        if (b.href) parts.push(`${b.label}: ${b.href}`);
        break;
      case "image":
        if (b.alt) parts.push(`[${b.alt}]`);
        break;
      case "columns":
        parts.push(b.columns.map((c) => htmlToText(c.html)).join("\n\n"));
        break;
      case "social":
        parts.push(b.links.map((l) => `${l.label}: ${l.href}`).join("\n"));
        break;
      case "html":
        parts.push(htmlToText(b.html));
        break;
      case "divider":
        parts.push("---");
        break;
      case "spacer":
        break;
    }
  }

  parts.push(
    "",
    "—",
    ctx.organizationName,
    ctx.postalAddress,
    `Darse de baja: ${ctx.unsubscribeUrl}`,
  );

  return applyMergeTags(parts.filter(Boolean).join("\n\n"), ctx)
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
