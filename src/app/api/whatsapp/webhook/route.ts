import { NextResponse } from "next/server";
import { handleWhatsAppStatusEvents } from "@/lib/messaging";
import {
  extractStatusEvents,
  verifyMetaSignature,
  verifyWebhookToken,
} from "@/lib/whatsapp-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;

async function readLimitedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  if (mode !== "subscribe" || !verifyWebhookToken(token)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const raw = await readLimitedBody(request);
  if (raw === null) {
    return new NextResponse("Payload too large", { status: 413 });
  }
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(raw, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  const events = extractStatusEvents(payload);
  if (events.length === 0) {
    return NextResponse.json({ received: true, updated: 0 });
  }

  try {
    const updated = await handleWhatsAppStatusEvents(events);
    return NextResponse.json({ received: true, updated });
  } catch (error) {
    console.error("WhatsApp webhook processing failed", error);
    return new NextResponse("Processing error", { status: 500 });
  }
}
