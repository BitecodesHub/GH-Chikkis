import { NextResponse } from "next/server";
import { touchSession } from "@/lib/auth/session";

export async function POST() {
  const idleExpiresAt = await touchSession();
  if (!idleExpiresAt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { idleExpiresAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
