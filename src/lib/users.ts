import { randomUUID } from "node:crypto";
import type { Permission, Role, User } from "./types";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { env } from "./env";
import { normalizePermissions } from "./permissions";

export interface UserDoc {
  _id: string;
  email: string;
  googleSub?: string;
  name: string;
  role: Role;
  permissions: Permission[];
  active: boolean;
  picture?: string;
  createdAt: string;
  updatedAt: string;
  lastSignInAt?: string;
}

export function mapUser(doc: UserDoc): User {
  return {
    id: doc._id,
    email: doc.email,
    name: doc.name,
    role: doc.role,
    permissions: doc.permissions ?? [],
    active: doc.active,
    picture: doc.picture,
    createdAt: doc.createdAt,
    lastSignInAt: doc.lastSignInAt,
  };
}

export async function getUserById(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>("users").findOne({ _id: id });
}

export async function getUserByEmail(email: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db
    .collection<UserDoc>("users")
    .findOne({ email: email.trim().toLowerCase() });
}

export async function listUsers(): Promise<User[]> {
  const db = await getDb();
  const docs = await db
    .collection<UserDoc>("users")
    .find({})
    .sort({ role: 1, name: 1 })
    .toArray();
  return docs.map(mapUser);
}

export async function ensureOwnerUser(): Promise<UserDoc | null> {
  if (!env.ownerEmail) return null;
  const existing = await getUserByEmail(env.ownerEmail);
  if (existing) return existing;
  const db = await getDb();
  const now = nowIso();
  const doc: UserDoc = {
    _id: randomUUID(),
    email: env.ownerEmail,
    name: "Owner",
    role: "OWNER",
    permissions: [],
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<UserDoc>("users").insertOne(doc);
  return doc;
}

export async function signInAllowedUser(input: {
  email: string;
  googleSub?: string;
  name?: string;
  picture?: string;
}): Promise<UserDoc | null> {
  const email = input.email.trim().toLowerCase();
  let user = await getUserByEmail(email);
  if (!user && env.ownerEmail && email === env.ownerEmail) {
    user = await ensureOwnerUser();
  }
  if (!user || !user.active) return null;
  if (input.googleSub && user.googleSub && user.googleSub !== input.googleSub) {
    return null;
  }
  const db = await getDb();
  const now = nowIso();
  const update: Partial<UserDoc> = {
    lastSignInAt: now,
    updatedAt: now,
  };
  if (input.googleSub && !user.googleSub) update.googleSub = input.googleSub;
  if (input.name && (!user.name || user.name === "Owner")) update.name = input.name;
  if (input.picture) update.picture = input.picture;
  await db.collection<UserDoc>("users").updateOne({ _id: user._id }, { $set: update });
  return { ...user, ...update };
}

export async function createTeamUser(input: {
  email: string;
  name: string;
  role: Role;
  permissions: string[];
}): Promise<UserDoc> {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  const existing = await getUserByEmail(email);
  if (existing) throw new Error("A user with this email already exists.");
  const now = nowIso();
  const doc: UserDoc = {
    _id: randomUUID(),
    email,
    name: input.name.trim().slice(0, 120) || email,
    role: input.role,
    permissions: normalizePermissions(input.permissions, input.role),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<UserDoc>("users").insertOne(doc);
  return doc;
}

export async function updateUserAccess(
  id: string,
  input: {
    name?: string;
    role?: Role;
    permissions?: string[];
    active?: boolean;
  },
): Promise<UserDoc | null> {
  const db = await getDb();
  const existing = await getUserById(id);
  if (!existing) return null;
  const role = input.role ?? existing.role;
  if (existing.role === "OWNER" && role !== "OWNER" && input.active !== false) {
    throw new Error("The Owner role cannot be removed while the account is active.");
  }
  const update: Partial<UserDoc> = {
    updatedAt: nowIso(),
    role,
    permissions:
      input.permissions !== undefined
        ? normalizePermissions(input.permissions, role)
        : existing.permissions,
    active: input.active ?? existing.active,
  };
  if (input.name !== undefined) update.name = input.name.trim().slice(0, 120);
  await db.collection<UserDoc>("users").updateOne({ _id: id }, { $set: update });
  return { ...existing, ...update };
}

export async function revokeSessionsForUser(userId: string): Promise<void> {
  const db = await getDb();
  await db
    .collection("sessions")
    .updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: nowIso() } },
    );
}
