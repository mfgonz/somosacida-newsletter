import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
