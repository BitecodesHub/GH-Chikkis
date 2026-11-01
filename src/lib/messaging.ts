import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { nowIso, businessToday, businessDateStartUtc, formatDateDDMMYYYY, monthLabel } from "./dates";
import { recordAudit } from "./audit";
import { createAlert } from "./alerts";
import { getSettings, pauseWhatsApp, resumeWhatsApp } from "./settings";
import { formatINR } from "./money";
import { weightAside } from "./quantity";
import { normalizePhone, waLink } from "./phone";
import { cleanSingleLine, cleanText } from "./text";
import { env, whatsappConfigured } from "./env";
import { TEMPLATE_DEFAULTS, ensureDefaultTemplates, type TemplateDefault } from "./message-templates";
import {
  sendWhatsAppTemplate,
  simulatedWhatsAppId,
  WhatsAppSendError,
  type WhatsAppStatusEvent,
} from "./whatsapp-provider";
import type {
  AppSettings,
  Consent,
  MessageTemplate,
  NotificationJob,
  NotificationStatus,
  NotificationType,
  Order,
  TemplateStatus,
  TemplateVersion,
  User,
} from "./types";

interface NotificationJobDoc extends Omit<NotificationJob, "id"> {
  _id: string;
}
interface TemplateDoc extends Omit<MessageTemplate, "id"> {
  _id: string;
}
interface TemplateVersionDoc extends TemplateVersion {
  _id: string;
}
interface ConsentDoc extends Consent {
  _id: string;
}
interface OrderDoc extends Omit<Order, "id"> {
  _id: string;
}
interface NotificationEventDoc {
  _id: string;
  jobId: string;
  providerStatus: string;
  at: string;
  detail?: string;
}

const MAX_ATTEMPTS = 3;
const MAX_BODY_LENGTH = 1024;
const MAX_CORRECTION_LENGTH = 800;

export class MessagingError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "MessagingError";
    this.field = field;
  }
}

export interface MessageActor {
  id: string;
  name: string;
  email: string;
}

export interface MessagingMode {
  mode: "LIVE" | "SIMULATED";
  liveConfigured: boolean;
}

export function messagingModeInfo(): MessagingMode {
  return {
    mode: env.whatsapp.mode === "live" ? "LIVE" : "SIMULATED",
    liveConfigured: whatsappConfigured,
  };
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  ORDER_COMPLETED: "Order completed",
  INVOICE_DETAILS: "Invoice details",
  CORRECTION: "Correction / follow-up",
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  QUEUED: "Queued",
  NEEDS_REVIEW: "Needs review",
  SENDING: "Sending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  READ: "Read",
  FAILED: "Failed",
  SIMULATED: "Test mode — not sent",
  DISCARDED: "Discarded",
  BLOCKED: "Blocked",
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Awaiting Meta approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DISABLED: "Disabled",
};

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

export function extractPlaceholders(body: string): string[] {
  const found: string[] = [];
  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

function templateDefault(type: NotificationType): TemplateDefault {
  const found = TEMPLATE_DEFAULTS.find((item) => item.type === type);
  if (!found) throw new MessagingError("That message type is not supported.");
  return found;
}

function validateTemplateBody(type: NotificationType, rawBody: string): {
  body: string;
  placeholders: string[];
} {
  const body = rawBody.replace(/\r\n/g, "\n").trim();
  if (body.length < 10) {
    throw new MessagingError("Write a message body of at least 10 characters.", "body");
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw new MessagingError(
      `The template body must be ${MAX_BODY_LENGTH} characters or fewer for WhatsApp.`,
      "body",
    );
  }
  if (body.includes("{{") || body.includes("}}")) {
    const stripped = body.replace(PLACEHOLDER_PATTERN, "");
    if (stripped.includes("{{") || stripped.includes("}}")) {
      throw new MessagingError(
        "One of the placeholders is incomplete. Use the double-brace format shown below.",
        "body",
      );
    }
  }
  const allowed = templateDefault(type).placeholders;
  const placeholders = extractPlaceholders(body);
  const unknown = placeholders.filter((value) => !allowed.includes(value));
  if (unknown.length) {
    throw new MessagingError(
      `Unknown placeholder: ${unknown.map((value) => `{{${value}}}`).join(", ")}.`,
      "body",
    );
  }
  const missing = allowed.filter((value) => !placeholders.includes(value));
  if (missing.length) {
    throw new MessagingError(
      `Add the missing placeholder: ${missing.map((value) => `{{${value}}}`).join(", ")}.`,
      "body",
    );
  }
  return { body, placeholders };
}

function mapTemplate(doc: TemplateDoc): MessageTemplate {
  const { _id, ...template } = doc;
  return { id: _id, ...template };
}

export async function listTemplates(): Promise<MessageTemplate[]> {
  await ensureDefaultTemplates();
  const db = await getDb();
  const docs = await db
    .collection<TemplateDoc>("message_templates")
    .find({ channel: "WHATSAPP" })
    .toArray();
  const order: NotificationType[] = ["ORDER_COMPLETED", "INVOICE_DETAILS", "CORRECTION"];
  return docs
    .map(mapTemplate)
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}

async function getTemplateForType(type: NotificationType): Promise<MessageTemplate> {
  await ensureDefaultTemplates();
  const db = await getDb();
  const doc = await db
    .collection<TemplateDoc>("message_templates")
    .findOne({ key: type, channel: "WHATSAPP" });
  if (!doc) throw new MessagingError("The message template is missing.");
  return mapTemplate(doc);
}

export async function getTemplate(id: string): Promise<MessageTemplate | null> {
  const db = await getDb();
  const doc = await db.collection<TemplateDoc>("message_templates").findOne({ _id: id });
  return doc ? mapTemplate(doc) : null;
}

// A manual handoff: opens WhatsApp addressed to the kitchen's own number with
// the invoice text already typed, so the owner only presses send.
export async function invoiceHandoff(
  order: Order,
): Promise<{ href: string; text: string; destination: string } | null> {
  const settings = await getSettings();
  const destination = settings.business.whatsappNumber;
  if (!destination.replace(/\D/g, "")) return null;
  try {
    const template = await getTemplateForType("INVOICE_DETAILS");
    const { body } = composeMessage("INVOICE_DETAILS", template, order, settings);
    return { href: waLink(destination, body), text: body, destination };
  } catch {
    return null;
  }
}

export async function listTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
  const db = await getDb();
  const docs = await db
    .collection<TemplateVersionDoc>("template_versions")
    .find({ templateId })
    .sort({ version: -1 })
    .limit(50)
    .toArray();
  return docs.map(({ _id, ...version }) => {
    void _id;
    return version;
  });
}

