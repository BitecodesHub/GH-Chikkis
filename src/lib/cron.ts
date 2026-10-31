import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

function safeEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isCronAuthorized(request: Request): boolean {
  if (!env.cronSecret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(`Bearer ${env.cronSecret}`, header);
}
