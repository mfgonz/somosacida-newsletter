/**
 * Seeds the two starter campaign designs.
 *
 * Written as a script rather than a SQL migration because the designs are
 * application data shaped by the block schema, and building them in JS keeps
 * the brand tokens as the single source of truth.
 *
 * Run: node scripts/seed-templates.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// --print emits the designs as JSON and touches no network, so they can be
// validated and applied by other means.
const PRINT_ONLY = process.argv.includes("--print");

let db = null;
if (!PRINT_ONLY) {
  // Minimal .env.local reader so the script needs no extra dependency.
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

const C = {
  ink: "#2E3020",
  bone: "#EAE7DB",
  surface: "#F4F1E7",
  terracotta: "#C6512C",
  mustard: "#D2C158",
  olive: "#3A3D17",
  black: "#161612",
  muted: "#83826F",
  line: "#D8D3C4",
};

let n = 0;
const id = () => `b${(n++).toString(36)}${Date.now().toString(36)}`;

const heading = (text, level, color, align = "left") => ({
  id: id(), type: "heading", text, level, align, color,
});
const text = (html, color = C.ink, size = 16, align = "left") => ({
  id: id(), type: "text", html, align, color, fontSize: size,
});
const button = (label, href, background, color, align = "left") => ({
  id: id(), type: "button", label, href, align,
  background, color, radius: 8, fullWidth: false,
});
const divider = (color = C.line, thickness = 1) => ({
  id: id(), type: "divider", color, thickness,
});
const spacer = (height) => ({ id: id(), type: "spacer", height });
const columns = (cols, gap = 20) => ({
  id: id(), type: "columns", columns: cols.map((html) => ({ html })), gap,
});
const social = (links, color = C.muted) => ({
  id: id(), type: "social", links, align: "center", color,
});
const raw = (html) => ({ id: id(), type: "html", html });

/** A full-bleed coloured band. Tables, because email clients demand them. */
const band = (bg, inner) => raw(
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};">` +
  `<tr><td style="padding:28px 30px;">${inner}</td></tr></table>`,
);

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/somosacida" },
  { label: "Web", href: "https://somosacida.com" },
];

const settings = {
  background: C.bone,
  surface: C.surface,
  contentWidth: 600,
  fontFamily:
    "Archivo, 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  textColor: C.ink,
  linkColor: C.terracotta,
  padding: 30,
};

// ---------------------------------------------------------------------------
// 1. Launch announcement
// ---------------------------------------------------------------------------

const launch = {
  settings,
  blocks: [
    raw(
      `<p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.muted};">` +
      `&bull; Nuevo capítulo &mdash; 2026</p>`,
    ),
    spacer(8),
    heading("ácida", 1, C.ink),
    heading("Construimos y proyectamos el relato de quienes trabajan por el bien común.", 2, C.ink),
    spacer(8),
    text(
      `<p>Hola {{first_name}},</p>` +
      `<p>Después de años dando forma al relato de instituciones culturales, ONG's y empresas, ` +
      `damos un paso más: <strong>ácida</strong> abre oficialmente sus puertas.</p>`,
      C.ink, 16,
    ),
    { id: id(), type: "image", src: "", alt: "Trabajo de ácida", href: "", width: 100, align: "center" },
    spacer(12),
    band(
      C.terracotta,
      `<p style="margin:0 0 6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.bone};opacity:0.8;">Qué hacemos</p>` +
      `<p style="margin:0;font-size:26px;line-height:1.15;font-weight:800;color:${C.black};">Mirada estratégica<br>y curatorial</p>`,
    ),
    raw(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.black};">` +
      `<tr><td style="padding:24px 30px;">` +
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:${C.bone};">` +
      `<strong style="color:${C.mustard};">N°1</strong> &nbsp;Producción visual<br>` +
      `<strong style="color:${C.mustard};">N°2</strong> &nbsp;Gestión cultural y de programas<br>` +
      `<strong style="color:${C.mustard};">N°3</strong> &nbsp;Comunicación estratégica<br>` +
      `<strong style="color:${C.mustard};">N°4</strong> &nbsp;Dirección creativa<br>` +
      `<strong style="color:${C.mustard};">N°5</strong> &nbsp;Redacción de propuestas e informes` +
      `</p></td></tr></table>`,
    ),
    spacer(20),
    heading("Para quién", 3, C.ink),
    columns([
      `<p style="margin:0;"><strong>Instituciones culturales</strong><br>` +
      `<span style="color:${C.muted};">Museos, bienales, festivales y archivos.</span></p>`,
      `<p style="margin:0;"><strong>ONG's y fundaciones</strong><br>` +
      `<span style="color:${C.muted};">Causas ambientales y sociales.</span></p>`,
    ]),
    columns([
      `<p style="margin:0;"><strong>Empresas</strong><br>` +
      `<span style="color:${C.muted};">Comunicación institucional y sostenibilidad.</span></p>`,
      `<p style="margin:0;"><strong>Sector público</strong><br>` +
      `<span style="color:${C.muted};">Patrimonio y campañas ciudadanas.</span></p>`,
    ]),
    spacer(20),
    divider(),
    text(
      `<p>Estamos abriendo agenda para proyectos de 2026. Si tienes algo entre manos, ` +
      `cuéntanoslo &mdash; escuchamos primero y proponemos después.</p>`,
      C.ink, 16,
    ),
    button("Agenda una conversación", "https://somosacida.com", C.terracotta, C.surface, "left"),
    spacer(16),
    divider(),
    social(SOCIALS),
  ],
};

