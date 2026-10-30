import { NextResponse } from "next/server";
import { getSessionContext, touchSession } from "@/lib/auth/session";

export async function POST() {
  const context = await getSessionContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await touchSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const refreshed = await getSessionContext();
  return NextResponse.json(
    { idleExpiresAt: refreshed?.idleExpiresAt ?? context.idleExpiresAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
