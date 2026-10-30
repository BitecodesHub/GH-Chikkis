import { NextResponse } from "next/server";
import { destroySession, getSessionContext } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } catch {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const context = await getSessionContext();
  await destroySession();
  if (context) {
    await recordAudit({
      actor: context.user,
      action: "auth.signout",
      entityType: "session",
      entityId: context.sessionId,
      summary: `Signed out ${context.user.email}`,
    });
  }
  return NextResponse.redirect(new URL("/login?notice=signed-out", request.url), 303);
}
