"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createPkcePair, createState, googleAuthUrl } from "@/lib/auth/google";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { env, googleConfigured } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import {
  ensureBootstrapAdmin,
  ensureOwnerUser,
  getUserByEmail,
  mapUser,
  recordSignIn,
} from "@/lib/users";

export async function startGoogleSignIn(): Promise<void> {
  if (!googleConfigured) redirect("/login?error=google-off");
  const { verifier, challenge } = createPkcePair();
  const state = createState();
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  cookieStore.set("gh_oauth_state", state, options);
  cookieStore.set("gh_oauth_verifier", verifier, options);
  redirect(googleAuthUrl(state, challenge));
}

export async function passwordSignIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=password");

  const requestHeaders = await headers();
  // A shop's whole team signs in from one connection, and each idle sign-out
  // costs another attempt. The old ceiling of eight per quarter hour locked
  // real staff out, so the per-address window is sized for four people rather
  // than one. Password guesses are still checked against a scrypt hash.
  const limit = await rateLimit({
    scope: "login:password",
    identifier: requestIp(requestHeaders),
    limit: 30,
    windowSeconds: 900,
  });
  if (!limit.allowed) redirect("/login?error=rate");

  // Bootstrapping already read the account it looks after, so signing in with
  // that address does not pay for the same read twice.
  const bootstrapped = await ensureBootstrapAdmin();
  const user =
    bootstrapped && bootstrapped.email.trim().toLowerCase() === email
      ? bootstrapped
      : await getUserByEmail(email);
  // Verified first and checked after, so an account that is locked out for
  // other reasons still costs the same scrypt run as a real sign-in.
  const passwordOk = verifyPassword(password, user?.passwordHash);
  if (!passwordOk || !user) redirect("/login?error=password");
  if (!user.active) redirect("/login?error=not-allowed");

  await createSession(user._id, {
    ip: requestIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });
  await Promise.all([
    recordSignIn(user._id),
    recordAudit({
      actor: mapUser(user),
      action: "auth.signin",
      entityType: "session",
      entityId: user._id,
      summary: `Signed in with email and password as ${user.email}`,
    }),
  ]);
  redirect("/admin");
}

export async function devSignIn(formData: FormData): Promise<void> {
  if (!env.devAuthEnabled) redirect("/login?error=dev-off");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/login?error=dev-email");

  const requestHeaders = await headers();
  const limit = await rateLimit({
    scope: "login:dev",
    identifier: requestIp(requestHeaders),
    limit: 10,
    windowSeconds: 900,
  });
  if (!limit.allowed) redirect("/login?error=dev-rate");

  let user = await getUserByEmail(email);
  if (!user && email === env.ownerEmail) {
    user = await ensureOwnerUser();
  }
  if (!user || !user.active) redirect("/login?error=not-allowed");

  await createSession(user._id, {
    ip: requestIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });
  await recordSignIn(user._id);
  await recordAudit({
    actor: mapUser(user),
    action: "auth.signin",
    entityType: "session",
    entityId: user._id,
    summary: `Signed in with development access as ${user.email}`,
  });
  redirect("/admin");
}
