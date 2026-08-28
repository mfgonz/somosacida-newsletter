import { designSchema, newBlockId, type Design } from "@/lib/email/blocks";
import { brand } from "@/lib/brand";

/** Opening design for a new template or campaign, styled to the brand. */
export function starterDesign(): Design {
  return designSchema.parse({
    settings: {
      background: brand.email.background,
      surface: brand.email.surface,
      contentWidth: brand.email.contentWidth,
      textColor: brand.email.text,
      linkColor: brand.email.link,
      padding: 28,
    },
    blocks: [
      {
        id: newBlockId(),
        type: "heading",
        text: "Hola {{first_name}}",
        level: 1,
        align: "left",
        color: brand.email.text,
      },
      {
        id: newBlockId(),
        type: "text",
        html: "<p>Escribe aquí tu mensaje. Puedes usar <strong>negrita</strong>, <em>cursiva</em> y <a href=\"https://somosacida.com\">enlaces</a>.</p>",
        align: "left",
        color: brand.email.text,
        fontSize: 16,
      },
      { id: newBlockId(), type: "spacer", height: 8 },
      {
        id: newBlockId(),
        type: "button",
        label: "Ver más",
        href: "https://somosacida.com",
        align: "left",
        background: brand.email.buttonBg,
        color: brand.email.buttonText,
        radius: 8,
        fullWidth: false,
      },
      { id: newBlockId(), type: "divider", color: "#E4E4E7", thickness: 1 },
      {
        id: newBlockId(),
        type: "social",
        align: "center",
        color: brand.email.mutedText,
        links: [{ label: "Instagram", href: "https://instagram.com" }],
      },
    ],
  });
}
