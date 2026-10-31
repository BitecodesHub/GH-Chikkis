import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { nowIso, formatDateDDMMYYYY } from "./dates";
import { recordAudit } from "./audit";
import { formatINR } from "./money";
import { cleanSingleLine, cleanText } from "./text";
import { GmailSendError, gmailMode, gmailSenderAddress, sendGmailMessage } from "./gmail";
import { getOrder } from "./orders";
import type { EmailMessage, MessageMode, Order, User } from "./types";

interface EmailDoc extends Omit<EmailMessage, "id"> {
  _id: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT = 200;
const MAX_BODY = 20_000;

export class EmailError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "EmailError";
    this.field = field;
  }
}

export interface EmailModeInfo {
  mode: "LIVE" | "SIMULATED";
  configured: boolean;
  sender: string;
}

export function emailModeInfo(): EmailModeInfo {
  return {
    mode: gmailMode() === "live" ? "LIVE" : "SIMULATED",
    configured: gmailSenderAddress() !== "" && gmailMode() === "live",
    sender: gmailSenderAddress(),
  };
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

function invoiceLines(snapshotItems: Order["items"]): string {
  return snapshotItems
    .map(
      (item) =>
        `- ${item.quantity} × ${item.productName} — ${item.packagingLabel} (${item.actualWeightGrams} g) — ${formatINR(
          item.lineTotalPaise,
        )}`,
    )
    .join("\n");
}

export async function buildInvoiceEmailDraft(orderId: string): Promise<EmailDraft> {
  const order = await getOrder(orderId);
  if (!order) throw new EmailError("That order could not be found.");
  if (order.type !== "SALES" || !order.invoice) {
    throw new EmailError("Invoice emails are available for sales orders only.");
  }
  const snapshot = order.invoice.snapshot;
  const deliveryLine =
    snapshot.deliveryChargePaise > 0
      ? `Delivery: ${formatINR(snapshot.deliveryChargePaise)}`
      : "";
  const contact = [snapshot.business.phone, snapshot.business.email]
    .filter(Boolean)
    .join(" · ");
  const lines = [
    `Dear ${snapshot.customer.name},`,
    "",
    "Thank you for your order with GH Chikkis. Your invoice details are below.",
    "",
    `Order: ${order.ref}`,
    `Invoice date: ${formatDateDDMMYYYY(snapshot.invoiceDate)}`,
    "",
    "Items:",
    invoiceLines(snapshot.items),
    "",
    `Subtotal: ${formatINR(snapshot.subtotalPaise)}`,
    ...(deliveryLine ? [deliveryLine] : []),
    `Total: ${formatINR(snapshot.totalPaise)}`,
    "",
    "If anything above needs correcting, reply to this email and we will help.",
  ];
  if (contact) lines.push(`You can also reach us on ${contact}.`);
  lines.push("", "Warm regards,", snapshot.business.name);
  if (snapshot.thankYou) lines.push(snapshot.thankYou);

  return {
    to: snapshot.customer.email ?? "",
    subject: `Your GH Chikkis invoice — ${order.ref}`,
    body: lines.join("\n").slice(0, MAX_BODY),
  };
}

export interface SendEmailInput {
  orderId: string;
  to: string;
  subject: string;
  body: string;
  actor: Pick<User, "id" | "name" | "email">;
  retryOfId?: string;
}

function mapEmail(doc: EmailDoc): EmailMessage {
  const { _id, ...message } = doc;
  return { id: _id, ...message };
}

export async function sendOrderEmail(input: SendEmailInput): Promise<EmailMessage> {
  const order = await getOrder(input.orderId);
  if (!order) throw new EmailError("That order could not be found.");

  const to = cleanSingleLine(input.to, 200).toLowerCase();
  if (!to) throw new EmailError("Add the customer's email address.", "to");
  if (!EMAIL_PATTERN.test(to)) throw new EmailError("That email address is not valid.", "to");
  const subject = cleanSingleLine(input.subject, MAX_SUBJECT);
  if (subject.length < 3) throw new EmailError("Write a subject line.", "subject");
  const body = cleanText(input.body, MAX_BODY);
  if (body.length < 10) throw new EmailError("Write the email body.", "body");

  const mode: MessageMode = gmailMode() === "live" ? "LIVE" : "SIMULATED";
  const now = nowIso();
  const doc: EmailDoc = {
    _id: randomUUID(),
    orderId: order.id,
    orderRef: order.ref,
    to,
    subject,
    body,
    status: "FAILED",
    mode,
    createdBy: input.actor.id,
    createdByName: input.actor.name,
    createdAt: now,
    ...(input.retryOfId ? { retryOfId: input.retryOfId } : {}),
  };

  try {
    const result = await sendGmailMessage({ to, subject, body });
    doc.status = result.simulated ? "SIMULATED" : "SENT";
    doc.providerId = result.providerMessageId;
    doc.sentAt = nowIso();
    await getDb().then((db) => db.collection<EmailDoc>("email_messages").insertOne(doc));
    await recordAudit({
      actor: input.actor,
      action: "email.send",
      entityType: "order",
      entityId: order.id,
      summary: `${result.simulated ? "Simulated email" : "Email sent"} to ${to} for ${order.ref}`,
    });
  } catch (error) {
    const message =
      error instanceof GmailSendError
        ? error.message
        : "The email could not be sent. Check the Gmail setup and try again.";
    doc.error = message.slice(0, 500);
    await getDb().then((db) =>
      db.collection<EmailDoc>("email_messages").insertOne(doc),
    );
    await recordAudit({
      actor: input.actor,
      action: "email.failed",
      entityType: "order",
      entityId: order.id,
      summary: `Email to ${to} failed for ${order.ref}: ${doc.error}`,
    });
    console.error("Email send failed", error);
  }

  return mapEmail(doc);
}

export async function getEmail(id: string): Promise<EmailMessage | null> {
  const db = await getDb();
  const doc = await db.collection<EmailDoc>("email_messages").findOne({ _id: id });
  return doc ? mapEmail(doc) : null;
}

export async function listOrderEmails(orderId: string): Promise<EmailMessage[]> {
  const db = await getDb();
  const docs = await db
    .collection<EmailDoc>("email_messages")
    .find({ orderId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(mapEmail);
}

export async function listRecentEmails(limit = 50): Promise<EmailMessage[]> {
  const db = await getDb();
  const docs = await db
    .collection<EmailDoc>("email_messages")
    .find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 200))
    .toArray();
  return docs.map(mapEmail);
}

export async function retryOrderEmail(
  emailId: string,
  actor: Pick<User, "id" | "name" | "email">,
): Promise<EmailMessage> {
  const original = await getEmail(emailId);
  if (!original) throw new EmailError("That email record could not be found.");
  if (original.status !== "FAILED") {
    throw new EmailError("Only failed emails can be retried.");
  }
  return sendOrderEmail({
    orderId: original.orderId,
    to: original.to,
    subject: original.subject,
    body: original.body,
    actor,
    retryOfId: original.id,
  });
}
