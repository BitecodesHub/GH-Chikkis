import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Permission, User } from "@/lib/types";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { mapUser, type UserDoc } from "@/lib/users";
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

async function loadSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const sessions = db.collection<SessionDoc>("sessions");
  // The sign-in document and the account behind it come back together: two
  // round trips to Atlas on the front of every admin screen became one, and
  // revocation still takes effect on the very next request.
  const [row] = await sessions
    .aggregate<SessionDoc & { user: UserDoc | null }>([
      { $match: { tokenHash: hashToken(token), revokedAt: { $exists: false } } },
      { $limit: 1 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();
  if (!row) return null;
  const now = new Date();
  if (row.expiresAt <= now) {
    await sessions.updateOne({ _id: row._id }, { $set: { revokedAt: nowIso() } });
    return null;
  }
  const userDoc = row.user;
  if (!userDoc || !userDoc.active) {
    await sessions.updateOne({ _id: row._id }, { $set: { revokedAt: nowIso() } });
    return null;
  }
  if (row.idleExpiresAt <= now) {
    await sessions.updateOne({ _id: row._id }, { $set: { revokedAt: nowIso() } });
    return null;
  }
  const lastSeen = new Date(row.lastSeenAt);
  if (now.getTime() - lastSeen.getTime() > 60_000) {
    const settings = await getSettings();
    const nextIdle = new Date(now.getTime() + settings.security.idleMinutes * 60_000);
    await sessions.updateOne(
      { _id: row._id },
      { $set: { lastSeenAt: now.toISOString(), idleExpiresAt: nextIdle } },
    );
    row.idleExpiresAt = nextIdle;
  }
  return {
    user: mapUser(userDoc),
    sessionId: row._id,
    idleExpiresAt: row.idleExpiresAt.toISOString(),
  };
}

/**
 * The admin layout checks the sign-in and the page under it checks the
 * permission, so an uncached lookup paid two Atlas round trips on every screen
 * of the workspace. React's cache shares one resolution per request; outside a
 * request it simply calls through, which is what the scripts want.
 */
const resolveSession = cache(loadSession);

export function getSessionContext(): Promise<SessionContext | null> {
  return resolveSession();
}

export async function getSessionUser(): Promise<User | null> {
  const context = await getSessionContext();
  return context?.user ?? null;
}

/** Extends the idle window and answers with the expiry it just written. */
export async function touchSession(): Promise<string | null> {
  const context = await getSessionContext();
  if (!context) return null;
  const settings = await getSettings();
  const db = await getDb();
  const nextIdle = new Date(Date.now() + settings.security.idleMinutes * 60_000);
  await db.collection<SessionDoc>("sessions").updateOne(
    { _id: context.sessionId },
    { $set: { lastSeenAt: nowIso(), idleExpiresAt: nextIdle } },
  );
  return nextIdle.toISOString();
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
