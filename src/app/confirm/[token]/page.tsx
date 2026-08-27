import { verifyToken } from "@/lib/tokens";
import { confirmContact } from "@/lib/compliance";
import { triggerAutomations } from "@/lib/automations";
import { PublicShell } from "@/components/public-shell";

export const metadata = { title: "Confirmar suscripción", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyToken(token, "confirm");

  if (!verified) {
    return (
      <PublicShell title="Enlace caducado">
        <p className="text-sm text-muted">
          Este enlace de confirmación no es válido o ha caducado. Vuelve a
          suscribirte para recibir uno nuevo.
        </p>
      </PublicShell>
    );
  }

  const result = await confirmContact(verified.contactId);

  if (!result.ok) {
    return (
      <PublicShell title="No pudimos confirmar">
        <p className="text-sm text-muted">{result.error}</p>
      </PublicShell>
    );
  }

  await triggerAutomations({
    trigger: "contact_created",
    contactId: verified.contactId,
  });

  return (
    <PublicShell title="¡Suscripción confirmada!">
      <p className="text-sm">
        Gracias. <strong>{result.email}</strong> ya está en la lista.
      </p>
      <p className="mt-3 text-sm text-muted">
        Puedes darte de baja en cualquier momento desde el enlace al pie de
        cualquiera de nuestros correos.
      </p>
    </PublicShell>
  );
}
