import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { processCampaignBatch } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time comparison so the shared secret cannot be guessed byte-by-byte. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorize(request: Request): boolean {
  const expected = env().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (bearer && secretMatches(bearer, expected)) return true;

  const param = new URL(request.url).searchParams.get("secret") ?? "";
  return Boolean(param) && secretMatches(param, expected);
}

async function run() {
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  // Promote scheduled campaigns whose time has arrived.
  await db
    .from("campaigns")
    .update({ status: "sending", send_started_at: now })
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  const { data: active } = await db
    .from("campaigns")
    .select("id")
    .eq("status", "sending")
    .limit(5);

  const results: { campaignId: string; sent: number; failed: number; remaining: number }[] =
    [];

  for (const campaign of active ?? []) {
    const progress = await processCampaignBatch(campaign.id);
    results.push({
      campaignId: campaign.id,
      sent: progress.sent,
      failed: progress.failed,
      remaining: progress.remaining,
    });
  }

  return results;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, processed: await run() });
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, processed: await run() });
}
