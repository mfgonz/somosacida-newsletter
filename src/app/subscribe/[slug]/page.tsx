import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public-shell";
import { SignupForm, type FormField } from "@/components/signup-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data } = await supabaseAdmin()
    .from("forms")
    .select("name,headline")
    .eq("slug", slug)
    .single();
  return { title: data?.headline || data?.name || "Suscríbete" };
}

export default async function HostedFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: form } = await supabaseAdmin()
    .from("forms")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!form) notFound();

  return (
    <PublicShell title={form.headline || form.name}>
      {form.description && (
        <p className="mb-5 text-sm text-muted">{form.description}</p>
      )}
      <SignupForm
        slug={form.slug}
        fields={form.fields as unknown as FormField[]}
        buttonLabel={form.button_label}
        successMessage={form.success_message}
      />
      <p className="mt-5 text-xs text-muted">
        Al suscribirte aceptas recibir nuestros correos. Puedes darte de baja
        cuando quieras.
      </p>
    </PublicShell>
  );
}
