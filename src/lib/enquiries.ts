import { randomUUID } from "node:crypto";
import { cache } from "react";
import type { Enquiry } from "./types";
import { getDb } from "./db";
import { formatDateDDMMYYYY, nowIso } from "./dates";
import { createAlert } from "./alerts";
import { recordAudit } from "./audit";
import { cleanText } from "./text";

interface EnquiryDoc extends Omit<Enquiry, "id"> {
  _id: string;
}

export interface CreateEnquiryInput {
  name: string;
  quantityKg: number;
  notes?: string;
  /** The website form stopped asking; stored enquiries still carry these. */
  phone?: string;
  phoneOriginal?: string;
  email?: string;
  expectedDate?: string | null;
  notSure?: boolean;
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
  const db = await getDb();
  const doc: EnquiryDoc = {
    _id: randomUUID(),
    name: input.name,
    phone: input.phone ?? "",
    phoneOriginal: input.phoneOriginal ?? "",
    email: input.email || undefined,
    quantityKg: input.quantityKg,
    expectedDate: input.expectedDate ?? null,
    notSure: input.notSure ?? false,
    submittedAt: nowIso(),
    notes: input.notes,
    whatsappConsent: false,
  };
  await db.collection<EnquiryDoc>("enquiries").insertOne(doc);

  await Promise.all([
    createAlert({
      type: "NEW_ENQUIRY",
      severity: "INFO",
      title: `New enquiry from ${doc.name}`,
      message: `${doc.quantityKg} kg${
        doc.expectedDate
          ? ` · expected ${formatDateDDMMYYYY(doc.expectedDate)}`
          : doc.notSure
            ? " · date not decided"
            : ""
      }`,
      permission: "enquiries.manage",
      link: "/admin/enquiries",
    }),
    recordAudit({
      actor: null,
      action: "enquiry.create",
      entityType: "enquiry",
      entityId: doc._id,
      summary: `Website enquiry received from ${doc.name}`,
    }),
  ]);

  const { _id, ...enquiry } = doc;
  return { id: _id, ...enquiry };
}

export async function listRecentEnquiries(limit = 6): Promise<Enquiry[]> {
  const db = await getDb();
  const docs = await db
    .collection<EnquiryDoc>("enquiries")
    .find({})
    .sort({ submittedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...enquiry }) => ({ id: _id, ...enquiry }));
}

export async function countEnquiries(sinceIso?: string): Promise<number> {
  const db = await getDb();
  return db
    .collection("enquiries")
    .countDocuments(sinceIso ? { submittedAt: { $gte: sinceIso } } : {});
}

function enquiryFilter(query: string): Record<string, unknown> {
  const trimmed = query.trim();
  if (!trimmed) return {};
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const digits = trimmed.replace(/\D/g, "");
  const filters: Record<string, unknown>[] = [
    { name: { $regex: escaped, $options: "i" } },
    { email: { $regex: escaped, $options: "i" } },
  ];
  if (digits.length >= 3) {
    filters.push({ phone: { $regex: digits, $options: "i" } });
    filters.push({ phoneOriginal: { $regex: escaped, $options: "i" } });
  }
  return { $or: filters };
}

export interface EnquiryListResult {
  items: Enquiry[];
  total: number;
}

export async function listEnquiries(options: {
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<EnquiryListResult> {
  const db = await getDb();
  const filter = enquiryFilter(options.query ?? "");
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const [docs, total] = await Promise.all([
    db
      .collection<EnquiryDoc>("enquiries")
      .find(filter)
      .sort({ submittedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("enquiries").countDocuments(filter),
  ]);
  return {
    items: docs.map(({ _id, ...enquiry }) => ({ id: _id, ...enquiry })),
    total,
  };
}

export const getEnquiry = cache(async (id: string): Promise<Enquiry | null> => {
  const db = await getDb();
  const doc = await db.collection<EnquiryDoc>("enquiries").findOne({ _id: id });
  if (!doc) return null;
  const { _id, ...enquiry } = doc;
  return { id: _id, ...enquiry };
});

export async function updateEnquiryNotes(
  id: string,
  internalNotes: string,
  actor: { id: string; name: string; email: string },
): Promise<void> {
  const db = await getDb();
  const notes = cleanText(internalNotes, 4000);
  const result = await db.collection<EnquiryDoc>("enquiries").updateOne(
    { _id: id },
    {
      $set: {
        internalNotes: notes,
        updatedAt: nowIso(),
        updatedBy: actor.id,
        updatedByName: actor.name,
      },
    },
  );
  if (result.matchedCount === 0) throw new Error("That enquiry could not be found.");
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "enquiry.notes",
    entityType: "enquiry",
    entityId: id,
    summary: "Updated internal enquiry notes",
  });
}
