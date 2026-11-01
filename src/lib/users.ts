import { randomUUID } from "node:crypto";
import type { Permission, Role, User } from "./types";
import { hashPassword } from "./auth/password";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { env } from "./env";
import { normalizePermissions } from "./permissions";

export const BOOTSTRAP_EMAIL = "admin@gmail.com";
export const BOOTSTRAP_PASSWORD = "admin";

export interface UserDoc {
  _id: string;
  email: string;
  googleSub?: string;
  name: string;
  role: Role;
  permissions: Permission[];
  active: boolean;
  picture?: string;
  passwordHash?: string;
  usesDefaultPassword?: boolean;
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
    canUsePassword: Boolean(doc.passwordHash),
    usesDefaultPassword: doc.usesDefaultPassword === true,
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

/**
 * The email-and-password account for the workspace, so it can be opened before
 * Google is wired up. In production the credential has to come from the
 * environment: this repository is public, so a starter password written into
 * the source is a front door rather than a bootstrap. Locally the starter pair
 * stays, because the point of it is a clone that runs with no setup.
 *
 * Deactivating the account is permanent — the row is never re-enabled.
 */
export async function ensureBootstrapAdmin(): Promise<UserDoc | null> {
  // Production needs a password from the environment; the address may keep
  // defaulting to the starter one, so setting ADMIN_PASSWORD alone is enough
  // to take back an account that already exists there.
  const password = env.adminPassword || (env.isProduction ? "" : BOOTSTRAP_PASSWORD);
  if (!password) return null;
  const email = env.adminEmail || BOOTSTRAP_EMAIL;

  const existing = await getUserByEmail(email);
  if (existing) {
    if (!existing.active) return null;
    // The configured password replaces a starter one that was never changed,
    // which doubles as the way back in for an owner who lost it.
    if (env.adminPassword && existing.usesDefaultPassword) {
      await setPasswordForUser(existing._id, env.adminPassword);
      return { ...existing, passwordHash: hashPassword(env.adminPassword), usesDefaultPassword: false };
    }
    return existing;
  }

  const now = nowIso();
  const database = await getDb();
  const doc: UserDoc = {
    _id: randomUUID(),
    email,
    name: "Admin",
    role: "OWNER",
    permissions: [],
    active: true,
    passwordHash: hashPassword(password),
    usesDefaultPassword: !env.adminPassword,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await database.collection<UserDoc>("users").insertOne(doc);
  } catch {
    return getUserByEmail(email);
  }
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

export async function recordSignIn(id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db
    .collection<UserDoc>("users")
    .updateOne({ _id: id }, { $set: { lastSignInAt: now, updatedAt: now } });
}

export async function createTeamUser(input: {
  email: string;
  name: string;
  role: Role;
  permissions: string[];
  password?: string;
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
  if (input.password) doc.passwordHash = hashPassword(input.password);
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

export async function setPasswordForUser(id: string, password: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<UserDoc>("users")
    .updateOne(
      { _id: id },
      {
        $set: {
          passwordHash: hashPassword(password),
          usesDefaultPassword: false,
          updatedAt: nowIso(),
        },
      },
    );
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
