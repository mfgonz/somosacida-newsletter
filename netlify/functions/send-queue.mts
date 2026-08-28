import type { Config } from "@netlify/functions";

/**
 * Scheduled worker. Calls the app's own cron endpoint, which promotes due
 * scheduled campaigns, sends the next batch of queued recipients, and advances
 * drip automations.
 *
 * Kept as a thin caller rather than duplicating the logic, so there is one
 * implementation of the send pipeline. Authorises with CRON_SECRET, the same
 * shared secret the endpoint checks in constant time.
 */
export default async function handler() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;

  if (!base || !secret) {
    console.error("send-queue: NEXT_PUBLIC_APP_URL or CRON_SECRET is not set");
    return new Response("Not configured", { status: 500 });
  }

  const res = await fetch(`${base.replace(/\/+$/, "")}/api/cron/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`send-queue: ${res.status} ${body}`);
    return new Response(body, { status: res.status });
  }

  console.log(`send-queue: ${body}`);
  return new Response(body, { status: 200 });
}

export const config: Config = {
  schedule: "*/5 * * * *",
};
