"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { deleteAuditEntries, recordAudit } from "@/lib/audit";

const MAX_IDS = 200;

export async function deleteAuditEntriesAction(
  ids: string[],
): Promise<{ ok: boolean; message: string }> {
  const { user } = await requirePermission("settings.manage");
  const clean = Array.isArray(ids)
    ? [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 100))]
    : [];
  if (clean.length === 0) return { ok: false, message: "Tick at least one entry." };
  if (clean.length > MAX_IDS) return { ok: false, message: `Delete at most ${MAX_IDS} entries at a time.` };
  try {
    const { deleted, onlyDeletionRecords } = await deleteAuditEntries(clean);
    // Clearing old deletion notes must not leave a fresh note behind each time.
    if (deleted > 0 && !onlyDeletionRecords) {
      await recordAudit({
        actor: user,
        action: "audit.delete",
        entityType: "settings",
        summary: `Deleted ${deleted} audit ${deleted === 1 ? "entry" : "entries"}`,
      });
    }
    revalidatePath("/admin/audit");
    return { ok: true, message: `${deleted} ${deleted === 1 ? "entry" : "entries"} deleted.` };
  } catch (error) {
    console.error("Audit deletion failed", error);
    return { ok: false, message: "Could not delete these entries. Please retry." };
  }
}