export async function updateTemplate(
  input: {
    id: string;
    name: string;
    language: string;
    body: string;
    metaTemplateName: string;
    status?: TemplateStatus;
    active?: boolean;
  },
  actor: MessageActor,
  isOwner: boolean,
): Promise<MessageTemplate> {
  const existing = await getTemplate(input.id);
  if (!existing) throw new MessagingError("That template could not be found.");

  const name = cleanSingleLine(input.name, 120);
  if (name.length < 2) throw new MessagingError("Give the template a short name.", "name");
  const language = cleanSingleLine(input.language, 16) || "en";
  if (!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language)) {
    throw new MessagingError("Use a language code such as en or en_US.", "language");
  }
  const { body, placeholders } = validateTemplateBody(existing.type, input.body);
  const metaTemplateName = cleanSingleLine(input.metaTemplateName, 512).toLowerCase();
  if (metaTemplateName && !/^[a-z0-9_]+$/.test(metaTemplateName)) {
    throw new MessagingError(
      "The Meta template name can only use lowercase letters, numbers and underscores.",
      "metaTemplateName",
    );
  }

  const statuses: TemplateStatus[] = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "DISABLED"];
  const requestedStatus =
    isOwner && input.status && statuses.includes(input.status)
      ? input.status
      : existing.status;
  const requestedActive =
    isOwner && input.active !== undefined ? input.active : existing.active;

  const contentChanged =
    existing.body !== body ||
    existing.language !== language ||
    (existing.metaTemplateName ?? "") !== metaTemplateName;
  const changed =
    contentChanged ||
    existing.name !== name ||
    existing.status !== requestedStatus ||
    existing.active !== requestedActive;
  if (!changed) return existing;

  let status = requestedStatus;
  if (contentChanged && existing.status === "APPROVED" && !(isOwner && input.status === "APPROVED")) {
    status = "DRAFT";
  }
  const active = status === "DISABLED" ? false : requestedActive;
  const version = existing.version + 1;
  const now = nowIso();

  const db = await getDb();
  await db.collection<TemplateDoc>("message_templates").updateOne(
    { _id: existing.id },
    {
      $set: {
        name,
        language,
        body,
        placeholders,
        metaTemplateName,
        status,
        active,
        version,
        updatedAt: now,
        updatedBy: actor.email,
      },
    },
  );
  await db.collection<TemplateVersionDoc>("template_versions").insertOne({
    _id: randomUUID(),
    templateId: existing.id,
    version,
    body,
    status,
    at: now,
    by: actor.email,
  });

  await recordAudit({
    actor,
    action: "message.template",
    entityType: "message_template",
    entityId: existing.id,
    summary: `Updated ${existing.name} template to version ${version}`,
    diff: [
      ...(existing.body !== body ? [{ field: "body", from: existing.body, to: body }] : []),
      ...(existing.status !== status
        ? [{ field: "status", from: existing.status, to: status }]
        : []),
      ...(existing.active !== active
        ? [{ field: "active", from: String(existing.active), to: String(active) }]
        : []),
    ],
  });

  const updated = await getTemplate(existing.id);
  return updated ?? existing;
}

export interface TemplateReadiness {
  ready: boolean;
  reason?: string;
}

export function templateReadiness(
  template: Pick<MessageTemplate, "active" | "status" | "metaTemplateName">,
  mode: "LIVE" | "SIMULATED",
): TemplateReadiness {
  if (!template.active) return { ready: false, reason: "This message type is switched off." };
  if (mode === "SIMULATED") return { ready: true };
  if (template.status !== "APPROVED") {
    return { ready: false, reason: "The template has not been approved for live sending." };
  }
  if (!template.metaTemplateName) {
    return { ready: false, reason: "Add the Meta template name before live sending." };
  }
  if (!whatsappConfigured) {
    return { ready: false, reason: "Meta WhatsApp is not configured on the server." };
  }
  return { ready: true };
}

function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(PLACEHOLDER_PATTERN, (_match, key: string) => values[key] ?? "");
}

function completedItemLines(order: Order): string {
  return order.items
    .map(
      (item) =>
        `- ${item.quantity} × ${item.productName} — ${item.packagingLabel}${weightAside(item)}`,
    )
    .join("\n");
}

export function invoiceItemLines(order: Pick<Order, "items">): string {
  return order.items
    .map(
      (item) =>
        `- ${item.quantity} × ${item.productName} — ${item.packagingLabel}${weightAside(item)} @ ${formatINR(
          item.ratePerGramPaise,
          { alwaysPaise: true },
        )}/g = ${formatINR(item.lineTotalPaise)}`,
    )
    .join("\n");
}

function templateValues(
  type: NotificationType,
  order: Order,
  settings: AppSettings,
  customMessage?: string,
): Record<string, string> {
  const invoiceDate = order.invoice?.snapshot.invoiceDate ?? order.orderDate;
  const values: Record<string, string> = {
    customer_name: order.customerSnapshot.name,
    order_ref: order.ref,
    total: formatINR(order.totalPaise),
    thank_you: settings.invoice.thankYou,
    collection_line:
      order.delivery.method === "HOME_COLLECTION" ? "ready for collection" : "ready for delivery",
    invoice_date: formatDateDDMMYYYY(invoiceDate),
    items: type === "INVOICE_DETAILS" ? invoiceItemLines(order) : completedItemLines(order),
  };
  if (type === "CORRECTION") {
    values.message = customMessage ?? "";
  }
  return values;
}

function composeMessage(
  type: NotificationType,
  template: MessageTemplate,
  order: Order,
  settings: AppSettings,
  customMessage?: string,
): { body: string; params: string[] } {
  const values = templateValues(type, order, settings, customMessage);
  const body = renderTemplate(template.body, values);
  const params = template.placeholders.map((key) => values[key] ?? "");
  return { body, params };
}

async function getOrderDoc(orderId: string): Promise<OrderDoc | null> {
  const db = await getDb();
  return db.collection<OrderDoc>("orders").findOne({ _id: orderId });
}

function mapOrderDoc(doc: OrderDoc): Order {
  const { _id, ...order } = doc;
  return { id: _id, ...order };
}

export interface ConsentView extends Consent {
  recorded: boolean;
}

export async function getWhatsAppConsent(phone: string): Promise<ConsentView | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const db = await getDb();
  const consent = await db
    .collection<ConsentDoc>("consents")
    .findOne({ phone: normalized.phone, purpose: "TRANSACTIONAL" });
  if (consent) {
    const { _id, ...rest } = consent;
    return { ...rest, id: _id, recorded: true };
  }
  const customer = await db.collection<{
    _id: string;
    whatsappConsent?: Consent["purpose"] extends never ? never : string;
    consentSource?: string;
    consentAt?: string;
    updatedAt?: string;
    name?: string;
  }>("customers").findOne({ phone: normalized.phone });
  if (
    customer &&
    (customer.whatsappConsent === "GRANTED" || customer.whatsappConsent === "WITHDRAWN")
  ) {
    return {
      id: `customer:${customer._id}`,
      customerId: customer._id,
      phone: normalized.phone,
      purpose: "TRANSACTIONAL",
      granted: customer.whatsappConsent === "GRANTED",
      source: customer.consentSource ?? "Customer record",
      at: customer.consentAt ?? customer.updatedAt ?? nowIso(),
      updatedBy: "system",
      recorded: false,
    };
  }
  return null;
}

