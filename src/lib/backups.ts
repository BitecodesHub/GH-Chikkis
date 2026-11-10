import { randomUUID } from "node:crypto";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import type { BackupRun } from "./types";
import { getDb } from "./db";
import { env } from "./env";
import { getSettings } from "./settings";
import { recordAudit } from "./audit";
import { nowIso } from "./dates";
import { createAlert } from "./alerts";

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

interface BackupRunDoc extends Omit<BackupRun, "id"> {
  _id: string;
  attempts?: number;
  fileName?: string;
}

export interface BackupRunRecord extends BackupRun {
  attempts: number;
  fileName?: string;
}

interface BackupPayload {
  format: 1;
  app: "gh-chikkis";
  createdAt: string;
  sourceDb: string;
  collections: Record<string, unknown[]>;
}

export interface BackupVerification {
  createdAt: string;
  sourceDb: string;
  documentCount: number;
  collections: Record<string, number>;
  checksum: string;
  sizeBytes: number;
}

const MAGIC = Buffer.from("GHCHK1");
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const EXCLUDED_COLLECTIONS = new Set(["sessions", "rate_limits", "backup_runs"]);
const FILE_PREFIX = "ghchikkis-";

function backupDir(): string {
  // Runtime data, not a build asset: without the ignore the tracer copies the
  // whole project into every server bundle.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.backup.localDir || ".backups");
}

function requireKey(): string {
  const key = env.backup.encryptionKey;
  if (!key) {
    throw new BackupError(
      "BACKUP_ENCRYPTION_KEY is not set. Add a long random value to the environment before running backups.",
    );
  }
  if (key.length < 16) {
    throw new BackupError("BACKUP_ENCRYPTION_KEY must be at least 16 characters long.");
  }
  return key;
}

function encryptBuffer(plain: Buffer, secret: string): Buffer {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = scryptSync(secret, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, tag, ciphertext]);
}

function decryptBuffer(file: Buffer, secret: string): Buffer {
  const headerLength = MAGIC.length + SALT_BYTES + IV_BYTES + TAG_BYTES;
  if (file.length < headerLength || !file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new BackupError("This file is not a GH Chikkis backup.");
  }
  let offset = MAGIC.length;
  const salt = file.subarray(offset, offset + SALT_BYTES);
  offset += SALT_BYTES;
  const iv = file.subarray(offset, offset + IV_BYTES);
  offset += IV_BYTES;
  const tag = file.subarray(offset, offset + TAG_BYTES);
  offset += TAG_BYTES;
  const ciphertext = file.subarray(offset);
  const key = scryptSync(secret, salt, 32);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new BackupError(
      "The backup could not be decrypted. Check that BACKUP_ENCRYPTION_KEY matches the key used to create it.",
    );
  }
}

function parsePayload(plain: Buffer): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(gunzipSync(plain).toString("utf8"));
  } catch {
    throw new BackupError("The backup contents are corrupted or incomplete.");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as BackupPayload).format !== 1 ||
    (parsed as BackupPayload).app !== "gh-chikkis" ||
    typeof (parsed as BackupPayload).collections !== "object"
  ) {
    throw new BackupError("The backup contents are not in a recognised format.");
  }
  return parsed as BackupPayload;
}

function mapRun(doc: BackupRunDoc): BackupRunRecord {
  const { _id, ...rest } = doc;
  return { id: _id, attempts: doc.attempts ?? 1, ...rest };
}

function safeFileName(name: string): string {
  const base = path.basename(name);
  if (!base.startsWith(FILE_PREFIX) || base !== name) {
    throw new BackupError("That backup file name is not valid.");
  }
  return base;
}

