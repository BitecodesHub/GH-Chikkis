import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env, whatsappConfigured } from "./env";
import { normalizePhone } from "./phone";

export class WhatsAppSendError extends Error {
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, options: { retryable: boolean; status?: number }) {
    super(message);
    this.name = "WhatsAppSendError";
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

export function simulatedWhatsAppId(): string {
  return `sim_${randomUUID()}`;
}

interface MetaErrorPayload {
  error?: { message?: string };
}

interface MetaSendPayload extends MetaErrorPayload {
  messages?: { id?: string }[];
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  language: string;
  params: string[];
}): Promise<{ providerMessageId: string }> {
  if (env.whatsapp.mode !== "live") {
    throw new WhatsAppSendError("WhatsApp is not in live mode.", { retryable: false });
  }
  if (!whatsappConfigured) {
    throw new WhatsAppSendError("Meta WhatsApp is not configured on the server.", {
      retryable: false,
    });
  }
  const phone = normalizePhone(input.to);
  if (!phone) {
    throw new WhatsAppSendError("The recipient phone number is not valid.", {
      retryable: false,
    });
  }

  const url = `https://graph.facebook.com/${env.whatsapp.graphVersion}/${env.whatsapp.phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: phone.phone,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.language },
      ...(input.params.length
        ? {
            components: [
              {
                type: "body",
                parameters: input.params.map((text) => ({ type: "text", text })),
              },
            ],
          }
        : {}),
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new WhatsAppSendError(
      "Could not reach Meta WhatsApp. Check the network connection and try again.",
      { retryable: true },
    );
  }

  const body = (await response.json().catch(() => null)) as MetaSendPayload | null;
  if (!response.ok) {
    const message =
      body?.error?.message ??
      `Meta WhatsApp rejected the message (HTTP ${response.status}).`;
    throw new WhatsAppSendError(message.slice(0, 500), {
      retryable: response.status === 429 || response.status >= 500,
      status: response.status,
    });
  }

  const providerMessageId = body?.messages?.[0]?.id;
  if (typeof providerMessageId !== "string" || !providerMessageId) {
    throw new WhatsAppSendError(
      "Meta WhatsApp accepted the request but did not return a message ID.",
      { retryable: true },
    );
  }
  return { providerMessageId };
}

export function verifyMetaSignature(rawBody: string, signature: string | null): boolean {
  if (!env.whatsapp.appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", env.whatsapp.appSecret)
    .update(rawBody)
    .digest("hex");
  const provided = signature.slice("sha256=".length).toLowerCase();
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

export function verifyWebhookToken(token: string | null): boolean {
  if (!env.whatsapp.verifyToken || !token) return false;
  const expected = Buffer.from(env.whatsapp.verifyToken);
  const provided = Buffer.from(token);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export interface WhatsAppStatusEvent {
  providerMessageId: string;
  providerStatus: string;
  at: string;
  error?: string;
}

interface WebhookStatus {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
  errors?: { title?: string; message?: string }[];
}

export function extractStatusEvents(payload: unknown): WhatsAppStatusEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];
  const events: WhatsAppStatusEvent[] = [];
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const statuses = (change as { value?: { statuses?: unknown } })?.value?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const raw of statuses as WebhookStatus[]) {
        if (typeof raw.id !== "string" || typeof raw.status !== "string") continue;
        const seconds = Number(raw.timestamp);
        const at = Number.isFinite(seconds)
          ? new Date(seconds * 1000).toISOString()
          : new Date().toISOString();
        const error = Array.isArray(raw.errors)
          ? raw.errors
              .map((item) => item?.message ?? item?.title)
              .filter(Boolean)
              .join(" · ")
          : undefined;
        events.push({
          providerMessageId: raw.id,
          providerStatus: raw.status.toLowerCase(),
          at,
          ...(error ? { error: error.slice(0, 500) } : {}),
        });
      }
    }
  }
  return events;
}