export async function consentCounts(): Promise<{
  granted: number;
  withdrawn: number;
  notRecorded: number;
}> {
  const db = await getDb();
  const rows = await db
    .collection("customers")
    .aggregate<{ _id: string | null; n: number }>([
      { $group: { _id: "$whatsappConsent", n: { $sum: 1 } } },
    ])
    .toArray();
  let granted = 0;
  let withdrawn = 0;
  let notRecorded = 0;
  for (const row of rows) {
    if (row._id === "GRANTED") granted += row.n;
    else if (row._id === "WITHDRAWN") withdrawn += row.n;
    else notRecorded += row.n;
  }
  return { granted, withdrawn, notRecorded };
}

export async function setWhatsAppConsent(input: {
  customerId: string;
  state: "GRANTED" | "WITHDRAWN";
  source: string;
  note?: string;
  actor: MessageActor;
}): Promise<Consent> {
  const db = await getDb();
  const customer = await db
    .collection<{ _id: string; name: string; phone: string }>("customers")
    .findOne({ _id: input.customerId });
  if (!customer) throw new MessagingError("That customer could not be found.");
  const phone = normalizePhone(customer.phone);
  if (!phone) throw new MessagingError("That customer's phone number is not valid.");
  const source = cleanSingleLine(input.source, 200);
  if (source.length < 3) {
    throw new MessagingError(
      "Add a short note on where consent came from (for example, “Customer confirmed on WhatsApp”).",
      "source",
    );
  }
  const note = cleanText(input.note, 500) || undefined;
  const now = nowIso();
  const granted = input.state === "GRANTED";

  await db.collection<ConsentDoc>("consents").updateOne(
    { phone: phone.phone, purpose: "TRANSACTIONAL" },
    {
      $set: {
        customerId: customer._id,
        granted,
        source,
        ...(note ? { note } : {}),
        at: now,
        updatedBy: input.actor.email,
      },
      $setOnInsert: { _id: randomUUID(), phone: phone.phone, purpose: "TRANSACTIONAL" },
    },
    { upsert: true },
  );

  await db.collection<{ _id: string }>("customers").updateOne(
    { _id: customer._id },
    {
      $set: {
        whatsappConsent: input.state,
        consentSource: source,
        consentAt: now,
        updatedAt: now,
      },
    },
  );

  if (!granted) {
    const jobs = await db
      .collection<NotificationJobDoc>("notification_jobs")
      .find({ recipient: phone.phone, status: { $in: ["QUEUED", "NEEDS_REVIEW"] } })
      .project<{ _id: string; orderId: string }>({ _id: 1, orderId: 1 })
      .toArray();
    if (jobs.length) {
      await db.collection<NotificationJobDoc>("notification_jobs").updateMany(
        { recipient: phone.phone, status: { $in: ["QUEUED", "NEEDS_REVIEW"] } },
        {
          $set: {
            status: "DISCARDED",
            needsReview: false,
            holdReason: "Consent was withdrawn before this message was sent.",
            updatedAt: now,
          },
        },
      );
      await Promise.all(
        [...new Set(jobs.map((job) => job.orderId))].map((orderId) =>
          refreshOrderNotificationSummary(orderId),
        ),
      );
    }
  }

  await recordAudit({
    actor: input.actor,
    action: granted ? "customer.consent.grant" : "customer.consent.withdraw",
    entityType: "customer",
    entityId: customer._id,
    summary: `${granted ? "Recorded" : "Withdrew"} WhatsApp consent for ${customer.name} · ${source}`,
  });

  const saved = await getWhatsAppConsent(phone.phone);
  return (
    saved ?? {
      id: "unknown",
      customerId: customer._id,
      phone: phone.phone,
      purpose: "TRANSACTIONAL",
      granted,
      source,
      note,
      at: now,
      updatedBy: input.actor.email,
    }
  );
}

export interface SpendState {
  monthKey: string;
  monthLabel: string;
  liveMessages: number;
  estimatedCostPaise: number;
  costPerMessagePaise: number;
  thresholdPaise: number;
  alertPercent: number;
  percentUsed: number;
  limitReached: boolean;
  estimateAvailable: boolean;
}

export async function getMonthlySpendState(
  settings?: AppSettings,
): Promise<SpendState> {
  const current = settings ?? (await getSettings());
  const monthKey = businessToday().slice(0, 7);
  const startIso = businessDateStartUtc(`${monthKey}-01`).toISOString();
  const db = await getDb();
  const liveMessages = await db.collection("notification_jobs").countDocuments({
    mode: "LIVE",
    status: { $in: ["SENT", "DELIVERED", "READ"] },
    sentAt: { $gte: startIso },
  });
  const costPerMessagePaise = Math.max(current.whatsapp.estimatedCostPerMessagePaise, 0);
  const thresholdPaise = Math.max(current.whatsapp.monthlySpendThresholdPaise, 0);
  const estimatedCostPaise = liveMessages * costPerMessagePaise;
  const percentUsed =
    thresholdPaise > 0 ? Math.round((estimatedCostPaise / thresholdPaise) * 100) : 0;
  return {
    monthKey,
    monthLabel: monthLabel(`${monthKey}-01`),
    liveMessages,
    estimatedCostPaise,
    costPerMessagePaise,
    thresholdPaise,
    alertPercent: Math.min(Math.max(current.whatsapp.alertPercent, 1), 100),
    percentUsed,
    limitReached: thresholdPaise > 0 && estimatedCostPaise >= thresholdPaise,
    estimateAvailable: costPerMessagePaise > 0,
  };
}

async function alertOnce(input: Parameters<typeof createAlert>[0]): Promise<void> {
  const db = await getDb();
  const existing = await db
    .collection("system_alerts")
    .findOne({ type: input.type, title: input.title });
  if (existing) return;
  await createAlert(input);
}

