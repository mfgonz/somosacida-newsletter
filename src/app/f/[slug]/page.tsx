import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SignupForm, type FormField } from "@/components/signup-form";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/**
 * Embeddable variant, designed to sit in an iframe on somosacida.com.
 * Middleware relaxes frame-ancestors for this route only.
 */
export default async function EmbedFormPage({
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
    <div className="bg-transparent p-3">
      {form.headline && (
        <h2 className="mb-1.5 font-display text-base font-bold">
          {form.headline}
        </h2>
      )}
      {form.description && (
        <p className="mb-3 text-sm text-muted">{form.description}</p>
      )}
      <SignupForm
        slug={form.slug}
        fields={form.fields as unknown as FormField[]}
        buttonLabel={form.button_label}
        successMessage={form.success_message}
        compact
      />
    </div>
  );
}
