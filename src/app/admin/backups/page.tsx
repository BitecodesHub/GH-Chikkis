import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  DatabaseBackup,
  HardDrive,
  Play,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import {
  backupsConfigured,
  latestSuccessfulBackup,
  listBackupFiles,
  listBackupRuns,
} from "@/lib/backups";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { BackupStatus } from "@/lib/types";
import { runBackupAction, verifyLatestBackupAction } from "./actions";

export const metadata: Metadata = { title: "Backups" };

const STATUS_STYLES: Record<BackupStatus, string> = {
  RUNNING: "border-brass text-brass",
  SUCCESS: "border-olive-soft text-olive",
  FAILED: "border-terracotta text-terracotta",
};

function bytes(value: number | undefined): string {
  if (!value || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) {
    return (
      <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
        {error}
      </p>
    );
  }
  if (params.notice === "success") {
    return (
      <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        Backup completed and verified · {String(params.docs ?? "0")} documents ·{" "}
        <span className="font-mono text-[0.75rem]">{String(params.file ?? "")}</span>
      </p>
    );
  }
  if (params.notice === "verified") {
    return (
      <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        Backup file decrypted and verified · {String(params.docs ?? "0")} documents ·{" "}
        <span className="font-mono text-[0.75rem]">{String(params.file ?? "")}</span>
      </p>
    );
  }
  return null;
}