async function evaluateSpendLimit(
  settings: AppSettings,
): Promise<{ blocked: boolean; state: SpendState }> {
  const state = await getMonthlySpendState(settings);
  if (!state.estimateAvailable || state.thresholdPaise <= 0) {
    return { blocked: false, state };
  }
  if (state.limitReached) {
    if (!settings.whatsapp.paused) {
      await pauseWhatsApp(
        `Monthly WhatsApp spending limit reached (${state.monthLabel}).`,
        "system",
      );
    }
    await alertOnce({
      type: "WHATSAPP_SPEND",
      severity: "CRITICAL",
      title: `WhatsApp spending limit reached (${state.monthLabel})`,
      message: `Estimated spend is ${formatINR(
        state.estimatedCostPaise,
      )} against a ${formatINR(
        state.thresholdPaise,
      )} monthly limit. Automated messages are paused until the Owner reviews. The estimate uses your configured per-message rate, not Meta's invoice.`,
      permission: "messaging.review",
      link: "/admin/whatsapp",
    });
    return { blocked: true, state };
  }
  if (state.percentUsed >= state.alertPercent) {
    await alertOnce({
      type: "WHATSAPP_SPEND",
      severity: "WARNING",
      title: `WhatsApp spending at ${state.percentUsed}% of the monthly limit (${state.monthLabel})`,
      message: `Estimated spend is ${formatINR(
        state.estimatedCostPaise,
      )} of a ${formatINR(
        state.thresholdPaise,
      )} monthly limit. This is an estimate based on your configured per-message rate, not Meta's invoice.`,
      permission: "messaging.review",
      link: "/admin/whatsapp",
    });
  }
  return { blocked: false, state };
}

export interface EnqueueResult {
  job: NotificationJob | null;
  reason?: string;
}

async function queueMessage(input: {
  order: Order;
  type: NotificationType;
  actor: MessageActor;
  automatic: boolean;
  customMessage?: string;
  idempotencyKey?: string;
}): Promise<EnqueueResult> {
  const { order, type, actor, automatic } = input;
  if (order.type !== "SALES") {
    return { job: null, reason: "Gift records do not send customer messages." };
  }
  const recipient = normalizePhone(order.customerSnapshot.phone);
  if (!recipient) {
    return { job: null, reason: "The customer's phone number is not valid for WhatsApp." };
  }
  const settings = await getSettings();
  if (automatic && !settings.whatsapp.liveEnabled) {
    return { job: null, reason: "Automated sending is switched off in WhatsApp settings." };
  }

  const db = await getDb();
  const jobs = db.collection<NotificationJobDoc>("notification_jobs");
  const idempotencyKey =
    input.idempotencyKey ??
    (automatic ? `ORDER_COMPLETED:${order.id}` : `${type}:${order.id}:${randomUUID()}`);
  const existing = await jobs.findOne({ idempotencyKey });
  if (existing) {
    const { _id, ...job } = existing;
    return { job: { id: _id, ...job } };
  }

  const consent = await getWhatsAppConsent(recipient.phone);
  if (!consent?.granted) {
    return {
      job: null,
      reason:
        consent && !consent.granted
          ? "WhatsApp consent is marked as withdrawn for this customer."
          : "WhatsApp consent has not been recorded for this customer.",
    };
  }

  const template = await getTemplateForType(type);
  const mode = messagingModeInfo().mode;
  const readiness = templateReadiness(template, mode);
  if (!readiness.ready && !automatic) {
    throw new MessagingError(
      `${readiness.reason ?? "This message type is not ready."} Open WhatsApp settings to fix it.`,
    );
  }

  let customMessage: string | undefined;
  if (type === "CORRECTION") {
    customMessage = cleanText(input.customMessage, MAX_CORRECTION_LENGTH);
    if (customMessage.length < 3) {
      throw new MessagingError("Write the correction you want to send.", "message");
    }
  }

  let composed: { body: string; params: string[] };
  try {
    composed = composeMessage(type, template, order, settings, customMessage);
  } catch (error) {
    if (automatic) return { job: null, reason: "The message could not be composed." };
    throw error;
  }

  let holdReason = readiness.ready ? "" : readiness.reason ?? "This message type is not ready.";
  if (!holdReason && composed.body.length > MAX_BODY_LENGTH) {
    const reason = `The message is ${composed.body.length} characters, above WhatsApp's ${MAX_BODY_LENGTH}-character template limit.`;
    if (!automatic) throw new MessagingError(reason);
    holdReason = reason;
  }

  if (!holdReason) {
    if (settings.whatsapp.paused) {
      const reason = `WhatsApp is paused: ${
        settings.whatsapp.pauseReason || "emergency pause"
      }.`;
      if (!automatic) throw new MessagingError(`${reason} Resume sending before trying again.`);
      holdReason = reason;
    } else {
      const spend = await evaluateSpendLimit(settings);
      if (spend.blocked) {
        const reason = `Monthly WhatsApp spending limit reached (${spend.state.monthLabel}).`;
        if (!automatic) throw new MessagingError(`${reason} Review the limit first.`);
        holdReason = reason;
      }
    }
  }

  const now = nowIso();
  const needsReview = Boolean(holdReason);
  const doc: NotificationJobDoc = {
    _id: randomUUID(),
    orderId: order.id,
    orderRef: order.ref,
    customerId: order.customerId,
    customerName: order.customerSnapshot.name,
    channel: "WHATSAPP",
    type,
    recipient: recipient.phone,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.version,
    templateLanguage: template.language,
    ...(template.metaTemplateName ? { metaTemplateName: template.metaTemplateName } : {}),
    templateParams: composed.params,
    body: composed.body,
    status: needsReview ? "NEEDS_REVIEW" : "QUEUED",
    mode,
    idempotencyKey,
    attempts: 0,
    needsReview,
    ...(holdReason ? { holdReason } : {}),
    ...(customMessage ? { customMessage } : {}),
    orderUpdatedAt: order.updatedAt,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
  };

  try {
    await jobs.insertOne(doc);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      const raced = await jobs.findOne({ idempotencyKey });
      if (raced) {
        const { _id, ...job } = raced;
        return { job: { id: _id, ...job } };
      }
    }
    throw error;
  }

  await recordAudit({
    actor,
    action: "message.queue",
    entityType: "notification_job",
    entityId: doc._id,
    summary: `Queued ${NOTIFICATION_TYPE_LABELS[type]} for ${order.ref} (${doc.status})`,
  });

  if (!needsReview) {
    try {
      await dispatchNotification(doc._id);
    } catch {
      await createAlert({
        type: "WHATSAPP_FAILED",
        severity: "WARNING",
        title: `Message queue error for ${order.ref}`,
        message:
          "The message was saved but could not be processed immediately. Open WhatsApp to review the queue.",
        permission: "messaging.manage",
        link: "/admin/whatsapp",
      });
    }
  }

  const saved = await getNotificationJob(doc._id);
  if (!saved) return { job: null, reason: "The message could not be saved." };
  return { job: saved };
}

export async function enqueueOrderCompletedMessage(
  orderId: string,
  actor: MessageActor,
): Promise<EnqueueResult> {
  const doc = await getOrderDoc(orderId);
  if (!doc) return { job: null, reason: "Order not found." };
  return queueMessage({
    order: mapOrderDoc(doc),
    type: "ORDER_COMPLETED",
    actor,
    automatic: true,
  });
}

