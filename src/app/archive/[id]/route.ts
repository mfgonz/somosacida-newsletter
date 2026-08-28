import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseDesign } from "@/lib/email/blocks";
import { renderDesign } from "@/lib/email/render";
import { loadOrgSettings } from "@/lib/email/send";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Public "view in browser" copy of a campaign.
 *
 * Served as a standalone HTML document rather than a React page: the renderer
 * emits a complete <html> document, which cannot be nested inside the app's
 * own layout. Rendered without a recipient, so merge tags resolve to neutral
 * values and no individual's signed token appears in the public page.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: campaign } = await supabaseAdmin()
    .from("campaigns")
    .select("id,design,status")
    .eq("id", id)
    .single();

  // Drafts are not public — only campaigns that actually went out.
  if (!campaign || !["sending", "sent", "paused"].includes(campaign.status)) {
    return new NextResponse("No encontrado", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
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

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The archive is a static rendering of operator-authored content; a
      // strict CSP costs nothing here and blocks any script that slipped past
      // the sanitizer.
      "Content-Security-Policy":
        "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https:;",
      "X-Robots-Tag": "noindex",
    },
  });
}
