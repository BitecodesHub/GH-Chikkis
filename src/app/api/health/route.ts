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

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const client = await getMongoClient();
    await client.db(env.mongodbDb).command({ ping: 1 });
    return NextResponse.json({ status: "ok", database: "connected" }, { headers });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      { status: "error", database: "unavailable", reason: reason(error) },
      { status: 503, headers },
    );
  }
}