export async function enqueueOrderMessage(input: {
  orderId: string;
  type: "INVOICE_DETAILS" | "CORRECTION";
  actor: MessageActor;
  customMessage?: string;
  idempotencyKey?: string;
}): Promise<NotificationJob> {
  const doc = await getOrderDoc(input.orderId);
  if (!doc) throw new MessagingError("That order could not be found.");
  const result = await queueMessage({
    order: mapOrderDoc(doc),
    type: input.type,
    actor: input.actor,
    automatic: false,
    customMessage: input.customMessage,
    idempotencyKey: input.idempotencyKey,
  });
  if (!result.job) {
    throw new MessagingError(result.reason ?? "The message could not be queued.");
  }
  return result.job;
}

export async function getNotificationJob(id: string): Promise<NotificationJob | null> {
  const db = await getDb();
  const doc = await db.collection<NotificationJobDoc>("notification_jobs").findOne({ _id: id });
  if (!doc) return null;
  const { _id, ...job } = doc;
  return { id: _id, ...job };
}

export async function listOrderNotifications(orderId: string): Promise<NotificationJob[]> {
  const db = await getDb();
  const docs = await db
    .collection<NotificationJobDoc>("notification_jobs")
    .find({ orderId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(({ _id, ...job }) => ({ id: _id, ...job }));
}

export interface NotificationListResult {
  items: NotificationJob[];
  total: number;
}

export async function listNotificationJobs(options: {
  status?: NotificationStatus | "";
  review?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NotificationListResult> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (options.status) filter.status = options.status;
  if (options.review) filter.needsReview = true;
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const [docs, total] = await Promise.all([
    db
      .collection<NotificationJobDoc>("notification_jobs")
      .find(filter)
      .sort({ needsReview: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("notification_jobs").countDocuments(filter),
  ]);
  return {
    items: docs.map(({ _id, ...job }) => ({ id: _id, ...job })),
    total,
  };
}

async function appendNotificationEvent(
  jobId: string,
  providerStatus: string,
  detail?: string,
): Promise<void> {
  const db = await getDb();
  await db.collection<NotificationEventDoc>("notification_events").insertOne({
    _id: randomUUID(),
    jobId,
    providerStatus: providerStatus.slice(0, 60),
    at: nowIso(),
    ...(detail ? { detail: detail.slice(0, 500) } : {}),
  });
}

async function setNeedsReview(
  job: NotificationJob,
  reason: string,
): Promise<NotificationJob | null> {
  const db = await getDb();
  await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
    { _id: job.id, status: { $in: ["QUEUED", "NEEDS_REVIEW"] } },
    {
      $set: {
        status: "NEEDS_REVIEW",
        needsReview: true,
        holdReason: reason.slice(0, 500),
        updatedAt: nowIso(),
      },
    },
  );
  await appendNotificationEvent(job.id, "needs_review", reason);
  await refreshOrderNotificationSummary(job.orderId);
  return getNotificationJob(job.id);
}

export async function refreshOrderNotificationSummary(orderId: string): Promise<void> {
  const db = await getDb();
  const jobs = await db
    .collection<NotificationJobDoc>("notification_jobs")
    .find({ orderId })
    .project<{ status: NotificationStatus; updatedAt: string }>({
      status: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .toArray();
  const summary = {
    total: jobs.length,
    failed: jobs.filter((job) => job.status === "FAILED").length,
    ...(jobs[0] ? { lastStatus: jobs[0].status } : {}),
  };
  await db
    .collection<{ _id: string }>("orders")
    .updateOne({ _id: orderId }, { $set: { notificationSummary: summary } });
}

export async function flagOrderJobsForReview(
  orderId: string,
  reason: string,
): Promise<void> {
  const db = await getDb();
  const result = await db.collection<NotificationJobDoc>("notification_jobs").updateMany(
    { orderId, status: "QUEUED" },
    {
      $set: {
        status: "NEEDS_REVIEW",
        needsReview: true,
        holdReason: reason.slice(0, 500),
        updatedAt: nowIso(),
      },
    },
  );
  if (result.modifiedCount > 0) {
    await refreshOrderNotificationSummary(orderId);
  }
}

export async function dispatchNotification(jobId: string): Promise<NotificationJob | null> {
  const initial = await getNotificationJob(jobId);
  if (!initial || initial.status !== "QUEUED" || initial.needsReview) return initial;

  const mode = messagingModeInfo().mode;
  if (initial.mode !== mode) {
    return setNeedsReview(
      initial,
      `The messaging mode changed to ${mode.toLowerCase()} after this message was queued. Review it before sending.`,
    );
  }

  const settings = await getSettings();
  if (settings.whatsapp.paused) return initial;
  const spend = await evaluateSpendLimit(settings);
  if (spend.blocked) {
    return setNeedsReview(
      initial,
      `Monthly WhatsApp spending limit reached (${spend.state.monthLabel}).`,
    );
  }

  const consent = await getWhatsAppConsent(initial.recipient);
  if (!consent?.granted) {
    return setNeedsReview(initial, "WhatsApp consent is not recorded for this customer.");
  }

  const template = initial.templateId ? await getTemplate(initial.templateId) : null;
  if (!template || !template.active) {
    return setNeedsReview(initial, "This message type is switched off.");
  }
  const readiness = templateReadiness(template, mode);
  if (!readiness.ready) {
    return setNeedsReview(initial, readiness.reason ?? "The template is not ready.");
  }
  if (mode === "LIVE" && initial.templateVersion !== template.version) {
    return setNeedsReview(
      initial,
      "The template changed after this message was queued. Rebuild and review it before sending.",
    );
  }

  const orderDoc = await getOrderDoc(initial.orderId);
  if (!orderDoc) return setNeedsReview(initial, "The linked order could not be found.");
  if (orderDoc.type !== "SALES") {
    return setNeedsReview(initial, "Gift records do not send customer messages.");
  }
  if (orderDoc.status !== "COMPLETED") {
    return setNeedsReview(initial, "The order is no longer marked completed.");
  }
  if (initial.orderUpdatedAt && orderDoc.updatedAt !== initial.orderUpdatedAt) {
    return setNeedsReview(
      initial,
      "The order changed after this message was queued. Rebuild and review it before sending.",
    );
  }
  if (initial.body.length > MAX_BODY_LENGTH) {
    return setNeedsReview(
      initial,
      `The message is above WhatsApp's ${MAX_BODY_LENGTH}-character template limit.`,
    );
  }

  const db = await getDb();
  const claimed = await db.collection<NotificationJobDoc>("notification_jobs").findOneAndUpdate(
    {
      _id: jobId,
      status: "QUEUED",
      needsReview: false,
      attempts: { $lt: MAX_ATTEMPTS },
    },
    { $set: { status: "SENDING", lastAttemptAt: nowIso(), updatedAt: nowIso() } },
    { returnDocument: "after" },
  );
  if (!claimed) return getNotificationJob(jobId);

  const attemptNumber = initial.attempts + 1;
  try {
    let providerMessageId: string;
    if (mode === "SIMULATED") {
      providerMessageId = simulatedWhatsAppId();
      await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
        { _id: jobId },
        {
          $set: {
            status: "SIMULATED",
            providerMessageId,
            attempts: attemptNumber,
            sentAt: nowIso(),
            updatedAt: nowIso(),
          },
          $unset: { lastError: "", nextAttemptAt: "", holdReason: "", blockedReason: "" },
        },
      );
      await appendNotificationEvent(
        jobId,
        "simulated",
        "Test mode: no request was sent to Meta WhatsApp.",
      );
      await recordAudit({
        actor: { id: initial.createdBy, email: "system" },
        action: "message.simulated",
        entityType: "notification_job",
        entityId: jobId,
        summary: `Simulated ${NOTIFICATION_TYPE_LABELS[initial.type]} for ${initial.orderRef}`,
      });
    } else {
      const result = await sendWhatsAppTemplate({
        to: initial.recipient,
        templateName: template.metaTemplateName ?? "",
        language: initial.templateLanguage ?? template.language,
        params: initial.templateParams ?? [],
      });
      providerMessageId = result.providerMessageId;
      await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
        { _id: jobId },
        {
          $set: {
            status: "SENT",
            providerMessageId,
            attempts: attemptNumber,
            sentAt: nowIso(),
            updatedAt: nowIso(),
          },
          $unset: { lastError: "", nextAttemptAt: "", holdReason: "", blockedReason: "" },
        },
      );
      await appendNotificationEvent(jobId, "accepted", `Provider message ID ${providerMessageId}`);
      await recordAudit({
        actor: { id: initial.createdBy, email: "system" },
        action: "message.sent",
        entityType: "notification_job",
        entityId: jobId,
        summary: `Sent ${NOTIFICATION_TYPE_LABELS[initial.type]} for ${initial.orderRef}`,
      });
    }
  } catch (error) {
    const message = (
      error instanceof Error ? error.message : "The message could not be sent."
    ).slice(0, 500);
    const retryable = error instanceof WhatsAppSendError && error.retryable;
    if (retryable && attemptNumber < MAX_ATTEMPTS) {
      const backoffMinutes = attemptNumber === 1 ? 2 : 10;
      const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60_000).toISOString();
      await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
        { _id: jobId },
        {
          $set: {
            status: "QUEUED",
            attempts: attemptNumber,
            nextAttemptAt,
            lastError: message,
            updatedAt: nowIso(),
          },
        },
      );
      await appendNotificationEvent(
        jobId,
        "retry_scheduled",
        `Attempt ${attemptNumber} failed. Retry at ${nextAttemptAt}. ${message}`,
      );
    } else {
      await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
        { _id: jobId },
        {
          $set: {
            status: "FAILED",
            attempts: attemptNumber,
            lastError: message,
            updatedAt: nowIso(),
          },
          $unset: { nextAttemptAt: "" },
        },
      );
      await appendNotificationEvent(jobId, "failed", message);
      await createAlert({
        type: "WHATSAPP_FAILED",
        severity: "CRITICAL",
        title: `WhatsApp message failed for ${initial.orderRef}`,
        message: `The ${NOTIFICATION_TYPE_LABELS[initial.type].toLowerCase()} message could not be sent. ${message}`,
        permission: "messaging.manage",
        link: `/admin/orders/${initial.orderId}`,
      });
      await recordAudit({
        actor: { id: initial.createdBy, email: "system" },
        action: "message.failed",
        entityType: "notification_job",
        entityId: jobId,
        summary: `WhatsApp failed for ${initial.orderRef}: ${message}`,
      });
    }
  }

  await refreshOrderNotificationSummary(initial.orderId);
  return getNotificationJob(jobId);
}

async function recoverStaleSending(): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const stale = await db
    .collection<NotificationJobDoc>("notification_jobs")
    .find({ status: "SENDING", updatedAt: { $lt: cutoff } })
    .project<{ _id: string }>({ _id: 1 })
    .toArray();
  for (const job of stale) {
    await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
      { _id: job._id, status: "SENDING" },
      {
        $set: {
          status: "NEEDS_REVIEW",
          needsReview: true,
          holdReason:
            "The provider did not confirm this send. Check the provider before retrying to avoid a duplicate.",
          updatedAt: nowIso(),
        },
      },
    );
    await appendNotificationEvent(job._id, "unknown", "Send attempt did not complete.");
  }
}

