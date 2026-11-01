import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { nowIso } from "./dates";
import type { MessageTemplate, NotificationType } from "./types";

export interface TemplateDefault {
  type: NotificationType;
  name: string;
  language: string;
  body: string;
  placeholders: string[];
  placeholderHelp: string;
}

export const TEMPLATE_DEFAULTS: TemplateDefault[] = [
  {
    type: "ORDER_COMPLETED",
    name: "Order completed",
    language: "en",
    placeholders: [
      "customer_name",
      "order_ref",
      "collection_line",
      "items",
      "total",
      "thank_you",
    ],
    placeholderHelp:
      "customer_name, order_ref, collection_line (collection/delivery wording), items (packaging, weight and quantity), total, thank_you",
    body: [
      "Dear {{customer_name}}, your order {{order_ref}} is {{collection_line}}.",
      "",
      "Order: {{items}}",
      "Total amount: {{total}}",
      "",
      "{{thank_you}}",
      "Warm regards, Team GH Chikkis.",
    ].join("\n"),
  },
  {
    type: "INVOICE_DETAILS",
    name: "Invoice details",
    language: "en",
    placeholders: [
      "customer_name",
      "order_ref",
      "invoice_date",
      "items",
      "total",
      "thank_you",
    ],
    placeholderHelp:
      "customer_name, order_ref, invoice_date, items (variety, packaging, weight, quantity, unit price and line total), total, thank_you",
    body: [
      "Invoice {{order_ref}} · {{invoice_date}}",
      "",
      "Dear {{customer_name}},",
      "",
      "{{items}}",
      "",
      "Total amount: {{total}}",
      "",
      "{{thank_you}}",
      "Warm regards, Team GH Chikkis.",
    ].join("\n"),
  },
  {
    type: "CORRECTION",
    name: "Correction / follow-up",
    language: "en",
    placeholders: ["customer_name", "order_ref", "message", "thank_you"],
    placeholderHelp:
      "customer_name, order_ref, message (the correction you type before sending), thank_you",
    body: [
      "Dear {{customer_name}}, a correction to your order {{order_ref}}:",
      "",
      "{{message}}",
      "",
      "{{thank_you}}",
      "Warm regards, Team GH Chikkis.",
    ].join("\n"),
  },
];

interface TemplateDoc extends Omit<MessageTemplate, "id"> {
  _id: string;
}

interface TemplateVersionDoc {
  _id: string;
  templateId: string;
  version: number;
  body: string;
  status: MessageTemplate["status"];
  at: string;
  by: string;
}

let defaultsApplied: Promise<void> | null = null;

/**
 * Every order screen and the WhatsApp desk ask for the templates, so an
 * uncached check costs a round trip per message type per render. The list is
 * only ever filled, never emptied, so one pass per instance is enough.
 */
export function ensureDefaultTemplates(): Promise<void> {
  if (!defaultsApplied) {
    defaultsApplied = applyDefaultTemplates().catch((error) => {
      defaultsApplied = null;
      throw error;
    });
  }
  return defaultsApplied;
}

async function applyDefaultTemplates(): Promise<void> {
  const db = await getDb();
  const templates = db.collection<TemplateDoc>("message_templates");
  const versions = db.collection<TemplateVersionDoc>("template_versions");
  const now = nowIso();
  const present = await templates.find({ channel: "WHATSAPP" }).toArray();
  const missing = TEMPLATE_DEFAULTS.filter(
    (item) => !present.some((doc) => doc.key === item.type),
  );
  await Promise.all(
    missing.map(async (item) => {
      const id = randomUUID();
      try {
        await templates.insertOne({
          _id: id,
          key: item.type,
          channel: "WHATSAPP",
          type: item.type,
          language: item.language,
          name: item.name,
          body: item.body,
          placeholders: item.placeholders,
          metaTemplateName: "",
          status: "DRAFT",
          version: 1,
          active: true,
          updatedAt: now,
          updatedBy: "seed",
        });
        await versions.insertOne({
          _id: randomUUID(),
          templateId: id,
          version: 1,
          body: item.body,
          status: "DRAFT",
          at: now,
          by: "seed",
        });
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) {
          throw error;
        }
      }
    }),
  );
}
