import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { getDb } from "./db";
import { businessToday, isValidBusinessDate, nowIso } from "./dates";
import { recordAudit } from "./audit";
import { getSettings } from "./settings";
import { cleanSingleLine, cleanText } from "./text";
import { PAYMENT_METHODS, type Expense, type PaymentMethod } from "./types";

interface ExpenseDoc extends Omit<Expense, "id"> {
  _id: string;
}

export class ExpenseError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ExpenseError";
    this.field = field;
  }
}

export interface ExpenseActor {
  id: string;
  name: string;
  email: string;
}

export interface ExpenseInput {
  date: string;
  amountPaise: number;
  category: string;
  description?: string;
  supplier?: string;
  receiptRef?: string;
  paymentMethod?: PaymentMethod | null;
  source?: Expense["source"];
  inventoryItemId?: string;
  quantity?: number;
  unit?: string;
  giftOrderId?: string;
}

export interface ExpenseListOptions {
  from?: string;
  to?: string;
  category?: string;
  source?: Expense["source"] | "";
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ExpenseListResult {
  items: Expense[];
  total: number;
  totalPaise: number;
}

function mapExpense(doc: ExpenseDoc): Expense {
  const { _id, ...expense } = doc;
  return { id: _id, ...expense };
}

export function normalizeExpenseDate(value: string): string {
  const cleaned = cleanSingleLine(value, 20);
  if (!isValidBusinessDate(cleaned)) {
    throw new ExpenseError("Enter a valid expense date.", "date");
  }
  if (cleaned > businessToday()) {
    throw new ExpenseError("The expense date cannot be in the future.", "date");
  }
  return cleaned;
}

export function validateExpenseAmount(amountPaise: number): number {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new ExpenseError("Enter an amount greater than zero.", "amount");
  }
  return amountPaise;
}

export async function createExpense(
  input: ExpenseInput,
  actor: ExpenseActor,
): Promise<Expense> {
  const date = normalizeExpenseDate(input.date);
  const amountPaise = validateExpenseAmount(input.amountPaise);
  const category = cleanSingleLine(input.category, 80);
  if (!category) throw new ExpenseError("Choose an expense category.", "category");
  const description = cleanSingleLine(input.description, 500);
  if (!description) {
    throw new ExpenseError("Describe what this expense was for.", "description");
  }
  const supplier = cleanSingleLine(input.supplier, 120);
  const receiptRef = cleanSingleLine(input.receiptRef, 200);
  const paymentMethod = input.paymentMethod ?? null;
  if (
    paymentMethod !== null &&
    !PAYMENT_METHODS.some((method) => method.value === paymentMethod)
  ) {
    throw new ExpenseError("Choose a valid payment method.", "paymentMethod");
  }

  const doc: ExpenseDoc = {
    _id: randomUUID(),
    date,
    amountPaise,
    category,
    description,
    ...(supplier ? { supplier } : {}),
    ...(receiptRef ? { receiptRef } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(input.inventoryItemId ? { inventoryItemId: input.inventoryItemId } : {}),
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.unit ? { unit: input.unit } : {}),
    ...(input.giftOrderId ? { giftOrderId: input.giftOrderId } : {}),
    source: input.source ?? "MANUAL",
    createdAt: nowIso(),
    createdBy: actor.id,
  };

  const db = await getDb();
  await db.collection<ExpenseDoc>("expenses").insertOne(doc);
  await recordAudit({
    actor,
    action: "expense.create",
    entityType: "expense",
    entityId: doc._id,
    summary: `${doc.category} expense of ₹${(amountPaise / 100).toFixed(2)} on ${date}: ${description}`,
  });
  return mapExpense(doc);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDb();
  const doc = await db.collection<ExpenseDoc>("expenses").findOne({ _id: id });
  return doc ? mapExpense(doc) : null;
}

export async function listExpenses(
  options: ExpenseListOptions = {},
): Promise<ExpenseListResult> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (options.from || options.to) {
    const range: Record<string, string> = {};
    if (options.from) range.$gte = options.from;
    if (options.to) range.$lte = options.to;
    filter.date = range;
  }
  if (options.category) filter.category = options.category;
  if (options.source) filter.source = options.source;
  const query = (options.query ?? "").trim();
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { description: { $regex: escaped, $options: "i" } },
      { supplier: { $regex: escaped, $options: "i" } },
      { receiptRef: { $regex: escaped, $options: "i" } },
      { category: { $regex: escaped, $options: "i" } },
    ];
  }
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const [docs, total, totals] = await Promise.all([
    db
      .collection<ExpenseDoc>("expenses")
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("expenses").countDocuments(filter),
    db
      .collection<ExpenseDoc>("expenses")
      .aggregate<{ _id: null; totalPaise: number }>([
        { $match: filter },
        { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
      ])
      .toArray(),
  ]);
  return {
    items: docs.map(mapExpense),
    total,
    totalPaise: Number(totals[0]?.totalPaise ?? 0),
  };
}

export const expenseCategories = cache(async (): Promise<string[]> => {
  const settings = await getSettings();
  return settings.expenseCategories;
});

export function cleanExpenseNotes(value: unknown, maxLength = 1000): string {
  return cleanText(value, maxLength);
}
