import { verifyToken } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public-shell";
import { PreferencesForm } from "./preferences-form";

export const metadata = { title: "Preferencias", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyToken(token, "preferences");

  if (!verified) {
    return (
      <PublicShell title="Enlace no válido">
        <p className="text-sm text-muted">
          Este enlace no es válido o ha caducado.
        </p>
      </PublicShell>
    );
  }

  const db = supabaseAdmin();
  const [{ data: contact }, { data: lists }, { data: memberships }] =
    await Promise.all([
      db
        .from("contacts")
        .select("id,email,first_name,last_name,status")
        .eq("id", verified.contactId)
        .single(),
      db
        .from("lists")
        .select("id,name,description")
        .eq("is_public", true)
        .order("name"),
      db
        .from("list_contacts")
        .select("list_id,subscribed")
        .eq("contact_id", verified.contactId),
    ]);

  if (!contact) {
    return (
      <PublicShell title="Enlace no válido">
        <p className="text-sm text-muted">No encontramos esta suscripción.</p>
      </PublicShell>
    );
  }

  const subscribedListIds = new Set(
    (memberships ?? []).filter((m) => m.subscribed).map((m) => m.list_id),
  );

  return (
    <PublicShell title="Tus preferencias">
      <p className="mb-5 text-sm text-muted">{contact.email}</p>
      <PreferencesForm
        token={token}
        firstName={contact.first_name ?? ""}
        lastName={contact.last_name ?? ""}
        unsubscribed={contact.status === "unsubscribed"}
        lists={(lists ?? []).map((l) => ({
          ...l,
          subscribed: subscribedListIds.has(l.id),
        }))}
      />
    </PublicShell>
  );
}
