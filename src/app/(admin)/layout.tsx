import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { NavLinks } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface md:flex md:flex-col">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-ink">
            A
          </span>
          <span className="font-display text-sm font-bold">{brand.name}</span>
        </Link>

        <NavLinks />

        <div className="mt-auto border-t border-line p-4">
          <p className="truncate text-xs text-muted" title={admin.email}>
            {admin.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
