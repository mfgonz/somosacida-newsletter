import type { Config } from "tailwindcss";
import { brand } from "./src/lib/brand";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: brand.color.ink,
        "ink-soft": brand.color.inkSoft,
        muted: brand.color.muted,
        line: brand.color.line,
        surface: brand.color.surface,
        canvas: brand.color.canvas,
        primary: {
          DEFAULT: brand.color.primary,
          ink: brand.color.primaryInk,
          dark: brand.color.primaryDark,
        },
        accent: {
          DEFAULT: brand.color.accent,
          ink: brand.color.accentInk,
        },
        success: brand.color.success,
        warning: brand.color.warning,
        danger: brand.color.danger,
        info: brand.color.info,
      },
      fontFamily: {
        sans: [brand.font.sans],
        display: [brand.font.display],
        mono: [brand.font.mono],
      },
      borderRadius: {
        sm: brand.radius.sm,
        md: brand.radius.md,
        lg: brand.radius.lg,
        pill: brand.radius.pill,
      },
    },
  },
  plugins: [],
};

export default config;