// ---------------------------------------------------------------------------
// 2. Project update + promotional offer
// ---------------------------------------------------------------------------

const update = {
  settings,
  blocks: [
    raw(
      `<p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.muted};">` +
      `&bull; Actualización de proyecto</p>`,
    ),
    spacer(8),
    heading("Nombre del proyecto", 1, C.ink),
    text(
      `<p>Hola {{first_name}},</p>` +
      `<p>Un resumen breve de dónde estamos y qué viene ahora.</p>`,
      C.ink, 16,
    ),
    { id: id(), type: "image", src: "", alt: "Avance del proyecto", href: "", width: 100, align: "center" },
    spacer(14),
    heading("Lo que hemos avanzado", 3, C.ink),
    text(
      `<ul>` +
      `<li>Hito uno &mdash; qué se completó y qué significa.</li>` +
      `<li>Hito dos &mdash; qué cambió respecto al plan.</li>` +
      `<li>Hito tres &mdash; qué aprendimos por el camino.</li>` +
      `</ul>`,
      C.ink, 15,
    ),
    spacer(6),
    raw(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.olive};">` +
      `<tr><td style="padding:22px 30px;">` +
      `<p style="margin:0 0 4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.mustard};">Próximo paso</p>` +
      `<p style="margin:0;font-size:17px;line-height:1.5;color:${C.bone};">` +
      `Describe aquí la siguiente fase y la fecha en que la esperas.</p>` +
      `</td></tr></table>`,
    ),
    spacer(24),
    divider(),
    spacer(10),

    // Promotional offer — visually distinct from the project update above.
    raw(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.mustard};border-radius:12px;">` +
      `<tr><td style="padding:26px 28px;text-align:center;">` +
      `<p style="margin:0 0 6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.ink};opacity:0.75;">Solo para clientes</p>` +
      `<p style="margin:0 0 10px;font-size:30px;line-height:1.1;font-weight:800;color:${C.ink};">15% en tu próximo proyecto</p>` +
      `<p style="margin:0;font-size:14px;line-height:1.6;color:${C.ink};">` +
      `Si reservas antes del <strong>30 de junio</strong>, aplicamos el descuento ` +
      `a cualquier servicio de producción o dirección creativa.</p>` +
      `</td></tr></table>`,
    ),
    spacer(18),
    button("Reservar mi cupo", "https://somosacida.com", C.terracotta, C.surface, "center"),
    spacer(8),
    text(
      `<p style="text-align:center;">Cupos limitados para 2026. Responde a este correo y lo vemos.</p>`,
      C.muted, 13, "center",
    ),
    spacer(14),
    divider(),
    social(SOCIALS),
  ],
};

const TEMPLATES = [
  ["Lanzamiento — ácida", launch],
  ["Actualización de proyecto + oferta", update],
];

if (PRINT_ONLY) {
  console.log(JSON.stringify(TEMPLATES.map(([name, design]) => ({ name, design }))));
  process.exit(0);
}

for (const [name, design] of TEMPLATES) {
  const { data: existing } = await db
    .from("templates").select("id").eq("name", name).maybeSingle();

  if (existing) {
    const { error } = await db
      .from("templates").update({ design, is_starter: true }).eq("id", existing.id);
    console.log(error ? `FAIL  ${name}: ${error.message}` : `updated  ${name}`);
  } else {
    const { error } = await db
      .from("templates").insert({ name, design, is_starter: true });
    console.log(error ? `FAIL  ${name}: ${error.message}` : `created  ${name}`);
  }
}
