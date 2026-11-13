import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { MongoServerError } from "mongodb";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { recordAudit, diffFields } from "./audit";
import { cleanSingleLine, cleanText } from "./text";
import { normalizePhone } from "./phone";
import type { Address, Customer } from "./types";

interface CustomerDoc extends Omit<Customer, "id"> {
  _id: string;
  updatedByName?: string;
}

export class CustomerError extends Error {
  readonly field?: string;
  readonly existingId?: string;

  constructor(message: string, field?: string, existingId?: string) {
    super(message);
    this.name = "CustomerError";
    this.field = field;
    this.existingId = existingId;
  }
}

export interface CustomerActor {
  id: string;
  name: string;
  email: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  gstin?: string;
  notes?: string;
  address?: Address | null;
  archived?: boolean;
}

function mapCustomer(doc: CustomerDoc): Customer {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function cleanAddress(raw: Address | null | undefined): Address | null {
  if (!raw) return null;
  const address: Address = {
    label: cleanSingleLine(raw.label, 40) || "Delivery",
    line1: cleanSingleLine(raw.line1, 160),
    city: cleanSingleLine(raw.city, 80),
    state: cleanSingleLine(raw.state, 80),
    pincode: cleanSingleLine(raw.pincode, 10),
    ...(cleanSingleLine(raw.line2, 160) ? { line2: cleanSingleLine(raw.line2, 160) } : {}),
  };
  if (!address.line1 && !address.city && !address.state && !address.pincode) return null;
  return address;
}

export function formatAddress(address: Address): string {
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
}

function validate(input: CustomerInput): {
  name: string;
  phone: { phone: string; phoneOriginal: string };
  email?: string;
  company?: string;
  gstin?: string;
  notes?: string;
  address?: Address | null;
} {
  const name = cleanSingleLine(input.name, 120);
  if (name.length < 2) {
    throw new CustomerError("Enter the customer’s full name.", "name");
  }
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) {
    throw new CustomerError(
      "Enter a valid phone number, including the country code if outside India.",
      "phone",
    );
  }
  const email = cleanSingleLine(input.email, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CustomerError("Enter a valid email address, or leave it blank.", "email");
  }
  const notes = cleanText(input.notes, 4000);
  return {
    name,
    phone,
    email: email || undefined,
    company: cleanSingleLine(input.company, 160) || undefined,
    gstin: cleanSingleLine(input.gstin, 20) || undefined,
    notes: notes || undefined,
    address: input.address === undefined ? undefined : cleanAddress(input.address),
  };
}

export async function findCustomerByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const db = await getDb();
  const doc = await db
    .collection<CustomerDoc>("customers")
    .findOne({ phone: normalized.phone });
  return doc ? mapCustomer(doc) : null;
}

export const getCustomer = cache(async (id: string): Promise<Customer | null> => {
  const db = await getDb();
  const doc = await db.collection<CustomerDoc>("customers").findOne({ _id: id });
  return doc ? mapCustomer(doc) : null;
});

function searchFilter(query: string): Record<string, unknown> {
  const trimmed = query.trim();
  if (!trimmed) return {};
  const digits = trimmed.replace(/\D/g, "");
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filters: Record<string, unknown>[] = [
    { name: { $regex: escaped, $options: "i" } },
    { email: { $regex: escaped, $options: "i" } },
    { company: { $regex: escaped, $options: "i" } },
  ];
  if (digits.length >= 3) {
    filters.push({ phone: { $regex: digits, $options: "i" } });
    filters.push({ phoneOriginal: { $regex: digits, $options: "i" } });
  }
  return { $or: filters };
}

export interface CustomerListResult {
  items: Customer[];
  total: number;
}

export async function listCustomers(options: {
  query?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}): Promise<CustomerListResult> {
  const db = await getDb();
  const filter: Record<string, unknown> = searchFilter(options.query ?? "");
  if (!options.includeArchived) filter.archived = { $ne: true };
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const [docs, total] = await Promise.all([
    db
      .collection<CustomerDoc>("customers")
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("customers").countDocuments(filter),
  ]);
  return { items: docs.map(mapCustomer), total };
}

export async function searchCustomers(
  query: string,
  limit = 8,
  includeArchived = false,
): Promise<Customer[]> {
  if (query.trim().length < 2) return [];
  const db = await getDb();
  const filter: Record<string, unknown> = searchFilter(query);
  if (!includeArchived) filter.archived = { $ne: true };
  const docs = await db
    .collection<CustomerDoc>("customers")
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 20))
    .toArray();
  return docs.map(mapCustomer);
}

export async function countCustomers(): Promise<number> {
  const db = await getDb();
  return db.collection("customers").countDocuments({ archived: { $ne: true } });
}

