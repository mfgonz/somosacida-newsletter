"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "General",
    items: [{ href: "/dashboard", label: "Resumen" }],
  },
  {
    title: "Audiencia",
    items: [
      { href: "/contacts", label: "Contactos" },
      { href: "/lists", label: "Listas" },
      { href: "/segments", label: "Segmentos" },
      { href: "/tags", label: "Etiquetas" },
      { href: "/forms", label: "Formularios" },
    ],
  },
  {
    title: "Envíos",
    items: [
      { href: "/campaigns", label: "Campañas" },
      { href: "/templates", label: "Plantillas" },
      { href: "/automations", label: "Automatizaciones" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/suppressions", label: "Supresiones" },
      { href: "/audit", label: "Auditoría" },
      { href: "/settings", label: "Ajustes" },
    ],
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition",
                      active
                        ? "bg-ink font-semibold text-white"
                        : "text-ink-soft hover:bg-canvas",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
