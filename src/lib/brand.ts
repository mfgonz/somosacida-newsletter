/**
 * Brand tokens extracted from somosacida.com.
 *
 * Single source of truth for brand styling. Three consumers:
 *   1. Tailwind (tailwind.config.ts imports it)
 *   2. The admin UI
 *   3. Email rendering, which cannot use CSS variables and needs literal hex
 *
 * Changing a value here updates all three. Nothing else hardcodes brand colors.
 */

export const brand = {
  name: "ácida",
  domain: "somosacida.com",

  color: {
    /** Deep olive — the wordmark colour, and all primary text. */
    ink: "#2E3020",
    inkSoft: "#4A4C38",
    muted: "#83826F",
    line: "#D8D3C4",

    /** Warm bone. The site's ground, not white. */
    canvas: "#EAE7DB",
    surface: "#F4F1E7",

    /** Burnt terracotta — the loudest accent, used for primary actions. */
    primary: "#C6512C",
    primaryInk: "#F4F1E7",
    primaryDark: "#A94222",

    /** Mustard, from the "Instituciones culturales" card. */
    accent: "#D2C158",
    accentInk: "#2E3020",

    success: "#3A6B3E",
    warning: "#B07D18",
    danger: "#B23A1C",
    info: "#4F5D99",
  },

  /**
   * The full categorical palette from the "Personas e instituciones" grid.
   * Used for tag colours so labels stay on-brand instead of drifting to
   * arbitrary hues.
   */
  palette: {
    mustard: "#D2C158",
    olive: "#3A3D17",
    blue: "#4F5D99",
    pink: "#E9B8C0",
    taupe: "#D9D2C6",
    black: "#161612",
    terracotta: "#C6512C",
    ink: "#2E3020",
  },

  font: {
    // Archivo is a close free stand-in for the site's heavy grotesque.
    // Loaded via next/font in app/layout.tsx; these stacks are the fallbacks.
    sans: "var(--font-archivo), -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    display:
      "var(--font-archivo), -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    // Letterspaced uppercase labels (nav, eyebrow rules) are monospaced.
    mono: "var(--font-dm-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },

  radius: {
    sm: "4px",
    md: "8px",
    lg: "14px",
    pill: "999px",
  },

  /**
   * Defaults applied to newly created email templates.
   * Web fonts are unreliable in mail clients, so these are literal stacks
   * rather than CSS variables.
   */
  email: {
    contentWidth: 600,
    background: "#EAE7DB",
    surface: "#F4F1E7",
    text: "#2E3020",
    mutedText: "#83826F",
    link: "#C6512C",
    buttonBg: "#C6512C",
    buttonText: "#F4F1E7",
    fontFamily:
      "Archivo, 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
} as const;

export type Brand = typeof brand;
