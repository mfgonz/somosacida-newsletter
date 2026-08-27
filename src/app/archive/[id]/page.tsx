import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseDesign } from "@/lib/email/blocks";
import { renderDesign } from "@/lib/email/render";
import { loadOrgSettings } from "@/lib/email/send";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Public "view in browser" copy of a campaign. Rendered without a recipient, so
 * merge tags resolve to neutral values and the footer links point at the
 * preference centre rather than any individual's signed token.
 */
export default async function ArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: campaign } = await supabaseAdmin()
    .from("campaigns")
    .select("id,name,subject,preheader,design,status")
    .eq("id", id)
    .single();

  // Drafts are not public: only campaigns that were actually sent.
  if (!campaign || !["sending", "sent", "paused"].includes(campaign.status)) {
    notFound();
  }

  const org = await loadOrgSettings();

  const html = renderDesign(parseDesign(campaign.design), {
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    unsubscribeUrl: appUrl("/"),
    oneClickUnsubscribeUrl: appUrl("/"),
    preferencesUrl: appUrl("/"),
    organizationName: org.organizationName,
    postalAddress: org.postalAddress,
  });

  return (
    <div
      // The design is operator-authored and already passed through the
      // sanitizer during rendering.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await supabaseAdmin()
    .from("campaigns")
    .select("subject,name")
    .eq("id", id)
    .single();
  return { title: data?.subject || data?.name || "Boletín" };
}
