import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdmin, audit } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Extension is derived from the sniffed type, never from the uploaded filename,
 * so a file called "logo.png.html" cannot be stored with an HTML extension.
 */
const ACCEPTED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Identifies the real type from the file's leading bytes rather than trusting
 * the client-supplied Content-Type, which is trivially forged.
 */
function sniffImageType(bytes: Uint8Array): string | null {
  const startsWith = (...sig: number[]) =>
    sig.every((b, i) => bytes[i] === b);

  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return "image/gif";

  // RIFF....WEBP
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera los 10 MB" },
      { status: 413 },
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);

  // SVG is deliberately rejected: it can carry script, and many clients strip
  // it anyway. PNG/JPEG/GIF/WebP cover every practical newsletter use.
  if (!sniffed || !ACCEPTED[sniffed]) {
    return NextResponse.json(
      { error: "Formato no admitido. Usa PNG, JPG, GIF o WebP." },
      { status: 415 },
    );
  }

  const ext = ACCEPTED[sniffed];
  const key = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;

  const db = supabaseAdmin();
  const { error } = await db.storage
    .from("email-assets")
    .upload(key, buffer, {
      contentType: sniffed,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = db.storage.from("email-assets").getPublicUrl(key);

  await audit({
    actorEmail: admin.email,
    action: "asset.upload",
    metadata: { key, type: sniffed, bytes: file.size },
  });

  return NextResponse.json({ url: publicUrl, type: sniffed, bytes: file.size });
}
