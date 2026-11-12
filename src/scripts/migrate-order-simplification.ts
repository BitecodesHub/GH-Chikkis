import { randomUUID } from "node:crypto";
import { closeDatabase, getDb, getMongoClient } from "../lib/db";
import { nowIso } from "../lib/dates";
import { TEMPLATE_DEFAULTS } from "../lib/message-templates";
import type { MessageTemplate } from "../lib/types";

type TemplateDoc = Omit<MessageTemplate, "id"> & { _id: string };
const apply = process.argv.includes("--apply");

async function main() {
  const db = await getDb();
  const legacyFilter = { status: { $in: ["NEW", "CONFIRMED"] } };
  const templateFilter = { channel: "WHATSAPP", type: "INVOICE_DETAILS" } as const;
  const target = TEMPLATE_DEFAULTS.find((template) => template.type === "INVOICE_DETAILS")!;
  const legacyCount = await db.collection("orders").countDocuments(legacyFilter);
  const templates = db.collection<TemplateDoc>("message_templates");
  const existing = await templates.find(templateFilter).toArray();
  console.info(`${apply ? "Apply" : "Dry run"}: ${legacyCount} legacy order statuses; ${existing.filter((template) => template.body !== target.body).length} invoice templates to update.`);
  if (!apply) return;

  const session = (await getMongoClient()).startSession();
  try {
    await session.withTransaction(async () => {
      const now = nowIso();
      await db.collection("orders").updateMany(legacyFilter, { $set: { status: "PENDING" } }, { session });
      const current = await templates.find(templateFilter, { session }).toArray();
      for (const template of current) {
        if (template.body === target.body) continue;
        const version = template.version + 1;
        await templates.updateOne({ _id: template._id }, {
          $set: { body: target.body, placeholders: target.placeholders, status: "DRAFT", version, updatedAt: now, updatedBy: "migration:order-simplification" },
        }, { session });
        await db.collection<{ _id: string; templateId: string; version: number; body: string; status: string; at: string; by: string }>("template_versions").insertOne({
          _id: randomUUID(), templateId: template._id, version, body: target.body,
          status: "DRAFT", at: now, by: "migration:order-simplification",
        }, { session });
      }
    });
  } finally {
    await session.endSession();
  }
  console.info("Order statuses and invoice templates migrated; status history retained.");
}

main().catch(() => {
  console.error("Migration failed; no credentials or database details have been logged.");
  process.exitCode = 1;
}).finally(closeDatabase);
