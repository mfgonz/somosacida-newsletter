import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";
import { suppressContact } from "@/lib/compliance";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * RFC 8058 one-click unsubscribe. Gmail and Yahoo require bulk senders to
 * expose this, and they POST to it directly with no human involved — so it
 * must act immediately and must not require a confirmation step.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const verified = verifyToken(token, "unsubscribe");
  if (!verified) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 400 });
  }

  const { data: contact } = await supabaseAdmin()
    .from("contacts")
    .select("id,email")
    .eq("id", verified.contactId)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await suppressContact({
    contactId: contact.id,
    email: contact.email,
    reason: "unsubscribed",
    notes: "one-click",
  });

  return NextResponse.json({ ok: true });
}

/** A human following the header link lands on the friendly page instead. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return NextResponse.redirect(appUrl(`/unsubscribe/${token}`));
}
