import { randomUUID } from "node:crypto";
import type { Enquiry } from "./types";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { createAlert } from "./alerts";
import { recordAudit } from "./audit";

interface EnquiryDoc extends Omit<Enquiry, "id"> {
  _id: string;
}

export interface CreateEnquiryInput {
  name: string;
  phone: string;
  phoneOriginal: string;
  email?: string;
  quantityKg: number;
  expectedDate: string | null;
  notSure: boolean;
  notes?: string;
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
  const db = await getDb();
  const doc: EnquiryDoc = {
    _id: randomUUID(),
    name: input.name,
    phone: input.phone,
    phoneOriginal: input.phoneOriginal,
    email: input.email || undefined,
    quantityKg: input.quantityKg,
    expectedDate: input.expectedDate,
    notSure: input.notSure,
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
        doc.expectedDate ? ` · expected ${doc.expectedDate}` : " · date not decided"
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