export interface ProcessQueueResult {
  processed: number;
  paused: boolean;
  limitReached: boolean;
  reviewCount: number;
}

export async function processDueNotifications(limit = 20): Promise<ProcessQueueResult> {
  await recoverStaleSending();
  const settings = await getSettings();
  const reviewCount = await getDb()
    .then((db) =>
      db.collection("notification_jobs").countDocuments({
        $or: [{ status: "NEEDS_REVIEW" }, { needsReview: true }],
      }),
    );
  if (settings.whatsapp.paused) {
    return { processed: 0, paused: true, limitReached: false, reviewCount };
  }
  const spend = await evaluateSpendLimit(settings);
  if (spend.blocked) {
    return { processed: 0, paused: true, limitReached: true, reviewCount };
  }
  const db = await getDb();
  const now = nowIso();
  const due = await db
    .collection<NotificationJobDoc>("notification_jobs")
    .find({
      status: "QUEUED",
      needsReview: false,
      attempts: { $lt: MAX_ATTEMPTS },
      $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }],
    })
    .sort({ createdAt: 1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .project<{ _id: string }>({ _id: 1 })
    .toArray();
  let processed = 0;
  for (const job of due) {
    try {
      await dispatchNotification(job._id);
      processed += 1;
    } catch {
      // The job stays queued for the next run.
    }
  }
  return { processed, paused: false, limitReached: false, reviewCount };
}

async function preflightReview(job: NotificationJob): Promise<void> {
  const settings = await getSettings();
  if (settings.whatsapp.paused) {
    throw new MessagingError("WhatsApp is paused. Resume sending before approving messages.");
  }
  const consent = await getWhatsAppConsent(job.recipient);
  if (!consent?.granted) {
    throw new MessagingError("This customer has not granted WhatsApp consent.");
  }
  const order = await getOrderDoc(job.orderId);
  if (!order) throw new MessagingError("The linked order could not be found.");
  if (order.status !== "COMPLETED") {
    throw new MessagingError("The order is no longer marked completed. Discard this message.");
  }
  if (job.orderUpdatedAt && order.updatedAt !== job.orderUpdatedAt) {
    throw new MessagingError(
      "The order changed after this message was queued. Rebuild the message before approving it.",
    );
  }
  const template = job.templateId ? await getTemplate(job.templateId) : null;
  const mode = messagingModeInfo().mode;
  if (!template) throw new MessagingError("The template could not be found.");
  if (job.mode !== mode) {
    throw new MessagingError(
      `This message was queued in ${job.mode.toLowerCase()} mode. Rebuild it before sending in ${mode.toLowerCase()} mode.`,
    );
  }
  const readiness = templateReadiness(template, mode);
  if (!readiness.ready) {
    throw new MessagingError(readiness.reason ?? "The template is not ready.");
  }
  if (mode === "LIVE" && job.templateVersion !== template.version) {
    throw new MessagingError(
      "The template changed after this message was queued. Rebuild it before approving.",
    );
  }
  const spend = await evaluateSpendLimit(settings);
  if (spend.blocked) {
    throw new MessagingError("The monthly WhatsApp spending limit has been reached.");
  }
}

export async function approveNotification(
  jobId: string,
  actor: MessageActor,
): Promise<NotificationJob> {
  const job = await getNotificationJob(jobId);
  if (!job) throw new MessagingError("That message could not be found.");
  if (!job.needsReview) throw new MessagingError("This message is not waiting for review.");
  await preflightReview(job);
  const db = await getDb();
  await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
    { _id: jobId, needsReview: true },
    {
      $set: {
        status: "QUEUED",
        needsReview: false,
        approvedAt: nowIso(),
        approvedBy: actor.email,
        nextAttemptAt: nowIso(),
        updatedAt: nowIso(),
      },
      $unset: { holdReason: "", blockedReason: "" },
    },
  );
  await appendNotificationEvent(jobId, "approved", `Approved by ${actor.email}`);
  await recordAudit({
    actor,
    action: "message.approve",
    entityType: "notification_job",
    entityId: jobId,
    summary: `Approved ${NOTIFICATION_TYPE_LABELS[job.type]} for ${job.orderRef}`,
  });
  const dispatched = await dispatchNotification(jobId);
  return dispatched ?? job;
}

