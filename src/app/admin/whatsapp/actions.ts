"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { parseRupeesToPaise } from "@/lib/money";
import { isOwner } from "@/lib/permissions";
import { updateSettings } from "@/lib/settings";
import {
  MessagingError,
  actorFromUser,
  approveNotification,
  discardNotification,
  pauseMessaging,
  processDueNotifications,
  rebuildNotification,
  resumeMessaging,
  retryNotification,
  updateTemplate,
} from "@/lib/messaging";

function back(notice: string): never {
  redirect(`/admin/whatsapp?notice=${notice}`);
}

function fail(message: string): never {
  redirect(`/admin/whatsapp?error=${encodeURIComponent(message)}`);
}

function revalidateWhatsApp(jobOrderId?: string) {
  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin");
  if (jobOrderId) {
    revalidatePath(`/admin/orders/${jobOrderId}`);
    revalidatePath("/admin/orders");
  }
}

export async function saveWhatsAppSettingsAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.review");
  const cost = parseRupeesToPaise(String(formData.get("costPerMessage") ?? "0"));
  const threshold = parseRupeesToPaise(String(formData.get("monthlyThreshold") ?? "0"));
  if (cost === null || cost < 0) fail("Enter a valid cost per message in rupees.");
  if (threshold === null || threshold < 0) fail("Enter a valid monthly limit in rupees.");
  const alertPercent = Math.round(Number(formData.get("alertPercent") ?? 80));
  if (!Number.isFinite(alertPercent) || alertPercent < 1 || alertPercent > 100) {
    fail("The alert threshold must be between 1% and 100%.");
  }
  await updateSettings(
    {
      whatsapp: {
        liveEnabled: formData.get("liveEnabled") === "on",
        estimatedCostPerMessagePaise: cost,
        monthlySpendThresholdPaise: threshold,
        alertPercent,
      },
    },
    user.email,
  );
  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: "settings.whatsapp",
    entityType: "settings",
    entityId: "whatsapp",
    summary: `WhatsApp settings updated · automation ${
      formData.get("liveEnabled") === "on" ? "on" : "off"
    } · ${alertPercent}% alert`,
  });
  revalidateWhatsApp();
  back("settings");
}

export async function pauseWhatsAppAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.review");
  try {
    await pauseMessaging(String(formData.get("reason") ?? ""), actorFromUser(user));
  } catch (error) {
    if (error instanceof MessagingError) fail(error.message);
    throw error;
  }
  revalidateWhatsApp();
  back("paused");
}

export async function resumeWhatsAppAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.review");
  try {
    await resumeMessaging(actorFromUser(user), formData.get("reviewed") === "on");
  } catch (error) {
    if (error instanceof MessagingError) fail(error.message);
    throw error;
  }
  revalidateWhatsApp();
  back("resumed");
}

export async function processQueueAction(): Promise<void> {
  await requirePermission("messaging.manage");
  const result = await processDueNotifications(20);
  revalidateWhatsApp();
  redirect(
    `/admin/whatsapp?notice=processed&processed=${result.processed}&paused=${
      result.paused ? "1" : "0"
    }`,
  );
}

export async function approveMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.review");
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) fail("That message could not be identified.");
  let orderId = "";
  try {
    const job = await approveNotification(jobId, actorFromUser(user));
    orderId = job.orderId;
  } catch (error) {
    if (error instanceof MessagingError) fail(error.message);
    throw error;
  }
  revalidateWhatsApp(orderId);
  back("approved");
}

export async function rebuildMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) fail("That message could not be identified.");
  let orderId = "";
  try {
    const job = await rebuildNotification(jobId, actorFromUser(user));
    orderId = job.orderId;
  } catch (error) {
    if (error instanceof MessagingError) fail(error.message);
    throw error;
  }
  revalidateWhatsApp(orderId);
  back("rebuilt");
}

export async function discardMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) fail("That message could not be identified.");
  let orderId = "";
  try {
    const job = await discardNotification(
      jobId,
      actorFromUser(user),
      String(formData.get("reason") ?? ""),
    );
    orderId = job.orderId;
  } catch (error) {
    if (error instanceof MessagingError) fail(error.message);
    throw error;
  }
  revalidateWhatsApp(orderId);
  back("discarded");
}

export async function retryMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) fail("That message could not be identified.");
  let orderId = "";
  try {
    const job = await retryNotification(jobId, actorFromUser(user));
    orderId = job.orderId;
  } catch (error) {
    if (error instanceof MessagingError) fail(error.message);
    throw error;
  }
  revalidateWhatsApp(orderId);
  back("retried");
}

export interface TemplateFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export async function saveTemplateAction(
  _previous: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const { user } = await requirePermission("messaging.manage");
  const templateId = String(formData.get("templateId") ?? "");
  if (!templateId) return { ok: false, message: "That template could not be identified." };
  const owner = isOwner(user);
  try {
    await updateTemplate(
      {
        id: templateId,
        name: String(formData.get("name") ?? ""),
        language: String(formData.get("language") ?? "en"),
        body: String(formData.get("body") ?? ""),
        metaTemplateName: String(formData.get("metaTemplateName") ?? ""),
        ...(owner
          ? {
              status: String(formData.get("status") ?? "") as
                | "DRAFT"
                | "PENDING"
                | "APPROVED"
                | "REJECTED"
                | "DISABLED",
              active: formData.get("active") === "on",
            }
          : {}),
      },
      actorFromUser(user),
      owner,
    );
  } catch (error) {
    if (error instanceof MessagingError) {
      return {
        ok: false,
        message: error.message,
        errors: error.field ? { [error.field]: error.message } : undefined,
      };
    }
    throw error;
  }
  revalidatePath("/admin/whatsapp");
  revalidatePath(`/admin/whatsapp/templates/${templateId}`);
  return { ok: true, message: "Template saved. A new version was recorded." };
}
