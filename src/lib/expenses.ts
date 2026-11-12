import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { getDb, getMongoClient } from "./db";
import { roundQuantity } from "./quantity";
import { businessToday, isValidBusinessDate, nowIso } from "./dates";
import { recordAudit } from "./audit";
import { getSettings } from "./settings";
import { cleanSingleLine, cleanText } from "./text";
import { PAYMENT_METHODS, type AuditEntry, type Expense, type InventoryItem, type InventoryMovement, type PaymentMethod } from "./types";

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

// Tombstone, stock reversal and audit must commit together.
export async function deleteExpense(
  id: string,
  actor: ExpenseActor,
  canManageInventory: boolean,
): Promise<void> {
  const db = await getDb();
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const expenses = db.collection<ExpenseDoc>("expenses");
      const expense = await expenses.findOne({ _id: id }, { session });
      if (!expense) throw new ExpenseError("That expense no longer exists.");
      if (expense.source === "GIFT" || expense.giftOrderId) {
        throw new ExpenseError("Gift expenses must be removed by deleting the linked order. Use order deletion instead.");
      }
      const movements = db.collection<Omit<InventoryMovement, "id"> & { _id: string }>("inventory_movements");
      const linked = await movements.find({ expenseId: id }, { session }).limit(2).toArray();
      const isPurchase = expense.source === "PURCHASE" || Boolean(expense.inventoryItemId) || linked.length > 0;
      if (isPurchase && !canManageInventory) {
        throw new ExpenseError("Deleting a stock purchase requires inventory.manage permission.");
      }
      if (expense.deletedAt !== undefined) return; // A retry must never reverse stock twice.
      const now = nowIso();
      let reversalSummary = "";
      if (isPurchase) {
        const purchase = linked[0];
        if (linked.length !== 1 || !purchase || purchase.type !== "PURCHASE" ||
            !expense.inventoryItemId || purchase.itemId !== expense.inventoryItemId ||
            !Number.isFinite(purchase.quantity) || purchase.quantity <= 0) {
          throw new ExpenseError("The original purchase movement is missing or inconsistent. Reconcile the inventory link before deleting this expense.");
        }
        const items = db.collection<Omit<InventoryItem, "id"> & { _id: string }>("inventory_items");
        const item = await items.findOne({ _id: purchase.itemId }, { session });
        if (!item) throw new ExpenseError("The linked inventory item is missing. Reconcile inventory before deleting this expense.");
        const totals = await movements.aggregate<{ total: number }>([
          { $match: { itemId: purchase.itemId } },
          { $group: { _id: null, total: { $sum: { $cond: [
            { $eq: ["$type", "USAGE"] }, { $multiply: ["$quantity", -1] }, "$quantity",
          ] } } } },
        ], { session }).toArray();
        const stock = roundQuantity(Number(totals[0]?.total ?? 0));
        const remaining = roundQuantity(stock - purchase.quantity);
        if (!Number.isFinite(remaining) || remaining < 0) {
          throw new ExpenseError("Not enough stock to reverse this purchase. Reconcile used stock before deleting the expense.");
        }
        // The shared item write serializes stock checks against other mutations.
        await items.updateOne({ _id: item._id }, {
          $set: { currentQuantity: remaining, updatedAt: now },
        }, { session });
        await movements.insertOne({
          _id: `expense-reversal:${id}`,
          itemId: purchase.itemId,
          type: "ADJUSTMENT",
          quantity: -purchase.quantity,
          date: businessToday(),
          // expenseId is uniquely indexed for the ORIGINAL purchase only.
          notes: `Deleted expense ${id}; reversal of purchase movement ${purchase._id}`,
          createdBy: actor.id,
          createdByName: actor.name,
          createdAt: now,
        }, { session });
        reversalSummary = `; reversed ${purchase.quantity} ${expense.unit || item.unit} of ${item.name}`;
      }
      await expenses.updateOne({ _id: id, deletedAt: { $exists: false } }, {
        $set: { deletedAt: now, deletedBy: actor.id },
      }, { session });
      // Insert directly so an audit failure also rolls back the deletion.
      await db.collection<Omit<AuditEntry, "id"> & { _id: string }>("audit_logs").insertOne({
        _id: randomUUID(),
        actorId: actor.id,
        actorEmail: actor.email,
        action: "expense.delete",
        entityType: "expense",
        entityId: id,
        summary: `Deleted ${expense.category} expense of ₹${(expense.amountPaise / 100).toFixed(2)} on ${expense.date}${reversalSummary}`.slice(0, 500),
        diff: [{ field: "deletedAt", from: "", to: now }],
        at: now,
      }, { session });
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
  } finally {
    await session.endSession();
  }
}

export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDb();
  const doc = await db.collection<ExpenseDoc>("expenses").findOne({ _id: id, deletedAt: { $exists: false } });
  return doc ? mapExpense(doc) : null;
}

export async function listExpenses(
  options: ExpenseListOptions = {},
): Promise<ExpenseListResult> {
  const db = await getDb();
  const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
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
