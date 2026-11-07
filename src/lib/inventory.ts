import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { businessToday, isValidBusinessDate, nowIso } from "./dates";
import { recordAudit } from "./audit";
import { createExpense } from "./expenses";
import { roundQuantity, stockLabel } from "./quantity";
import { cleanSingleLine } from "./text";
import type {
  Expense,
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
  PaymentMethod,
} from "./types";

interface InventoryItemDoc extends Omit<InventoryItem, "id"> {
  _id: string;
}

interface InventoryMovementDoc extends Omit<InventoryMovement, "id"> {
  _id: string;
}

export class InventoryError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "InventoryError";
    this.field = field;
  }
}

export interface InventoryActor {
  id: string;
  name: string;
  email: string;
}

export interface InventoryItemInput {
  name: string;
  category: string;
  unit: string;
  active?: boolean;
  openingQuantity?: number;
}

export interface PurchaseInput {
  quantity: number;
  date: string;
  amountPaise: number;
  category: string;
  supplier?: string;
  receiptRef?: string;
  paymentMethod?: PaymentMethod | null;
  notes?: string;
}

export interface UsageInput {
  quantity: number;
  date: string;
  notes?: string;
}

export interface AdjustmentInput {
  countedQuantity: number;
  date: string;
  reason: string;
}

export interface InventoryMovementWithExpense extends InventoryMovement {
  expense?: Pick<Expense, "id" | "amountPaise" | "supplier" | "receiptRef" | "category">;
}

export const INVENTORY_CATEGORIES = [
  "Ingredients/raw materials",
  "Packaging",
  "Other",
] as const;

export const INVENTORY_UNITS = ["kg", "g", "litres", "ml", "pieces", "packs"] as const;

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  PURCHASE: "Purchase",
  USAGE: "Usage",
  ADJUSTMENT: "Adjustment",
};

export { formatStockQuantity, parseInventoryQuantity, roundQuantity, stockLabel } from "./quantity";

export function defaultExpenseCategoryForInventory(category: string): string {
  return /packag/i.test(category) ? "Packaging" : "Ingredients/raw materials";
}

function mapItem(doc: InventoryItemDoc): InventoryItem {
  const { _id, ...item } = doc;
  return { id: _id, ...item };
}

function mapMovement(doc: InventoryMovementDoc): InventoryMovement {
  const { _id, ...movement } = doc;
  return { id: _id, ...movement };
}

function normalizeDate(value: string, label: string): string {
  const cleaned = cleanSingleLine(value, 20);
  if (!isValidBusinessDate(cleaned)) {
    throw new InventoryError(`Enter a valid ${label}.`, "date");
  }
  if (cleaned > businessToday()) {
    throw new InventoryError(`The ${label} cannot be in the future.`, "date");
  }
  return cleaned;
}

function normalizeItemFields(input: InventoryItemInput) {
  const name = cleanSingleLine(input.name, 120);
  if (!name) throw new InventoryError("Enter the item name.", "name");
  const category = cleanSingleLine(input.category, 80) || "Other";
  const unit = cleanSingleLine(input.unit, 30);
  if (!unit) throw new InventoryError("Enter the unit of measurement.", "unit");
  return { name, category, unit };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertNameAvailable(name: string, excludeId?: string): Promise<void> {
  const db = await getDb();
  const filter: Record<string, unknown> = {
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await db.collection("inventory_items").findOne(filter);
  if (existing) {
    throw new InventoryError("An inventory item with this name already exists.", "name");
  }
}

async function computeCurrentQuantity(itemId: string): Promise<number> {
  const db = await getDb();
  const result = await db
    .collection<InventoryMovementDoc>("inventory_movements")
    .aggregate<{ _id: null; total: number }>([
      { $match: { itemId } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ["$type", "USAGE"] },
                { $multiply: ["$quantity", -1] },
                "$quantity",
              ],
            },
          },
        },
      },
    ])
    .toArray();
  return roundQuantity(Number(result[0]?.total ?? 0));
}

