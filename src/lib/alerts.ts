import { randomUUID } from "node:crypto";
import type { AlertType, Permission, SystemAlert, User } from "./types";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { hasPermission } from "./permissions";

interface AlertDoc extends Omit<SystemAlert, "id"> {
  _id: string;
}

export async function createAlert(input: {
  type: AlertType;
  severity: SystemAlert["severity"];
  title: string;
  message: string;
  permission?: Permission;
  link?: string;
}): Promise<SystemAlert> {
  const db = await getDb();
  const doc: AlertDoc = {
    _id: randomUUID(),
    type: input.type,
    severity: input.severity,
    title: input.title.slice(0, 200),
    message: input.message.slice(0, 1000),
    permission: input.permission,
    link: input.link,
    status: "OPEN",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.collection<AlertDoc>("system_alerts").insertOne(doc);
  const { _id, ...alert } = doc;
  return { id: _id, ...alert };
}

export async function listAlertsForUser(
  user: User,
  options: { status?: SystemAlert["status"]; limit?: number } = {},
): Promise<SystemAlert[]> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (options.status) filter.status = options.status;
  const docs = await db
    .collection<AlertDoc>("system_alerts")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 100)
    .toArray();
  return docs
    .filter(
      (doc) =>
        !doc.permission ||
        hasPermission(user, doc.permission) ||
        user.role === "OWNER",
    )
    .map(({ _id, ...alert }) => ({ id: _id, ...alert }));
}

export async function getAlertForUser(
  id: string,
  user: User,
): Promise<SystemAlert | null> {
  const db = await getDb();
  const doc = await db.collection<AlertDoc>("system_alerts").findOne({ _id: id });
  if (!doc) return null;
  if (
    doc.permission &&
    !hasPermission(user, doc.permission) &&
    user.role !== "OWNER"
  ) {
    return null;
  }
  const { _id, ...alert } = doc;
  return { id: _id, ...alert };
}

export async function resolveAlert(
  id: string,
  user: User,
  status: "ACKNOWLEDGED" | "RESOLVED" = "RESOLVED",
): Promise<void> {
  const db = await getDb();
  await db.collection<AlertDoc>("system_alerts").updateOne(
    { _id: id },
    {
      $set: {
        status,
        updatedAt: nowIso(),
        resolvedAt: status === "RESOLVED" ? nowIso() : undefined,
        resolvedBy: user.email,
      },
    },
  );
}

export async function countOpenAlerts(): Promise<number> {
  const db = await getDb();
  return db.collection("system_alerts").countDocuments({ status: "OPEN" });
}