export async function rebuildNotification(
  jobId: string,
  actor: MessageActor,
): Promise<NotificationJob> {
  const job = await getNotificationJob(jobId);
  if (!job) throw new MessagingError("That message could not be found.");
  if (!job.needsReview) throw new MessagingError("Only messages awaiting review can be rebuilt.");
  const order = await getOrderDoc(job.orderId);
  if (!order) throw new MessagingError("The linked order could not be found.");
  if (order.status !== "COMPLETED") {
    throw new MessagingError("The order is no longer completed. Discard this message.");
  }
  const consent = await getWhatsAppConsent(job.recipient);
  if (!consent?.granted) {
    throw new MessagingError("This customer has not granted WhatsApp consent.");
  }
  const template = job.templateId
    ? await getTemplate(job.templateId)
    : await getTemplateForType(job.type);
  if (!template) throw new MessagingError("The template could not be found.");
  const settings = await getSettings();
  const mapped = mapOrderDoc(order);
  const composed = composeMessage(job.type, template, mapped, settings, job.customMessage);
  const body =
    composed.body.length > MAX_BODY_LENGTH ? composed.body.slice(0, MAX_BODY_LENGTH) : composed.body;
  const db = await getDb();
  await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
    { _id: jobId, needsReview: true },
    {
      $set: {
        body,
        templateParams: composed.params,
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version,
        templateLanguage: template.language,
        ...(template.metaTemplateName ? { metaTemplateName: template.metaTemplateName } : {}),
        orderUpdatedAt: order.updatedAt,
        orderRef: order.ref,
        customerName: order.customerSnapshot.name,
        status: "NEEDS_REVIEW",
        needsReview: true,
        holdReason: "Rebuilt from the current order. Review before sending.",
        updatedAt: nowIso(),
      },
      $unset: { lastError: "", nextAttemptAt: "", blockedReason: "" },
    },
  );
  await appendNotificationEvent(jobId, "rebuilt", `Rebuilt by ${actor.email}`);
  await recordAudit({
    actor,
    action: "message.rebuild",
    entityType: "notification_job",
    entityId: jobId,
    summary: `Rebuilt ${NOTIFICATION_TYPE_LABELS[job.type]} for ${job.orderRef}`,
  });
  const rebuilt = await getNotificationJob(jobId);
  if (!rebuilt) throw new MessagingError("The message could not be rebuilt.");
  return rebuilt;
}

export async function discardNotification(
  jobId: string,
  actor: MessageActor,
  reason?: string,
): Promise<NotificationJob> {
  const job = await getNotificationJob(jobId);
  if (!job) throw new MessagingError("That message could not be found.");
  if (job.status === "DISCARDED") return job;
  const db = await getDb();
  await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
    { _id: jobId },
    {
      $set: {
        status: "DISCARDED",
        needsReview: false,
        holdReason: cleanSingleLine(reason, 300) || "Discarded by reviewer.",
        updatedAt: nowIso(),
      },
    },
  );
  await appendNotificationEvent(jobId, "discarded", `Discarded by ${actor.email}`);
  await recordAudit({
    actor,
    action: "message.discard",
    entityType: "notification_job",
    entityId: jobId,
    summary: `Discarded ${NOTIFICATION_TYPE_LABELS[job.type]} for ${job.orderRef}`,
  });
  await refreshOrderNotificationSummary(job.orderId);
  const updated = await getNotificationJob(jobId);
  if (!updated) throw new MessagingError("The message could not be updated.");
  return updated;
}

export async function retryNotification(
  jobId: string,
  actor: MessageActor,
): Promise<NotificationJob> {
  const job = await getNotificationJob(jobId);
  if (!job) throw new MessagingError("That message could not be found.");
  if (job.status !== "FAILED") {
    throw new MessagingError("Only failed messages can be retried.");
  }
  const settings = await getSettings();
  if (settings.whatsapp.paused) {
    throw new MessagingError("WhatsApp is paused. Resume sending before retrying.");
  }
  const consent = await getWhatsAppConsent(job.recipient);
  if (!consent?.granted) {
    throw new MessagingError("This customer has not granted WhatsApp consent.");
  }
  const db = await getDb();
  await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
    { _id: jobId, status: "FAILED" },
    {
      $set: {
        status: "QUEUED",
        attempts: 0,
        needsReview: false,
        approvedAt: nowIso(),
        approvedBy: actor.email,
        nextAttemptAt: nowIso(),
        updatedAt: nowIso(),
      },
      $unset: { lastError: "", holdReason: "", blockedReason: "" },
    },
  );
  await appendNotificationEvent(jobId, "manual_retry", `Retried by ${actor.email}`);
  await recordAudit({
    actor,
    action: "message.retry",
    entityType: "notification_job",
    entityId: jobId,
    summary: `Retried ${NOTIFICATION_TYPE_LABELS[job.type]} for ${job.orderRef}`,
  });
  const dispatched = await dispatchNotification(jobId);
  return dispatched ?? job;
}

