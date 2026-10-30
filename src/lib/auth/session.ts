import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission, User } from "@/lib/types";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getUserById, mapUser } from "@/lib/users";
import { hasPermission } from "@/lib/permissions";
import { nowIso } from "@/lib/dates";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "gh_session";
const ABSOLUTE_SESSION_DAYS = 30;

interface SessionDoc {
  _id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  idleExpiresAt: Date;
  expiresAt: Date;
  revokedAt?: string;
}

export interface SessionContext {
  user: User;
  sessionId: string;
  idleExpiresAt: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(
  userId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<{ token: string; idleExpiresAt: string }> {
  const settings = await getSettings();
  const idleMinutes = settings.security.idleMinutes;
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const idleExpiresAt = new Date(now.getTime() + idleMinutes * 60_000);
  const expiresAt = new Date(
    now.getTime() + ABSOLUTE_SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  const db = await getDb();
  const session: SessionDoc = {
    _id: randomUUID(),
    tokenHash: hashToken(token),
    userId,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    idleExpiresAt,
    expiresAt,
  };
  await db.collection<SessionDoc>("sessions").insertOne(session);
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    token,
    cookieOptions(ABSOLUTE_SESSION_DAYS * 24 * 60 * 60),
  );
  void meta;
  return { token, idleExpiresAt: idleExpiresAt.toISOString() };
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({
    tokenHash: hashToken(token),
    revokedAt: { $exists: false },
  });
  if (!session) return null;
  const now = new Date();
  if (session.expiresAt <= now) {
    await db
      .collection<SessionDoc>("sessions")
      .updateOne({ _id: session._id }, { $set: { revokedAt: nowIso() } });
    return null;
  }
  const userDoc = await getUserById(session.userId);
  if (!userDoc || !userDoc.active) {
    await db
      .collection<SessionDoc>("sessions")
      .updateOne({ _id: session._id }, { $set: { revokedAt: nowIso() } });
    return null;
  }
  if (session.idleExpiresAt <= now) {
    await db
      .collection<SessionDoc>("sessions")
      .updateOne({ _id: session._id }, { $set: { revokedAt: nowIso() } });
    return null;
  }
  const lastSeen = new Date(session.lastSeenAt);
  if (now.getTime() - lastSeen.getTime() > 60_000) {
    const settings = await getSettings();
    const nextIdle = new Date(now.getTime() + settings.security.idleMinutes * 60_000);
    await db.collection<SessionDoc>("sessions").updateOne(
      { _id: session._id },
      { $set: { lastSeenAt: now.toISOString(), idleExpiresAt: nextIdle } },
    );
    session.idleExpiresAt = nextIdle;
    session.lastSeenAt = now.toISOString();
  }
  return {
    user: mapUser(userDoc),
    sessionId: session._id,
    idleExpiresAt: session.idleExpiresAt.toISOString(),
  };
}

export async function getSessionUser(): Promise<User | null> {
  const context = await getSessionContext();
  return context?.user ?? null;
}

export async function touchSession(): Promise<boolean> {
  const context = await getSessionContext();
  if (!context) return false;
  const settings = await getSettings();
  const db = await getDb();
  const nextIdle = new Date(Date.now() + settings.security.idleMinutes * 60_000);
  await db.collection<SessionDoc>("sessions").updateOne(
    { _id: context.sessionId },
    { $set: { lastSeenAt: nowIso(), idleExpiresAt: nextIdle } },
  );
  return true;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db
      .collection<SessionDoc>("sessions")
      .updateOne(
        { tokenHash: hashToken(token) },
        { $set: { revokedAt: nowIso() } },
      );
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  return context;
}

export async function requirePermission(
  permission: Permission,
): Promise<SessionContext> {
  const context = await requireUser();
  if (!hasPermission(context.user, permission)) {
    redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  }
  return context;
}

export function assertPermission(user: User, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new Error("You do not have permission to do that.");
  }
}