export async function createCustomer(
  input: CustomerInput,
  actor: CustomerActor,
): Promise<Customer> {
  const data = validate(input);
  const db = await getDb();
  const collection = db.collection<CustomerDoc>("customers");
  const existing = await collection.findOne({ phone: data.phone.phone });
  if (existing) {
    throw new CustomerError(
      `A customer with this phone number already exists: ${existing.name}. Open that profile instead of creating a duplicate.`,
      "phone",
      existing._id,
    );
  }

  const now = nowIso();
  const doc: CustomerDoc = {
    _id: randomUUID(),
    name: data.name,
    phone: data.phone.phone,
    phoneOriginal: data.phone.phoneOriginal,
    ...(data.email ? { email: data.email } : {}),
    addresses: data.address ? [data.address] : [],
    ...(data.company ? { company: data.company } : {}),
    ...(data.gstin ? { gstin: data.gstin } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
    archived: Boolean(input.archived),
    createdAt: now,
    updatedAt: now,
    updatedByName: actor.name,
    whatsappConsent: "NONE",
  };

  try {
    await collection.insertOne(doc);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new CustomerError(
        "A customer with this phone number already exists. Search for them before creating a new profile.",
        "phone",
      );
    }
    throw error;
  }

  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "customer.create",
    entityType: "customer",
    entityId: doc._id,
    summary: `Created customer ${doc.name}`,
  });

  return mapCustomer(doc);
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
  actor: CustomerActor,
): Promise<Customer> {
  const data = validate(input);
  const db = await getDb();
  const collection = db.collection<CustomerDoc>("customers");
  const existing = await collection.findOne({ _id: id });
  if (!existing) throw new CustomerError("That customer could not be found.");

  const clash = await collection.findOne({
    phone: data.phone.phone,
    _id: { $ne: id },
  });
  if (clash) {
    throw new CustomerError(
      `That phone number is already used by ${clash.name}. Two profiles cannot share a number.`,
      "phone",
      clash._id,
    );
  }

  const next: CustomerDoc = {
    ...existing,
    name: data.name,
    phone: data.phone.phone,
    phoneOriginal: data.phone.phoneOriginal,
    email: data.email,
    // The form no longer collects an address, so an absent field must not
    // discard one that an import or an older screen already stored.
    addresses:
      data.address === undefined
        ? existing.addresses
        : data.address
          ? [data.address]
          : [],
    company: data.company,
    gstin: data.gstin,
    notes: data.notes,
    archived: Boolean(input.archived),
    updatedAt: nowIso(),
    updatedByName: actor.name,
  };

  await collection.replaceOne({ _id: id }, next);

  const diff = diffFields(
    {
      name: existing.name,
      phone: existing.phone,
      email: existing.email ?? "",
      company: existing.company ?? "",
      gstin: existing.gstin ?? "",
      notes: existing.notes ?? "",
      archived: String(Boolean(existing.archived)),
    },
    {
      name: next.name,
      phone: next.phone,
      email: next.email ?? "",
      company: next.company ?? "",
      gstin: next.gstin ?? "",
      notes: next.notes ?? "",
      archived: String(Boolean(next.archived)),
    },
    ["name", "phone", "email", "company", "gstin", "notes", "archived"],
  );

  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "customer.update",
    entityType: "customer",
    entityId: id,
    summary: `Updated customer ${next.name}`,
    diff,
  });

  return mapCustomer(next);
}

export async function deleteCustomer(id: string, actor: CustomerActor): Promise<void> {
  const db = await getDb();
  const collection = db.collection<CustomerDoc>("customers");
  const existing = await collection.findOne({ _id: id });
  if (!existing) throw new CustomerError("That customer could not be found.");

  const orderCount = await db.collection("orders").countDocuments({ customerId: id });
  if (orderCount > 0) {
    throw new CustomerError(
      `${existing.name} has ${orderCount} ${orderCount === 1 ? "order" : "orders"}, so the profile cannot be deleted. Archive it instead — the order history stays linked.`,
    );
  }

  await db.collection("consents").deleteMany({ customerId: id });
  await collection.deleteOne({ _id: id });
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "customer.delete",
    entityType: "customer",
    entityId: id,
    summary: `Deleted customer ${existing.name}`,
  });
}

export async function setCustomerArchived(
  id: string,
  archived: boolean,
  actor: CustomerActor,
): Promise<void> {
  const db = await getDb();
  const result = await db.collection<CustomerDoc>("customers").findOneAndUpdate(
    { _id: id },
    {
      $set: {
        archived,
        updatedAt: nowIso(),
        updatedByName: actor.name,
      },
    },
    { returnDocument: "after" },
  );
  if (!result) throw new CustomerError("That customer could not be found.");
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: archived ? "customer.archive" : "customer.restore",
    entityType: "customer",
    entityId: id,
    summary: `${archived ? "Archived" : "Restored"} customer ${result.name}`,
  });
}
