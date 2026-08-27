"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="mt-1.5 text-xs font-medium text-ink-soft hover:text-ink"
    >
      Cerrar sesión
    </button>
  );
}
