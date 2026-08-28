import type { Metadata } from "next";
import { Archivo, DM_Mono } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";

// Heavy grotesque for the wordmark and headings.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

// Letterspaced uppercase labels, as on the site's nav and eyebrow rules.
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} · Newsletter`,
    template: `%s · ${brand.name}`,
  },
  description: "Plataforma privada de email marketing.",
  // The admin surface holds client PII; keep it out of search indexes.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${archivo.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
