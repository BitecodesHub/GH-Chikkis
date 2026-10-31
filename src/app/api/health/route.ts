import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function reason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/Invalid scheme|must start with|connection string/i.test(message)) return "malformed_uri";
  if (/getaddrinfo|ENOTFOUND|SRV|querySrv/i.test(message)) return "dns";
  if (/timed out|timeout/i.test(message)) return "unreachable";
  if (/Authenticat/i.test(message)) return "auth";
  return "unknown";
}

// Reports only whether the stored value is well formed, never any part of it.
function shape(value: string) {
  return {
    startsWithScheme: /^(mongodb:\/\/|mongodb\+srv:\/\/)/i.test(value),
    hasEnvKeyPrefix: /^MONGODB_URI\s*=/i.test(value),
    wrappedInQuotes: /^["']|["']$/.test(value),
    hasBackticks: value.includes("`"),
    hasInvisibleCharacter: /[\u00A0\u2000-\u200B\u2060\uFEFF]/.test(value),
    hasLeadingOrTrailingComma: /^[,;]|[,;]$/.test(value),
    length: value.length,
  };
}

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const client = await getMongoClient();
    await client.db(env.mongodbDb).command({ ping: 1 });
    return NextResponse.json({ status: "ok", database: "connected" }, { headers });
  } catch (error) {
    console.error("Health check failed", error);
    const code = reason(error);
    return NextResponse.json(
      {
        status: "error",
        database: "unavailable",
        reason: code,
        ...(code === "malformed_uri" ? { uriShape: shape(env.mongodbUri) } : {}),
      },
      { status: 503, headers },
    );
  }
}
