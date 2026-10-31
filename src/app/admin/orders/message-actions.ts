"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { EmailError, retryOrderEmail, sendOrderEmail } from "@/lib/email";
import {
  MessagingError,
  actorFromUser,
  approveNotification,
  discardNotification,
  enqueueOrderMessage,
  rebuildNotification,
  retryNotification,
} from "@/lib/messaging";

function backToOrder(orderId: string, query: string): never {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/whatsapp");
  redirect(`/admin/orders/${orderId}?${query}`);
}

function failOrder(orderId: string, message: string): never {
  backToOrder(orderId, `error=${encodeURIComponent(message)}`);
}

export async function sendOrderMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/admin/orders");
  const requestedType = String(formData.get("type") ?? "INVOICE_DETAILS");
  const type = requestedType === "CORRECTION" ? "CORRECTION" : "INVOICE_DETAILS";
  try {
    const job = await enqueueOrderMessage({
      orderId,
      type,
      customMessage: String(formData.get("customMessage") ?? ""),
      actor: actorFromUser(user),
      idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
    });
    backToOrder(orderId, `message=1&state=${job.status.toLowerCase()}`);
  } catch (error) {
    if (error instanceof MessagingError) failOrder(orderId, error.message);
    throw error;
  }
}

export async function sendOrderEmailAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/admin/emails");
  let resultState = "failed";
  try {
    const record = await sendOrderEmail({
      orderId,
      to: String(formData.get("to") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
      actor: { id: user.id, name: user.name, email: user.email },
    });
    resultState = record.status.toLowerCase();
  } catch (error) {
    if (error instanceof EmailError) failOrder(orderId, error.message);
    throw error;
  }
  revalidatePath("/admin/emails");
  backToOrder(orderId, `email=1&state=${resultState}`);
}

export async function retryOrderEmailAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const emailId = String(formData.get("emailId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!emailId) redirect("/admin/emails");
  let resultState = "failed";
  try {
    const record = await retryOrderEmail(emailId, {
      id: user.id,
      name: user.name,
      email: user.email,
    });
    resultState = record.status.toLowerCase();
  } catch (error) {
    if (error instanceof EmailError) {
      if (orderId) failOrder(orderId, error.message);
      redirect(`/admin/emails?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/admin/emails");
  if (!orderId) redirect(`/admin/emails?email=1&state=${resultState}`);
  backToOrder(orderId, `email=1&state=${resultState}`);
}

function orderQuery(query: string): never {
  redirect(`/admin/orders?${query}`);
}

export async function approveOrderMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.review");
  const jobId = String(formData.get("jobId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!jobId || !orderId) orderQuery("error=Message%20not%20found");
  try {
    await approveNotification(jobId, actorFromUser(user));
  } catch (error) {
    if (error instanceof MessagingError) failOrder(orderId, error.message);
    throw error;
  }
  revalidatePath(`/admin/orders/${orderId}`);
  backToOrder(orderId, "message_action=approved");
}

export async function rebuildOrderMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const jobId = String(formData.get("jobId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!jobId || !orderId) orderQuery("error=Message%20not%20found");
  try {
    await rebuildNotification(jobId, actorFromUser(user));
  } catch (error) {
    if (error instanceof MessagingError) failOrder(orderId, error.message);
    throw error;
  }
  backToOrder(orderId, "message_action=rebuilt");
}

export async function discardOrderMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const jobId = String(formData.get("jobId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!jobId || !orderId) orderQuery("error=Message%20not%20found");
  const reason = String(formData.get("reason") ?? "");
  try {
    await discardNotification(jobId, actorFromUser(user), reason);
  } catch (error) {
    if (error instanceof MessagingError) failOrder(orderId, error.message);
    throw error;
  }
  revalidatePath(`/admin/orders/${orderId}`);
  backToOrder(orderId, "message_action=discarded");
}

export async function retryOrderMessageAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const jobId = String(formData.get("jobId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!jobId || !orderId) orderQuery("error=Message%20not%20found");
  try {
    await retryNotification(jobId, actorFromUser(user));
  } catch (error) {
    if (error instanceof MessagingError) failOrder(orderId, error.message);
    throw error;
  }
  backToOrder(orderId, "message_action=retried");
}
