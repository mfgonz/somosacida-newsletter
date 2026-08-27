import { z } from "zod";
import { brand } from "@/lib/brand";

/** The document model the newsletter designer edits and the renderer consumes. */

export const BLOCK_TYPES = [
  "heading",
  "text",
  "image",
  "button",
  "divider",
  "spacer",
  "columns",
  "social",
  "html",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

const align = z.enum(["left", "center", "right"]).default("left");
const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color inválido");

// Only http(s) and mailto links are renderable; javascript: and data: URLs are
// rejected at the schema level so they can never reach a subscriber's inbox.
const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => v === "" || /^(https?:\/\/|mailto:)/i.test(v),
    "El enlace debe empezar por https://, http:// o mailto:",
  );

const base = { id: z.string().min(1) };

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("heading"),
    text: z.string().max(500).default("Título"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
    align,
    color: hex.default(brand.email.text),
  }),
  z.object({
    ...base,
    type: z.literal("text"),
    // Rich text limited to an inline subset; sanitized again at render time.
    html: z.string().max(20000).default("<p>Escribe aquí tu mensaje.</p>"),
    align,
    color: hex.default(brand.email.text),
    fontSize: z.number().min(10).max(32).default(16),
  }),
  z.object({
    ...base,
    type: z.literal("image"),
    src: safeUrl.default(""),
    alt: z.string().max(300).default(""),
    href: safeUrl.default(""),
    width: z.number().min(10).max(100).default(100),
    align: align.default("center"),
  }),
  z.object({
    ...base,
    type: z.literal("button"),
    label: z.string().max(120).default("Ver más"),
    href: safeUrl.default(""),
    align: align.default("center"),
    background: hex.default(brand.email.buttonBg),
    color: hex.default(brand.email.buttonText),
    radius: z.number().min(0).max(40).default(8),
    fullWidth: z.boolean().default(false),
  }),
  z.object({
    ...base,
    type: z.literal("divider"),
    color: hex.default("#E4E4E7"),
    thickness: z.number().min(1).max(8).default(1),
  }),
  z.object({
    ...base,
    type: z.literal("spacer"),
    height: z.number().min(4).max(120).default(24),
  }),
  z.object({
    ...base,
    type: z.literal("columns"),
    columns: z
      .array(
        z.object({
          html: z.string().max(10000).default("<p>Columna</p>"),
        }),
      )
      .min(2)
      .max(3)
      .default([{ html: "<p>Columna</p>" }, { html: "<p>Columna</p>" }]),
    gap: z.number().min(0).max(40).default(16),
  }),
  z.object({
    ...base,
    type: z.literal("social"),
    links: z
      .array(
        z.object({
          label: z.string().max(40),
          href: safeUrl,
        }),
      )
      .max(8)
      .default([]),
    align: align.default("center"),
    color: hex.default(brand.email.mutedText),
  }),
  z.object({
    ...base,
    type: z.literal("html"),
    // Operator-authored raw HTML. Still sanitized at render time — the operator
    // is trusted, but a pasted snippet may not be.
    html: z.string().max(50000).default(""),
  }),
]);

export type Block = z.infer<typeof blockSchema>;

export const designSettingsSchema = z.object({
  background: hex.default(brand.email.background),
  surface: hex.default(brand.email.surface),
  contentWidth: z.number().min(320).max(800).default(brand.email.contentWidth),
  fontFamily: z.string().max(300).default(brand.email.fontFamily),
  textColor: hex.default(brand.email.text),
  linkColor: hex.default(brand.email.link),
  padding: z.number().min(0).max(60).default(24),
});

export type DesignSettings = z.infer<typeof designSettingsSchema>;

export const designSchema = z.object({
  blocks: z.array(blockSchema).max(200).default([]),
  settings: designSettingsSchema.default({}),
});

export type Design = z.infer<typeof designSchema>;

export function emptyDesign(): Design {
  return designSchema.parse({ blocks: [], settings: {} });
}

export function parseDesign(input: unknown): Design {
  const parsed = designSchema.safeParse(input);
  return parsed.success ? parsed.data : emptyDesign();
}

let counter = 0;
export function newBlockId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}${counter.toString(36)}`;
}

export function createBlock(type: BlockType): Block {
  const id = newBlockId();
  // Each branch is parsed through the schema so defaults stay in one place.
  switch (type) {
    case "heading":
      return blockSchema.parse({ id, type: "heading" });
    case "text":
      return blockSchema.parse({ id, type: "text" });
    case "image":
      return blockSchema.parse({ id, type: "image" });
    case "button":
      return blockSchema.parse({ id, type: "button" });
    case "divider":
      return blockSchema.parse({ id, type: "divider" });
    case "spacer":
      return blockSchema.parse({ id, type: "spacer" });
    case "columns":
      return blockSchema.parse({ id, type: "columns" });
    case "social":
      return blockSchema.parse({ id, type: "social" });
    case "html":
      return blockSchema.parse({ id, type: "html" });
  }
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Título",
  text: "Texto",
  image: "Imagen",
  button: "Botón",
  divider: "Separador",
  spacer: "Espacio",
  columns: "Columnas",
  social: "Redes",
  html: "HTML",
};
