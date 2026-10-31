"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { getAlertForUser, resolveAlert } from "@/lib/alerts";

export async function resolveAlertAction(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const requested = String(formData.get("status") ?? "RESOLVED");
  const status = requested === "ACKNOWLEDGED" ? "ACKNOWLEDGED" : "RESOLVED";
  const alert = await getAlertForUser(id, user);
  if (!alert) {
    redirect("/admin/alerts?error=That+alert+could+not+be+found.");
  }
  await resolveAlert(id, user, status);
  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: status === "RESOLVED" ? "alert.resolve" : "alert.acknowledge",
    entityType: "alert",
    entityId: id,
    summary: `${status === "RESOLVED" ? "Resolved" : "Acknowledged"} alert: ${alert.title}`,
  });
  revalidatePath("/admin/alerts");
  revalidatePath("/admin");
  redirect(`/admin/alerts?updated=${status === "RESOLVED" ? "resolved" : "acknowledged"}`);
}
