import "server-only";
import { env } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  if (!env.turnstile.secretKey || !env.turnstile.siteKey) return true;
  if (!token) return false;

  const body = new URLSearchParams({
    secret: env.turnstile.secretKey,
    response: token,
  });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { success?: boolean };
    return payload.success === true;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}
