import { createHash } from "node:crypto";
import { getDb } from "./db";

interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function keyFor(scope: string, identifier: string): string {
  return createHash("sha256")
    .update(`${scope}:${identifier}`)
    .digest("hex")
    .slice(0, 40);
}

/**
 * Fixed-window limiter. Good enough for abuse control; not a billing meter.
 * The window is per process-independent Mongo document, so it works across
 * serverless instances.
 */
export async function rateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const db = await getDb();
  const collection = db.collection<RateLimitDoc>("rate_limits");
  const _id = keyFor(input.scope, input.identifier);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.windowSeconds * 1000);
  const existing = await collection.findOne({ _id });
  if (!existing || existing.expiresAt <= now) {
    await collection.updateOne(
      { _id },
      { $set: { count: 1, expiresAt } },
      { upsert: true },
    );
    return { allowed: true, remaining: input.limit - 1, retryAfterSeconds: 0 };
  }
  const updated = await collection.findOneAndUpdate(
    { _id, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: "after" },
  );
  const count = updated?.count ?? existing.count + 1;
  const allowed = count <= input.limit;
  return {
    allowed,
    remaining: Math.max(0, input.limit - count),
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000)),
  };
}

export function requestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") || "unknown";
}