export default async function AdminBackupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("backups.manage");
  const params = await searchParams;
  const [runs, latest, files, settings] = await Promise.all([
    listBackupRuns(30),
    latestSuccessfulBackup(),
    listBackupFiles(),
    getSettings(),
  ]);
  const configured = backupsConfigured();
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const lastFailed = runs.find((run) => run.status === "FAILED");
  const latestRun = runs[0];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin"
        title="Backups"
        description="Encrypted database backups, verification and the restore path. A backup is only marked successful after the written file is decrypted and its document count checked."
        actions={
          <form action={runBackupAction}>
            <button type="submit" className="btn btn-solid btn-sm" disabled={!configured}>
              <Play aria-hidden="true" className="size-3.5" />
              Run backup now
            </button>
          </form>
        }
      />

      <Notice params={params} />

      {!configured ? (
        <div className="flex items-start gap-3 border border-brass bg-paper-raised px-4 py-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brass" />
          <div className="text-[0.875rem]">
            <p className="font-medium">Backup encryption is not configured.</p>
            <p className="mt-0.5 text-ink-soft">
              Add a long random <code>BACKUP_ENCRYPTION_KEY</code> to the environment. Backups stay
              disabled until a key is present, and production requires one.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Backup status">
        <div className="surface p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Last successful backup
          </p>
          <p className="mt-3 text-[1.125rem]">
            {latest ? formatDateTime(latest.startedAt) : "Never"}
          </p>
          <p className="mt-1 text-[0.75rem] text-ink-muted">
            {latest ? relativeTime(latest.startedAt) : "No verified backup yet."}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Backup files
          </p>
          <p className="mt-3 text-[1.125rem]">
            {files.length} file{files.length === 1 ? "" : "s"} · {bytes(totalBytes)}
          </p>
          <p className="mt-1 text-[0.75rem] text-ink-muted">
            {env.backup.provider === "local" ? "Local encrypted storage" : env.backup.provider}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Retention
          </p>
          <p className="mt-3 text-[1.125rem]">{settings.backup.retentionDays} days</p>
          <p className="mt-1 text-[0.75rem] text-ink-muted">
            Older files are pruned after a successful run. The newest file is always kept.
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Encryption
          </p>
          <p className="mt-3 text-[1.125rem]">{configured ? "AES-256-GCM" : "Not configured"}</p>
          <p className="mt-1 text-[0.75rem] text-ink-muted">
            Each file uses a fresh random salt and IV. The key never leaves the environment.
          </p>
        </div>
      </section>

      {lastFailed ? (
        <div className="flex items-start gap-3 border border-terracotta bg-paper-raised px-4 py-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-terracotta" />
          <div className="text-[0.875rem]">
            <p className="font-medium">A recent backup failed.</p>
            <p className="mt-0.5 text-ink-soft">
              {lastFailed.error ?? "No detail recorded."} Last success:{" "}
              {latest ? formatDateTime(latest.startedAt) : "never"}. Resolve the cause, then run a
              backup and verify it.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="surface" aria-labelledby="backup-history">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
            <h2
              id="backup-history"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
            >
              <DatabaseBackup aria-hidden="true" className="size-4 text-brass" />
              Backup history
            </h2>
            <span className="meta">{runs.length} runs</span>
          </div>
          {runs.length === 0 ? (
            <p className="px-5 py-12 text-center text-[0.875rem] text-ink-muted">
              No backup has run yet. Use “Run backup now” or the scheduled endpoint.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {runs.map((run) => (
                <li key={run.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={cn("pill", STATUS_STYLES[run.status])}>
                      {run.status === "SUCCESS" ? "Verified" : run.status.toLowerCase()}
                    </span>
                    <p className="min-w-0 flex-1 text-[0.875rem]">
                      {run.status === "SUCCESS"
                        ? `${run.documentCount ?? 0} documents · ${bytes(run.sizeBytes)}`
                        : run.status === "FAILED"
                          ? "Backup failed"
                          : "Backup in progress"}
                    </p>
                    <p className="text-[0.75rem] text-ink-muted">{formatDateTime(run.startedAt)}</p>
                  </div>
                  <p className="mt-1 text-[0.75rem] text-ink-muted">
                    Triggered by {run.triggeredBy} · {run.attempts} attempt
                    {run.attempts === 1 ? "" : "s"}
                    {run.location ? (
                      <>
                        {" · "}
                        <span className="font-mono">{run.location}</span>
                      </>
                    ) : null}
                  </p>
                  {run.status === "FAILED" && run.error ? (
                    <p className="mt-1 text-[0.75rem] text-terracotta">{run.error}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
            <p className="text-[0.75rem] text-ink-muted">
              {latestRun?.status === "SUCCESS"
                ? "The newest run is verified."
                : "Verify the latest file before relying on it."}
            </p>
            <form action={verifyLatestBackupAction}>
              <button type="submit" className="btn btn-outline btn-sm" disabled={!latest}>
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                Verify latest backup
              </button>
            </form>
          </div>
        </section>

        <section className="surface p-5" aria-labelledby="restore-notes">
          <h2 id="restore-notes" className="flex items-center gap-2 font-medium">
            <HardDrive aria-hidden="true" className="size-4 text-brass" />
            Restore & schedule
          </h2>
          <div className="mt-3 space-y-3 text-[0.8125rem] leading-relaxed text-ink-soft">
            <p>
              Restore always targets a separate database first. The script refuses to write over
              the live database.
            </p>
            <pre className="overflow-x-auto border border-line bg-paper-raised px-3 py-2 font-mono text-[0.6875rem] leading-relaxed">
{`npm run backup
npm run restore -- --target ghchikkis_restore_test --confirm`}
            </pre>
            <p>
              After checking customers, orders, invoices, payments, inventory, content and audits,
              plan a cutover with the app stopped. Recovery steps belong in the handover notes.
            </p>
            <p>
              Schedule a daily call to <code>/api/cron/backups</code> with{" "}
              <code>Authorization: Bearer $CRON_SECRET</code>. Repeated calls within 20 hours are
              skipped, and failures raise an Owner alert.
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="size-3.5 text-olive" />
              The local directory is excluded from git. Keep the encryption key in a separate,
              backed-up secret store.
            </p>
            <Link href="/admin/settings" className="inline-block text-olive-deep hover:underline">
              Change retention in Settings
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
