import "server-only";
import { env, gmailConfigured } from "./env";

export class GmailSendError extends Error {
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, options: { retryable: boolean; status?: number }) {
    super(message);
    this.name = "GmailSendError";
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

export interface GmailSendResult {
  providerMessageId: string;
  simulated: boolean;
}

const globalForGmail = globalThis as unknown as {
  gmailAccessToken?: { value: string; expiresAt: number };
  gmailAccessTokenPromise?: Promise<{ value: string; expiresAt: number }>;
};

async function accessToken(): Promise<string> {
  const cached = globalForGmail.gmailAccessToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
  if (globalForGmail.gmailAccessTokenPromise) {
    return (await globalForGmail.gmailAccessTokenPromise).value;
  }

  globalForGmail.gmailAccessTokenPromise = (async () => {
    let response: Response;
    try {
      response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.gmail.clientId,
          client_secret: env.gmail.clientSecret,
          refresh_token: env.gmail.refreshToken,
          grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new GmailSendError("Could not reach Google to authorise the email.", {
        retryable: true,
      });
    }
    const payload = (await response.json().catch(() => null)) as
      | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
      | null;
    if (!response.ok || !payload?.access_token) {
      const message =
        payload?.error_description ??
        payload?.error ??
        `Google rejected the authorisation request (HTTP ${response.status}).`;
      throw new GmailSendError(message.slice(0, 500), {
        retryable: response.status === 429 || response.status >= 500,
        status: response.status,
      });
    }
    const token = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
    };
    globalForGmail.gmailAccessToken = token;
    return token;
  })();

  try {
    return (await globalForGmail.gmailAccessTokenPromise).value;
  } finally {
    globalForGmail.gmailAccessTokenPromise = undefined;
  }
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function gmailMode(): "live" | "simulate" {
  return env.gmail.mode === "live" ? "live" : "simulate";
}

export function gmailSenderAddress(): string {
  return env.gmail.sender;
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<GmailSendResult> {
  if (gmailMode() !== "live") {
    return { providerMessageId: `sim_${crypto.randomUUID()}`, simulated: true };
  }
  if (!gmailConfigured) {
    throw new GmailSendError("Gmail sending is not configured on the server.", {
      retryable: false,
    });
  }

  const token = await accessToken();
  const from = singleLine(env.gmail.sender);
  const raw = [
    `From: ${from}`,
    `To: ${singleLine(input.to)}`,
    `Subject: ${encodeHeader(singleLine(input.subject))}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(Buffer.from(input.body, "utf8").toString("base64")),
  ].join("\r\n");

  let response: Response;
  try {
    response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: Buffer.from(raw, "utf8").toString("base64url") }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new GmailSendError("Could not reach Gmail. Check the network connection and try again.", {
      retryable: true,
    });
  }

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; error?: { message?: string } }
    | null;
  if (!response.ok) {
    throw new GmailSendError(
      (payload?.error?.message ?? `Gmail rejected the email (HTTP ${response.status}).`).slice(
        0,
        500,
      ),
      {
        retryable: response.status === 429 || response.status >= 500,
        status: response.status,
      },
    );
  }
  if (!payload?.id) {
    throw new GmailSendError("Gmail accepted the request but did not return a message ID.", {
      retryable: true,
    });
  }
  return { providerMessageId: payload.id, simulated: false };
}
