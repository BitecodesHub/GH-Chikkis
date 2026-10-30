import { randomUUID } from "node:crypto";
import type { AuditEntry, User } from "./types";
import { getDb } from "./db";
import { nowIso } from "./dates";

interface AuditDoc extends Omit<AuditEntry, "id"> {
  _id: string;
}

export interface AuditInput {
  actor: Pick<User, "id" | "email"> | null;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  diff?: { field: string; from: string; to: string }[];
  requestId?: string;
}

function safeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.slice(0, 500);
}

export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): { field: string; from: string; to: string }[] {
  const diff: { field: string; from: string; to: string }[] = [];
  for (const field of fields) {
    const from = safeValue(before[field]);
    const to = safeValue(after[field]);
    if (from !== to) diff.push({ field, from, to });
  }
  return diff;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const db = await getDb();
  const doc: AuditDoc = {
    _id: randomUUID(),
    actorId: input.actor?.id ?? "system",
    actorEmail: input.actor?.email ?? "system",
    action: input.action.slice(0, 100),
    entityType: input.entityType.slice(0, 80),
    entityId: input.entityId?.slice(0, 100),
    summary: input.summary.slice(0, 500),
    diff: input.diff?.slice(0, 50),
    requestId: input.requestId,
    at: nowIso(),
  };
  await db.collection<AuditDoc>("audit_logs").insertOne(doc);
}

export async function listAudit(options: {
  limit?: number;
  entityType?: string;
  actorId?: string;
}): Promise<AuditEntry[]> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (options.entityType) filter.entityType = options.entityType;
  if (options.actorId) filter.actorId = options.actorId;
  const docs = await db
    .collection<AuditDoc>("audit_logs")
    .find(filter)
    .sort({ at: -1 })
    .limit(options.limit ?? 100)
    .toArray();
  return docs.map(({ _id, ...entry }) => ({ id: _id, ...entry }));
}

export async function listAuditForEntity(
  entityType: string,
  entityId: string,
  limit = 30,
): Promise<AuditEntry[]> {
  const db = await getDb();
  const docs = await db
    .collection<AuditDoc>("audit_logs")
    .find({ entityType, entityId })
    .sort({ at: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...entry }) => ({ id: _id, ...entry }));
}