async function syncItemQuantity(itemId: string): Promise<number> {
  const db = await getDb();
  const quantity = await computeCurrentQuantity(itemId);
  await db
    .collection<InventoryItemDoc>("inventory_items")
    .updateOne({ _id: itemId }, { $set: { currentQuantity: quantity, updatedAt: nowIso() } });
  return quantity;
}

export async function listInventoryItems(options: {
  query?: string;
  category?: string;
  includeInactive?: boolean;
} = {}): Promise<InventoryItem[]> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (!options.includeInactive) filter.active = true;
  if (options.category) filter.category = options.category;
  const query = (options.query ?? "").trim();
  if (query) {
    const escaped = escapeRegex(query);
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { category: { $regex: escaped, $options: "i" } },
    ];
  }
  // The movement totals do not need the item ids first: grouping every movement
  // and picking the wanted ids afterwards lets both reads share one wave instead
  // of one waiting behind the other.
  const [docs, totals] = await Promise.all([
    db
      .collection<InventoryItemDoc>("inventory_items")
      .find(filter)
      .sort({ active: -1, name: 1 })
      .limit(300)
      .toArray(),
    db
      .collection<InventoryMovementDoc>("inventory_movements")
      .aggregate<{ _id: string; total: number }>([
        {
          $group: {
            _id: "$itemId",
            total: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "USAGE"] },
                  { $multiply: ["$quantity", -1] },
                  "$quantity",
                ],
              },
            },
          },
        },
      ])
      .toArray(),
  ]);
  if (docs.length === 0) return [];
  const totalById = new Map(totals.map((row) => [String(row._id), roundQuantity(Number(row.total ?? 0))]));
  return docs.map((doc) => ({
    ...mapItem(doc),
    currentQuantity: totalById.get(String(doc._id)) ?? 0,
  }));
}

