import { NextResponse } from "next/server";
import { destroySession, getSessionContext } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";

/**
 * A sign-out is only accepted from the site itself. Locally, Next reports its
 * own url under `localhost` while the browser sends the `127.0.0.1` origin it
 * was handed, so the two spellings count as one host outside production.
 */
function isSameHost(origin: string, self: string): boolean {
  if (origin === self) return true;
  if (env.isProduction) return false;
  const settle = (host: string) => host.replace(/^127\.0\.0\.1/, "localhost");
  return settle(origin) === settle(self);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (!isSameHost(new URL(origin).host, new URL(request.url).host)) {
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