function backupFileName(dbName: string): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const safeDb = dbName.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${FILE_PREFIX}${safeDb}-${stamp}.gcb`;
}

async function readCollections(): Promise<{
  collections: Record<string, unknown[]>;
  documentCount: number;
}> {
  const db = await getDb();
  const infos = await db.listCollections().toArray();
  const names = infos
    .map((info) => info.name)
    .filter((name) => !name.startsWith("system.") && !EXCLUDED_COLLECTIONS.has(name))
    .sort();
  const collections: Record<string, unknown[]> = {};
  let documentCount = 0;
  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    collections[name] = docs;
    documentCount += docs.length;
  }
  return { collections, documentCount };
}

async function writeBackupFile(
  dbName: string,
): Promise<{
  fileName: string;
  checksum: string;
  sizeBytes: number;
  documentCount: number;
}> {
  if (env.backup.provider !== "local") {
    throw new BackupError(
      `Backup provider "${env.backup.provider}" is not implemented. Use BACKUP_PROVIDER=local with an encrypted local directory, or mount remote storage at that path.`,
    );
  }
  return writeLocalBackupFile(dbName);
}

async function writeLocalBackupFile(
  dbName: string,
): Promise<{
  fileName: string;
  checksum: string;
  sizeBytes: number;
  documentCount: number;
}> {
  const secret = requireKey();
  await mkdir(backupDir(), { recursive: true });
  const { collections, documentCount } = await readCollections();
  const payload: BackupPayload = {
    format: 1,
    app: "gh-chikkis",
    createdAt: nowIso(),
    sourceDb: dbName,
    collections,
  };
  const plain = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
  const encrypted = encryptBuffer(plain, secret);
  const fileName = backupFileName(dbName);
  const finalPath = path.join(backupDir(), fileName);
  const tempPath = `${finalPath}.tmp`;
  await writeFile(tempPath, encrypted, { mode: 0o600 });
  await rename(tempPath, finalPath);
  const checksum = createHash("sha256").update(encrypted).digest("hex");
  return { fileName, checksum, sizeBytes: encrypted.length, documentCount };
}

export async function verifyBackupFile(fileName: string): Promise<BackupVerification> {
  const secret = requireKey();
  const safe = safeFileName(fileName);
  const file = await readFile(path.join(/* turbopackIgnore: true */ backupDir(), safe));
  const payload = parsePayload(decryptBuffer(file, secret));
  const counts: Record<string, number> = {};
  let documentCount = 0;
  for (const [name, docs] of Object.entries(payload.collections)) {
    const count = Array.isArray(docs) ? docs.length : 0;
    counts[name] = count;
    documentCount += count;
  }
  return {
    createdAt: payload.createdAt,
    sourceDb: payload.sourceDb,
    documentCount,
    collections: counts,
    checksum: createHash("sha256").update(file).digest("hex"),
    sizeBytes: file.length,
  };
}

export async function decodeBackupFile(
  fileName: string,
): Promise<{ fileName: string; payload: BackupPayload; verification: BackupVerification }> {
  const secret = requireKey();
  const safe = safeFileName(fileName);
  const file = await readFile(path.join(/* turbopackIgnore: true */ backupDir(), safe));
  const payload = parsePayload(decryptBuffer(file, secret));
  const verification = await verifyBackupFile(safe);
  return { fileName: safe, payload, verification };
}

export async function listBackupFiles(): Promise<
  { name: string; sizeBytes: number; modifiedAt: string }[]
> {
  try {
    const names = await readdir(/* turbopackIgnore: true */ backupDir());
    const files = await Promise.all(
      names
        .filter((name) => name.startsWith(FILE_PREFIX) && name.endsWith(".gcb"))
        .map(async (name) => {
          const info = await stat(path.join(/* turbopackIgnore: true */ backupDir(), name));
          return { name, sizeBytes: info.size, modifiedAt: info.mtime.toISOString() };
        }),
    );
    return files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  } catch {
    return [];
  }
}

async function pruneOldBackups(currentFileName: string): Promise<number> {
  const settings = await getSettings();
  const retentionDays = settings.backup.retentionDays || 30;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await listBackupFiles();
  let removed = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (file.name === currentFileName) continue;
    if (index === 0) continue;
    if (new Date(file.modifiedAt).getTime() >= cutoff) continue;
    try {
      await unlink(path.join(/* turbopackIgnore: true */ backupDir(), file.name));
      removed += 1;
    } catch {
      // A missing or locked old file must not fail a completed backup.
    }
  }
  return removed;
}

export function backupsConfigured(): boolean {
  return Boolean(env.backup.encryptionKey);
}

export async function listBackupRuns(limit = 20): Promise<BackupRunRecord[]> {
  const db = await getDb();
  const docs = await db
    .collection<BackupRunDoc>("backup_runs")
    .find({})
    .sort({ startedAt: -1 })
    .limit(Math.min(limit, 100))
    .toArray();
  return docs.map(mapRun);
}

export async function latestSuccessfulBackup(): Promise<BackupRunRecord | null> {
  const db = await getDb();
  const doc = await db
    .collection<BackupRunDoc>("backup_runs")
    .findOne({ status: "SUCCESS" }, { sort: { startedAt: -1 } });
  return doc ? mapRun(doc) : null;
}

export interface BackupActor {
  id: string;
  email: string;
}

export async function runBackup(
  triggeredBy: string,
  actor: BackupActor | null = null,
): Promise<BackupRunRecord> {
  const db = await getDb();
  const runs = db.collection<BackupRunDoc>("backup_runs");
  const startedAt = nowIso();
  const runId = randomUUID();
  await runs.insertOne({
    _id: runId,
    status: "RUNNING",
    startedAt,
    provider: env.backup.provider,
    triggeredBy,
    attempts: 0,
  });

  const attempts = 2;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const written = await writeBackupFile(env.mongodbDb);
      const verification = await verifyBackupFile(written.fileName);
      if (verification.documentCount !== written.documentCount) {
        throw new BackupError("The backup verification found a different document count.");
      }
      const finishedAt = nowIso();
      await runs.updateOne(
        { _id: runId },
        {
          $set: {
            status: "SUCCESS",
            finishedAt,
            sizeBytes: written.sizeBytes,
            checksum: written.checksum,
            location: written.fileName,
            fileName: written.fileName,
            documentCount: written.documentCount,
            attempts: attempt,
          },
        },
      );
      await pruneOldBackups(written.fileName);
      await recordAudit({
        actor: actor ? { id: actor.id, email: actor.email } : null,
        action: "backup.run",
        entityType: "backup",
        entityId: runId,
        summary: `Encrypted backup verified · ${written.documentCount} documents · ${written.fileName}`,
      });
      return {
        id: runId,
        status: "SUCCESS",
        startedAt,
        finishedAt,
        sizeBytes: written.sizeBytes,
        checksum: written.checksum,
        location: written.fileName,
        fileName: written.fileName,
        provider: env.backup.provider,
        triggeredBy,
        documentCount: written.documentCount,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message.slice(0, 500) : "The backup failed.";
  const failedAt = nowIso();
  await runs.updateOne(
    { _id: runId },
    {
      $set: {
        status: "FAILED",
        finishedAt: failedAt,
        error: message,
        attempts,
      },
    },
  );
  try {
    await createAlert({
      type: "BACKUP_FAILED",
      severity: "CRITICAL",
      title: "Encrypted backup failed",
      message: `${message} Last successful backup: ${
        (await latestSuccessfulBackup())?.startedAt ?? "never"
      }.`,
      permission: "backups.manage",
    });
  } catch {
    // The alert is best-effort; the failed run is already stored.
  }
  await recordAudit({
    actor: actor ? { id: actor.id, email: actor.email } : null,
    action: "backup.failed",
    entityType: "backup",
    entityId: runId,
    summary: `Backup failed after ${attempts} attempts · ${message}`,
  });
  throw new BackupError(
    `${message} The failure was recorded and an alert was raised.`,
  );
}

export async function runScheduledBackup(): Promise<{
  skipped: boolean;
  run: BackupRunRecord | null;
}> {
  const last = await latestSuccessfulBackup();
  if (last) {
    const ageMs = Date.now() - new Date(last.startedAt).getTime();
    if (ageMs < 20 * 60 * 60 * 1000) {
      return { skipped: true, run: last };
    }
  }
  return { skipped: false, run: await runBackup("cron") };
}