export async function inventoryCategories(): Promise<string[]> {
  const db = await getDb();
  const values = await db.collection("inventory_items").distinct("category");
  const set = new Set<string>(INVENTORY_CATEGORIES);
  for (const value of values) {
    if (typeof value === "string" && value.trim()) set.add(value.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const db = await getDb();
  const doc = await db.collection<InventoryItemDoc>("inventory_items").findOne({ _id: id });
  if (!doc) return null;
  return { ...mapItem(doc), currentQuantity: await computeCurrentQuantity(id) };
}

export async function getInventoryDetail(
  id: string,
): Promise<{ item: InventoryItem; movements: InventoryMovementWithExpense[] } | null> {
  const item = await getInventoryItem(id);
  if (!item) return null;
  const db = await getDb();
  const docs = await db
    .collection<InventoryMovementDoc>("inventory_movements")
    .find({ itemId: id })
    .sort({ date: -1, createdAt: -1 })
    .limit(200)
    .toArray();
  const movements = docs.map(mapMovement);
  const expenseIds = movements
    .map((movement) => movement.expenseId)
    .filter((value): value is string => Boolean(value));
  const expenses = expenseIds.length
    ? await db
        .collection<Omit<Expense, "id"> & { _id: string }>("expenses")
        .find({ _id: { $in: expenseIds } })
        .toArray()
    : [];
  const expenseById = new Map(
    expenses.map((expense) => [
      String(expense._id),
      {
        id: String(expense._id),
        amountPaise: expense.amountPaise,
        supplier: expense.supplier,
        receiptRef: expense.receiptRef,
        category: expense.category,
      },
    ]),
  );
  return {
    item,
    movements: movements.map((movement) => ({
      ...movement,
      expense: movement.expenseId ? expenseById.get(movement.expenseId) : undefined,
    })),
  };
}

export async function createInventoryItem(
  input: InventoryItemInput,
  actor: InventoryActor,
): Promise<InventoryItem> {
  const fields = normalizeItemFields(input);
  await assertNameAvailable(fields.name);
  const opening = input.openingQuantity ? roundQuantity(input.openingQuantity) : 0;
  if (opening < 0) {
    throw new InventoryError("Opening stock cannot be negative.", "openingQuantity");
  }
  const db = await getDb();
  const now = nowIso();
  const item: InventoryItemDoc = {
    _id: randomUUID(),
    name: fields.name,
    category: fields.category,
    unit: fields.unit,
    active: true,
    currentQuantity: opening,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<InventoryItemDoc>("inventory_items").insertOne(item);
  if (opening > 0) {
    const movement: InventoryMovementDoc = {
      _id: randomUUID(),
      itemId: item._id,
      type: "ADJUSTMENT",
      quantity: opening,
      date: businessToday(),
      notes: "Opening stock",
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: now,
    };
    await db.collection<InventoryMovementDoc>("inventory_movements").insertOne(movement);
  }
  await recordAudit({
    actor,
    action: "inventory.item.create",
    entityType: "inventory_item",
    entityId: item._id,
    summary: `Added inventory item ${item.name}${opening > 0 ? ` with opening stock ${stockLabel(opening, item.unit)}` : ""}`,
  });
  return mapItem(item);
}

export async function updateInventoryItem(
  id: string,
  input: InventoryItemInput,
  actor: InventoryActor,
): Promise<InventoryItem> {
  const db = await getDb();
  const existing = await db.collection<InventoryItemDoc>("inventory_items").findOne({ _id: id });
  if (!existing) throw new InventoryError("That inventory item no longer exists.");
  const fields = normalizeItemFields(input);
  await assertNameAvailable(fields.name, id);
  const active = input.active ?? existing.active;
  await db.collection<InventoryItemDoc>("inventory_items").updateOne(
    { _id: id },
    { $set: { ...fields, active, updatedAt: nowIso() } },
  );
  const changes = [
    existing.name !== fields.name ? `name: ${existing.name} → ${fields.name}` : "",
    existing.category !== fields.category ? `category: ${existing.category} → ${fields.category}` : "",
    existing.unit !== fields.unit ? `unit: ${existing.unit} → ${fields.unit}` : "",
    existing.active !== active ? (active ? "reactivated" : "archived") : "",
  ].filter(Boolean);
  await recordAudit({
    actor,
    action: "inventory.item.update",
    entityType: "inventory_item",
    entityId: id,
    summary: changes.length > 0 ? `Updated ${fields.name} (${changes.join(", ")})` : `Saved ${fields.name}`,
  });
  return (await getInventoryItem(id))!;
}

async function insertMovement(
  item: InventoryItem,
  movement: Omit<InventoryMovement, "id" | "createdAt" | "createdBy" | "itemId">,
  actor: InventoryActor,
): Promise<InventoryMovementDoc> {
  const db = await getDb();
  const doc: InventoryMovementDoc = {
    _id: randomUUID(),
    itemId: item.id,
    ...movement,
    createdBy: actor.id,
    createdByName: actor.name,
    createdAt: nowIso(),
  };
  await db.collection<InventoryMovementDoc>("inventory_movements").insertOne(doc);
  return doc;
}

export async function recordPurchase(
  itemId: string,
  input: PurchaseInput,
  actor: InventoryActor,
): Promise<InventoryItem> {
  const db = await getDb();
  const item = await getInventoryItem(itemId);
  if (!item) throw new InventoryError("That inventory item no longer exists.");
  if (!item.active) throw new InventoryError("This item is archived. Reactivate it first.");
  const quantity = roundQuantity(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryError("Enter the quantity purchased.", "quantity");
  }
  const date = normalizeDate(input.date, "purchase date");
  const category = cleanSingleLine(input.category, 80) || defaultExpenseCategoryForInventory(item.category);
  const notes = cleanSingleLine(input.notes, 300);
  const movement = await insertMovement(
    item,
    {
      type: "PURCHASE",
      quantity,
      date,
      notes: notes || undefined,
    },
    actor,
  );
  let expense: Expense;
  try {
    expense = await createExpense(
      {
        date,
        amountPaise: input.amountPaise,
        category,
        description:
          notes || `Purchase of ${stockLabel(quantity, item.unit)} of ${item.name}`,
        supplier: input.supplier,
        receiptRef: input.receiptRef,
        paymentMethod: input.paymentMethod,
        source: "PURCHASE",
        inventoryItemId: item.id,
        quantity,
        unit: item.unit,
      },
      actor,
    );
  } catch (error) {
    await db
      .collection<InventoryMovementDoc>("inventory_movements")
      .deleteOne({ _id: movement._id });
    throw error;
  }
  try {
    await db
      .collection<InventoryMovementDoc>("inventory_movements")
      .updateOne({ _id: movement._id }, { $set: { expenseId: expense.id } });
  } catch (error) {
    await Promise.all([
      db
        .collection<InventoryMovementDoc>("inventory_movements")
        .deleteOne({ _id: movement._id }),
      db.collection<{ _id: string }>("expenses").deleteOne({ _id: expense.id }),
    ]);
    throw error;
  }
  const currentQuantity = await syncItemQuantity(item.id);
  await recordAudit({
    actor,
    action: "inventory.purchase",
    entityType: "inventory_item",
    entityId: item.id,
    summary: `Purchased ${stockLabel(quantity, item.unit)} of ${item.name} for ₹${(input.amountPaise / 100).toFixed(2)}`,
  });
  return { ...item, currentQuantity };
}

export async function recordUsage(
  itemId: string,
  input: UsageInput,
  actor: InventoryActor,
): Promise<InventoryItem> {
  const item = await getInventoryItem(itemId);
  if (!item) throw new InventoryError("That inventory item no longer exists.");
  if (!item.active) throw new InventoryError("This item is archived. Reactivate it first.");
  const quantity = roundQuantity(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryError("Enter the quantity used.", "quantity");
  }
  const date = normalizeDate(input.date, "usage date");
  if (quantity > item.currentQuantity) {
    throw new InventoryError(
      `Only ${stockLabel(item.currentQuantity, item.unit)} is recorded in stock.`,
      "quantity",
    );
  }
  const notes = cleanSingleLine(input.notes, 300);
  await insertMovement(
    item,
    { type: "USAGE", quantity, date, notes: notes || undefined },
    actor,
  );
  const currentQuantity = await syncItemQuantity(item.id);
  await recordAudit({
    actor,
    action: "inventory.usage",
    entityType: "inventory_item",
    entityId: item.id,
    summary: `Used ${stockLabel(quantity, item.unit)} of ${item.name}${notes ? ` · ${notes}` : ""}`,
  });
  return { ...item, currentQuantity };
}

export async function recordAdjustment(
  itemId: string,
  input: AdjustmentInput,
  actor: InventoryActor,
): Promise<InventoryItem> {
  const item = await getInventoryItem(itemId);
  if (!item) throw new InventoryError("That inventory item no longer exists.");
  if (!item.active) throw new InventoryError("This item is archived. Reactivate it first.");
  const counted = roundQuantity(input.countedQuantity);
  if (!Number.isFinite(counted) || counted < 0) {
    throw new InventoryError("Enter the counted quantity, zero or more.", "countedQuantity");
  }
  const date = normalizeDate(input.date, "adjustment date");
  const reason = cleanSingleLine(input.reason, 300);
  if (!reason) {
    throw new InventoryError("Give a reason for the stock adjustment.", "reason");
  }
  const delta = roundQuantity(counted - item.currentQuantity);
  if (delta === 0) {
    throw new InventoryError(
      "The counted quantity matches the recorded stock, so there is nothing to adjust.",
      "countedQuantity",
    );
  }
  await insertMovement(
    item,
    {
      type: "ADJUSTMENT",
      quantity: delta,
      date,
      notes: `${reason} · counted ${stockLabel(counted, item.unit)}`,
    },
    actor,
  );
  const currentQuantity = await syncItemQuantity(item.id);
  await recordAudit({
    actor,
    action: "inventory.adjustment",
    entityType: "inventory_item",
    entityId: item.id,
    summary: `Adjusted ${item.name} from ${stockLabel(item.currentQuantity, item.unit)} to ${stockLabel(counted, item.unit)} · ${reason}`,
  });
  return { ...item, currentQuantity };
}
