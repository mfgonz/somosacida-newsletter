/**
 * Minimal allowlist sanitizer for the rich-text and raw-HTML blocks.
 *
 * Email clients do not execute scripts, so this is not an XSS boundary for
 * subscribers. It matters because the same HTML is rendered in the designer's
 * preview and in the browser-based "view in browser" page, where it *is* a
 * live DOM. Everything not explicitly allowed is dropped.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "blockquote", "span", "div", "table", "thead",
  "tbody", "tr", "td", "th", "img", "hr", "small", "sub", "sup",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "style", "title"]),
  img: new Set(["src", "alt", "width", "height", "style"]),
  td: new Set(["style", "colspan", "rowspan", "align", "valign", "width"]),
  th: new Set(["style", "colspan", "rowspan", "align", "valign", "width"]),
  table: new Set(["style", "width", "cellpadding", "cellspacing", "border", "role"]),
  "*": new Set(["style", "class"]),
};

const URL_ATTRS = new Set(["href", "src"]);

function isSafeUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.startsWith("//")) return true;
  return /^(https?:|mailto:|cid:|#|\/)/.test(v);
}

/** Strips CSS that can load or execute remote content. */
function sanitizeStyle(style: string): string {
  return style
    .split(";")
    .filter((decl) => {
      const lowered = decl.toLowerCase();
      if (/expression\s*\(|javascript:|behavior\s*:|@import|binding\s*:/.test(lowered)) {
        return false;
      }
      // url() can beacon; images belong in an <img> block where the src is checked.
      if (/url\s*\(/.test(lowered)) return false;
      return decl.trim().length > 0;
    })
    .join(";");
}

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let out = input;

  // Remove whole elements whose content is never renderable as markup.
  out = out.replace(
    /<(script|style|iframe|object|embed|form|input|button|link|meta|base|svg|math)\b[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  out = out.replace(
    /<(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*\/?>/gi,
    "",
  );
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  out = out.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)\/?>/g,
    (match, closing: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return `</${tag}>`;

      const attrs: string[] = [];
      const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g;
      let m: RegExpExecArray | null;

      while ((m = attrRe.exec(rawAttrs)) !== null) {
        const name = m[1].toLowerCase();
        let value = m[2];
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        // Every on* handler is dropped regardless of tag.
        if (name.startsWith("on")) continue;

        const allowed =
          ALLOWED_ATTRS[tag]?.has(name) || ALLOWED_ATTRS["*"].has(name);
        if (!allowed) continue;

        if (URL_ATTRS.has(name) && !isSafeUrl(value)) continue;
        if (name === "style") {
          value = sanitizeStyle(value);
          if (!value) continue;
        }

        attrs.push(`${name}="${escapeAttr(value)}"`);
      }

      // External links open in a new tab without leaking the referrer.
      if (tag === "a") {
        const hasHref = attrs.some((a) => a.startsWith("href="));
        if (hasHref) attrs.push('target="_blank"', 'rel="noopener noreferrer"');
      }

      const selfClosing = tag === "img" || tag === "br" || tag === "hr";
      return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}${selfClosing ? " /" : ""}>`;
    },
  );

  return out;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Strips all markup, for the plain-text alternative part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}
