"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import {
  BackupError,
  latestSuccessfulBackup,
  runBackup,
  verifyBackupFile,
  type BackupRunRecord,
} from "@/lib/backups";

function fail(message: string): never {
  redirect(`/admin/backups?error=${encodeURIComponent(message)}`);
}

export async function runBackupAction(): Promise<void> {
  const { user } = await requirePermission("backups.manage");
  let run: BackupRunRecord;
  try {
    run = await runBackup(user.email, { id: user.id, email: user.email });
  } catch (error) {
    if (error instanceof BackupError) fail(error.message);
    throw error;
  }
  revalidatePath("/admin/backups");
  revalidatePath("/admin");
  redirect(
    `/admin/backups?notice=success&docs=${run.documentCount ?? 0}&file=${encodeURIComponent(
      run.location ?? "",
    )}`,
  );
}

export async function verifyLatestBackupAction(): Promise<void> {
  const { user } = await requirePermission("backups.manage");
  const latest = await latestSuccessfulBackup();
  if (!latest || !latest.location) {
    fail("No successful backup is available to verify yet.");
  }
  try {
    const verification = await verifyBackupFile(latest.location);
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "backup.verify",
      entityType: "backup",
      entityId: latest.id,
      summary: `Verified ${latest.location} · ${verification.documentCount} documents · checksum ${verification.checksum.slice(0, 12)}…`,
    });
    revalidatePath("/admin/backups");
    redirect(
      `/admin/backups?notice=verified&docs=${verification.documentCount}&file=${encodeURIComponent(
        latest.location,
      )}`,
    );
  } catch (error) {
    if (error instanceof BackupError) fail(error.message);
    throw error;
  }
}
