import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getAdmin, audit } from "@/lib/auth";
import type { ContactStatus } from "@/lib/database.types";

/** Guards against CSV formula injection when the export is opened in Excel. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  const escaped = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${escaped.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  const supabase = await supabaseServer();

  let query = supabase
    .from("contacts")
    .select(
      "email,first_name,last_name,company,phone,status,consent_source,consent_at,confirmed_at,unsubscribed_at,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100_000);

  if (status) query = query.eq("status", status as ContactStatus);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "email", "first_name", "last_name", "company", "phone", "status",
    "consent_source", "consent_at", "confirmed_at", "unsubscribed_at", "created_at",
  ];

  const lines = [
    headers.join(","),
    ...(data ?? []).map((row) =>
      headers.map((h) => csvCell((row as Record<string, unknown>)[h])).join(","),
    ),
  ];

  await audit({
    actorEmail: admin.email,
    action: "contacts.export",
    metadata: { count: data?.length ?? 0, status: status ?? "all" },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  // ﻿ keeps Excel from mangling accented characters.
  return new NextResponse(`﻿${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contactos-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
