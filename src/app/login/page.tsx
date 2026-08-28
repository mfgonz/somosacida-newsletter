import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isAllowedAdmin } from "@/lib/env";
import { Wordmark, Eyebrow } from "@/components/wordmark";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isAllowedAdmin(user.email)) redirect(next || "/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Wordmark className="text-5xl" />
          <p className="mt-3">
            <Eyebrow>Panel de newsletter</Eyebrow>
          </p>
        </div>

        <div className="card p-6">
          <LoginForm nextPath={next} initialError={error} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Acceso restringido. Todos los accesos quedan registrados.
        </p>
      </div>
    </main>
  );
}