export async function handleWhatsAppStatusEvents(
  events: WhatsAppStatusEvent[],
): Promise<number> {
  const db = await getDb();
  let updated = 0;
  for (const event of events) {
    const job = await db
      .collection<NotificationJobDoc>("notification_jobs")
      .findOne({ providerMessageId: event.providerMessageId });
    if (!job) {
      continue;
    }
    await appendNotificationEvent(job._id, event.providerStatus, event.error);
    const now = nowIso();
    if (event.providerStatus === "failed") {
      await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
        { _id: job._id },
        {
          $set: {
            status: "FAILED",
            lastError: event.error ?? "The provider reported a delivery failure.",
            updatedAt: now,
          },
        },
      );
      await createAlert({
        type: "WHATSAPP_FAILED",
        severity: "CRITICAL",
        title: `WhatsApp delivery failed for ${job.orderRef}`,
        message:
          event.error ?? "Meta reported that the message could not be delivered.",
        permission: "messaging.manage",
        link: `/admin/orders/${job.orderId}`,
      });
      await refreshOrderNotificationSummary(job.orderId);
      updated += 1;
      continue;
    }
    if (event.providerStatus === "delivered") {
      if (job.status !== "READ") {
        await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
          { _id: job._id },
          { $set: { status: "DELIVERED", deliveredAt: now, updatedAt: now } },
        );
        await refreshOrderNotificationSummary(job.orderId);
        updated += 1;
      }
      continue;
    }
    if (event.providerStatus === "read") {
      await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
        { _id: job._id },
        {
          $set: {
            status: "READ",
            readAt: now,
            ...(job.deliveredAt ? {} : { deliveredAt: now }),
            updatedAt: now,
          },
        },
      );
      await refreshOrderNotificationSummary(job.orderId);
      updated += 1;
      continue;
    }
    if (event.providerStatus === "sent" && job.status === "SENDING") {
      await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
        { _id: job._id },
        { $set: { status: "SENT", updatedAt: now } },
      );
      await refreshOrderNotificationSummary(job.orderId);
      updated += 1;
      continue;
    }
    await db.collection<NotificationJobDoc>("notification_jobs").updateOne(
      { _id: job._id },
      { $set: { updatedAt: now } },
    );
  }
  return updated;
}

export async function pauseMessaging(
  reason: string,
  actor: MessageActor,
): Promise<void> {
  const settings = await getSettings();
  if (settings.whatsapp.paused) {
    throw new MessagingError("WhatsApp sending is already paused.");
  }
  const cleanReason = cleanSingleLine(reason, 300);
  if (cleanReason.length < 3) {
    throw new MessagingError("Add a short reason for the pause.", "reason");
  }
  await pauseWhatsApp(cleanReason, actor.email);
  const db = await getDb();
  const now = nowIso();
  const queued = await db
    .collection<NotificationJobDoc>("notification_jobs")
    .find({ status: "QUEUED" })
    .project<{ _id: string; orderId: string }>({ _id: 1, orderId: 1 })
    .toArray();
  if (queued.length) {
    await db.collection<NotificationJobDoc>("notification_jobs").updateMany(
      { status: "QUEUED" },
      {
        $set: {
          status: "NEEDS_REVIEW",
          needsReview: true,
          holdReason: `WhatsApp paused by ${actor.name}: ${cleanReason}`,
          updatedAt: now,
        },
      },
    );
    await Promise.all(
      [...new Set(queued.map((job) => job.orderId))].map((orderId) =>
        refreshOrderNotificationSummary(orderId),
      ),
    );
  }
  await createAlert({
    type: "WHATSAPP_PAUSED",
    severity: "CRITICAL",
    title: "WhatsApp sending paused",
    message: `${actor.name} paused automated WhatsApp sending. Reason: ${cleanReason}. ${queued.length} queued message(s) need review before sending.`,
    permission: "messaging.review",
    link: "/admin/whatsapp",
  });
  await recordAudit({
    actor,
    action: "message.pause",
    entityType: "settings",
    entityId: "whatsapp",
    summary: `Paused WhatsApp sending · ${cleanReason}`,
  });
}

export async function resumeMessaging(
  actor: MessageActor,
  reviewedQueued: boolean,
): Promise<void> {
  if (!reviewedQueued) {
    throw new MessagingError(
      "Confirm that you have reviewed the queued messages before resuming.",
      "reviewed",
    );
  }
  await getSettings();
  await resumeWhatsApp(actor.email);
  await recordAudit({
    actor,
    action: "message.resume",
    entityType: "settings",
    entityId: "whatsapp",
    summary: "Resumed WhatsApp sending after reviewing the queue",
  });
}

export interface MessagingSnapshot {
  settings: AppSettings;
  mode: "LIVE" | "SIMULATED";
  liveConfigured: boolean;
  templates: MessageTemplate[];
  reviewCount: number;
  queuedCount: number;
  failedCount: number;
  simulatedCount: number;
  spend: SpendState;
  consent: { granted: number; withdrawn: number; notRecorded: number };
}

/** The desk shows four counters, so they come back in one read instead of four. */
async function jobStatusCounts(): Promise<{
  reviewCount: number;
  queuedCount: number;
  failedCount: number;
  simulatedCount: number;
}> {
  const db = await getDb();
  const [row] = await db
    .collection("notification_jobs")
    .aggregate<{ byStatus: { _id: string; n: number }[]; review: { n: number }[] }>([
      {
        $facet: {
          byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
          review: [{ $match: { needsReview: true } }, { $count: "n" }],
        },
      },
    ])
    .toArray();
  const byStatus = new Map((row?.byStatus ?? []).map((entry) => [entry._id, entry.n]));
  return {
    reviewCount: row?.review[0]?.n ?? 0,
    queuedCount: byStatus.get("QUEUED") ?? 0,
    failedCount: byStatus.get("FAILED") ?? 0,
    simulatedCount: byStatus.get("SIMULATED") ?? 0,
  };
}

export async function getMessagingSnapshot(): Promise<MessagingSnapshot> {
  const settings = await getSettings();
  const modeInfo = messagingModeInfo();
  const [templates, spend, consent, counts] = await Promise.all([
    listTemplates(),
    getMonthlySpendState(settings),
    consentCounts(),
    jobStatusCounts(),
  ]);
  return {
    settings,
    mode: modeInfo.mode,
    liveConfigured: modeInfo.liveConfigured,
    templates,
    reviewCount: counts.reviewCount,
    queuedCount: counts.queuedCount,
    failedCount: counts.failedCount,
    simulatedCount: counts.simulatedCount,
    spend,
    consent,
  };
}

export function actorFromUser(user: User): MessageActor {
  return { id: user.id, name: user.name, email: user.email };
}
