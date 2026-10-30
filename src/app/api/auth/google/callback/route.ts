import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  GoogleAuthError,
} from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { signInAllowedUser } from "@/lib/users";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const googleError = url.searchParams.get("error");
  const expectedState = request.cookies.get("gh_oauth_state")?.value;
  const verifier = request.cookies.get("gh_oauth_verifier")?.value;

  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.set("gh_oauth_state", "", { path: "/", maxAge: 0 });
    response.cookies.set("gh_oauth_verifier", "", { path: "/", maxAge: 0 });
    return response;
  };

  if (googleError) return finish("/login?error=denied");
  if (!code || !verifier || !expectedState || state !== expectedState) {
    return finish("/login?error=state");
  }

  let profile;
  try {
    const accessToken = await exchangeGoogleCode(code, verifier);
    profile = await fetchGoogleProfile(accessToken);
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return finish("/login?error=google-failed");
    }
    console.error("Google sign-in failed", error);
    return finish("/login?error=google-failed");
  }

  const user = await signInAllowedUser({
    email: profile.email,
    googleSub: profile.sub,
    name: profile.name,
    picture: profile.picture,
  });

  if (!user) {
    await recordAudit({
      actor: null,
      action: "auth.denied",
      entityType: "session",
      summary: `Sign-in blocked for unapproved account ${profile.email}`,
    });
    return finish("/login?error=not-allowed");
  }

  await createSession(user._id, {
    ip: requestIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  await recordAudit({
    actor: { id: user._id, email: user.email },
    action: "auth.signin",
    entityType: "session",
    entityId: user._id,
    summary: `Signed in with Google as ${user.email}`,
  });

  return finish("/admin");
}
