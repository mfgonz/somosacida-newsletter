import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { appUrl } from "@/lib/env";

export const metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("id", true)
    .single();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Ajustes"
        description="Identidad del remitente y datos legales de tus envíos."
      />
      <SettingsForm
        initial={{
          organization_name: settings?.organization_name ?? "",
          postal_address: settings?.postal_address ?? "",
          default_from_name: settings?.default_from_name ?? "",
          default_from_email: settings?.default_from_email ?? "",
          default_reply_to: settings?.default_reply_to ?? "",
        }}
        webhookUrl={appUrl("/api/webhooks/resend")}
      />
    </div>
  );
}
