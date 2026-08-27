/**
 * PLACEHOLDER BRAND TOKENS — replace with the real somosacida.com values.
 *
 * This is the single source of truth for brand styling. It feeds three consumers:
 *   1. Tailwind (tailwind.config.ts imports it)
 *   2. The admin UI (via CSS custom properties in globals.css)
 *   3. Email rendering, which cannot use CSS variables and needs literal hex
 *
 * Changing a value here updates all three. Nothing else hardcodes brand colors.
 */

export const brand = {
  name: "Somos Ácida",
  domain: "somosacida.com",

  color: {
    ink: "#0E0E10",
    inkSoft: "#3A3A42",
    muted: "#71717A",
    line: "#E4E4E7",
    surface: "#FFFFFF",
    canvas: "#FAFAF9",

    primary: "#C8F31D",
    primaryInk: "#0E0E10",
    primaryDark: "#A6CC12",

    accent: "#FF4D2E",
    accentInk: "#FFFFFF",

    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    info: "#2563EB",
  },

  font: {
    // Stacks end in web-safe fallbacks so email clients degrade gracefully.
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    display:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },

  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    pill: "999px",
  },

  /** Defaults applied to newly created email templates. */
  email: {
    contentWidth: 600,
    background: "#F4F4F5",
    surface: "#FFFFFF",
    text: "#0E0E10",
    mutedText: "#71717A",
    link: "#0E0E10",
    buttonBg: "#C8F31D",
    buttonText: "#0E0E10",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
} as const;

export type Brand = typeof brand;
