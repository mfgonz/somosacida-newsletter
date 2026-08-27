import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Stateless signed tokens for links sent by email (unsubscribe, opt-in
 * confirmation, preference center). A token proves the bearer received a
 * message at that address; it is never a substitute for an admin session.
 */

export type TokenPurpose = "unsubscribe" | "confirm" | "preferences";

type Payload = {
  p: TokenPurpose;
  cid: string;
  exp: number;
  jti: string;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(body: string): string {
  return b64url(
    createHmac("sha256", env().TOKEN_SIGNING_SECRET).update(body).digest(),
  );
}

const DEFAULT_TTL_DAYS: Record<TokenPurpose, number> = {
  // Unsubscribe links must keep working for the life of the email, so they are
  // long-lived by design. Confirmation links expire quickly.
  unsubscribe: 3650,
  preferences: 3650,
  confirm: 7,
};

export function createToken(
  purpose: TokenPurpose,
  contactId: string,
  ttlDays = DEFAULT_TTL_DAYS[purpose],
): string {
  const payload: Payload = {
    p: purpose,
    cid: contactId,
    exp: Math.floor(Date.now() / 1000) + ttlDays * 86400,
    jti: randomUUID(),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(
  token: string,
  expected: TokenPurpose,
): { contactId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, providedSig] = parts;
  const expectedSig = sign(body);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    return null;
  }

  if (payload.p !== expected) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!payload.cid) return null;

  return { contactId: payload.cid };
}
