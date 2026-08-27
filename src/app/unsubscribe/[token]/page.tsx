import { verifyToken } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public-shell";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata = { title: "Darse de baja", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyToken(token, "unsubscribe");

  if (!verified) {
    return (
      <PublicShell title="Enlace no válido">
        <p className="text-sm text-muted">
          Este enlace de baja no es válido o ha caducado. Si sigues recibiendo
          correos que no quieres, responde a cualquiera de ellos y lo
          resolveremos.
        </p>
      </PublicShell>
    );
  }

  const { data: contact } = await supabaseAdmin()
    .from("contacts")
    .select("id,email,status")
    .eq("id", verified.contactId)
    .single();

  if (!contact) {
    return (
      <PublicShell title="Enlace no válido">
        <p className="text-sm text-muted">No encontramos esta suscripción.</p>
      </PublicShell>
    );
  }

  if (contact.status === "unsubscribed") {
    return (
      <PublicShell title="Ya estás dado de baja">
        <p className="text-sm text-muted">
          <strong>{contact.email}</strong> ya no recibe nuestros correos.
        </p>
      </PublicShell>
    );
  }

  return (
    <PublicShell title="¿Darte de baja?">
      <p className="mb-5 text-sm text-muted">
        Dejarás de recibir correos en <strong>{contact.email}</strong>.
      </p>
      <UnsubscribeForm token={token} />
    </PublicShell>
  );
}
