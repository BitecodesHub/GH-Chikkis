import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { MongoServerError } from "mongodb";
import { getDb } from "./db";
import { nowIso, businessToday, isValidBusinessDate } from "./dates";
import { recordAudit } from "./audit";
import { createAlert } from "./alerts";
import { getCustomer } from "./customers";
import { calculateLineAmount, paymentStatusFor, balanceFor, formatINR } from "./money";
import { formatPhoneDisplay } from "./phone";
import { getSettings } from "./settings";
import { cleanSingleLine, cleanText } from "./text";
import { enqueueOrderCompletedMessage, flagOrderJobsForReview } from "./messaging";
import type { Customer, Enquiry, Expense, InvoiceSnapshot, InvoiceVersion, Order, OrderDelivery, OrderItem, OrderStatus, OrderType, PaymentMethod, PaymentStatus, Refund, Payment, DeliveryMethod, WeightBasis, GiftDetails } from "./types";

interface OrderDoc extends Omit<Order, "id"> {
  _id: string;
}

interface InvoiceVersionDoc extends Omit<InvoiceVersion, "id"> {
  _id: string;
}

interface PaymentDoc extends Omit<Payment, "id"> {
  _id: string;
}

interface RefundDoc extends Omit<Refund, "id"> {
  _id: string;
}

interface SequenceDoc {
  _id: string;
  current: number;
  prefix: string;
  updatedAt: string;
}

export class OrderError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "OrderError";
    this.field = field;
  }
}

export interface OrderActor {
  id: string;
  name: string;
  email: string;
}

export interface OrderItemInput {
  productId: string;
  packagingId?: string | null;
  actualWeightGrams: number;
  weightBasis: WeightBasis;
  quantity: number;
  ratePerGramPaise: number;
  adjustmentPaise?: number;
  notes?: string;
}

export interface OrderInput {
  type: OrderType;
  customerId: string;
  items: OrderItemInput[];
  orderDate: string;
  expectedDate?: string | null;
  delivery: { method: DeliveryMethod; chargePaise?: number; notes?: string };
  comments?: string;
  gift?: { costPaise: number; treatment: "NEW_EXPENSE" | "ALREADY_RECORDED"; note?: string };
  enquiryId?: string;
  initialPayment?: {
    amountPaise: number;
    method: PaymentMethod;
    date: string;
    reference?: string;
    notes?: string;
  };
  idempotencyKey?: string;
}

export interface PaymentInput {
  orderId: string;
  amountPaise: number;
  method: PaymentMethod;
  date: string;
  reference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface RefundInput {
  orderId: string;
  amountPaise: number;
  method: PaymentMethod;
  date: string;
  reason: string;
  idempotencyKey?: string;
}

function mapOrder(doc: OrderDoc): Order {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function mapInvoiceVersion(doc: InvoiceVersionDoc): InvoiceVersion {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function mapPayment(doc: PaymentDoc): Payment {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function mapRefund(doc: RefundDoc): Refund {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function normalizeBusinessDate(value: string, field: string, label: string): string {
  const cleaned = cleanSingleLine(value, 20);
  if (!isValidBusinessDate(cleaned)) {
    throw new OrderError(`Enter a valid ${label}.`, field);
  }
  if (cleaned > businessToday()) {
    throw new OrderError(`The ${label} cannot be in the future.`, field);
  }
  return cleaned;
}

export async function allocateOrderRef(): Promise<string> {
  const db = await getDb();
  const collection = db.collection<SequenceDoc>("invoice_sequences");
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const doc = await collection.findOneAndUpdate(
        { _id: "orders" },
        {
          $inc: { current: 1 },
          $setOnInsert: { prefix: "GH-" },
          $set: { updatedAt: nowIso() },
        },
        { upsert: true, returnDocument: "after" },
      );
      if (doc && Number.isInteger(doc.current) && doc.current > 0) {
        return `GH-${doc.current}`;
      }
    } catch (error) {
      lastError = error;
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not allocate the next order reference.");
}

const DELIVERY_METHODS: DeliveryMethod[] = ["HOME_COLLECTION", "PORTER", "COURIER", "OTHER"];
const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];
const WEIGHT_BASES: WeightBasis[] = ["PER_UNIT", "TOTAL"];

export interface ResolvedItem extends OrderItemInput {
  productName: string;
  packagingLabel: string;
  standardAmountPaise: number;
  lineTotalPaise: number;
}

async function resolveItems(input: OrderItemInput[]): Promise<ResolvedItem[]> {
  if (!Array.isArray(input) || input.length === 0) {
    throw new OrderError("Add at least one product to the order.", "items");
  }
  if (input.length > 30) {
    throw new OrderError("An order can have at most 30 lines.", "items");
  }
  const db = await getDb();
  const products = await db.collection("products").find({}).toArray();
  const byId = new Map(products.map((product) => [String(product._id), product]));

  return input.map((raw, index) => {
    const label = `Line ${index + 1}`;
    const lineNotes = cleanSingleLine(raw.notes, 500);
    if (!raw.productId) {
      throw new OrderError(`${label}: choose a product.`, "items");
    }
    const product = byId.get(raw.productId);
    if (!product) {
      throw new OrderError(`${label}: the selected product was removed.`, "items");
    }
    const packagingOptions = Array.isArray(product.packaging) ? product.packaging : [];
    const packaging = raw.packagingId
      ? packagingOptions.find(
          (option: { id?: string }) => String(option.id) === String(raw.packagingId),
        )
      : null;
    if (raw.packagingId && !packaging) {
      throw new OrderError(`${label}: the selected packaging is no longer available.`, "items");
    }

    const actualWeightGrams = Math.round(Number(raw.actualWeightGrams));
    if (!Number.isFinite(actualWeightGrams) || actualWeightGrams <= 0) {
      throw new OrderError(`${label}: enter the actual weight in grams.`, "items");
    }
    if (actualWeightGrams > 1_000_000) {
      throw new OrderError(`${label}: the weight looks too large.`, "items");
    }
    const quantity = Math.round(Number(raw.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) {
      throw new OrderError(`${label}: enter a quantity greater than zero.`, "items");
    }
    const weightBasis: WeightBasis = WEIGHT_BASES.includes(raw.weightBasis)
      ? raw.weightBasis
      : "PER_UNIT";
    const ratePerGramPaise = Math.round(Number(raw.ratePerGramPaise));
    const adjustmentPaise = Math.round(Number(raw.adjustmentPaise ?? 0));
    if (!Number.isFinite(ratePerGramPaise) || ratePerGramPaise < 0) {
      throw new OrderError(`${label}: enter a valid rate per gram.`, "items");
    }
    if (!Number.isFinite(adjustmentPaise)) {
      throw new OrderError(`${label}: enter a valid adjustment.`, "items");
    }

    let amounts;
    try {
      amounts = calculateLineAmount({
        ratePerGramPaise,
        actualWeightGrams,
        weightBasis,
        quantity,
        adjustmentPaise,
      });
    } catch (error) {
      throw new OrderError(
        `${label}: ${error instanceof Error ? error.message : "check the amount."}`,
        "items",
      );
    }

    return {
      productId: String(product._id),
      packagingId: raw.packagingId ? String(raw.packagingId) : null,
      productName: String(product.name),
      packagingLabel: packaging ? String(packaging.label) : "Custom",
      actualWeightGrams,
      weightBasis,
      quantity,
      ratePerGramPaise,
      standardAmountPaise: amounts.standardAmountPaise,
      adjustmentPaise,
      lineTotalPaise: amounts.lineTotalPaise,
      ...(lineNotes ? { notes: lineNotes } : {}),
    };
  });
}

function buildOrderItems(items: ResolvedItem[]): OrderItem[] {
  return items.map((item) => ({
    id: randomUUID(),
    productId: item.productId,
    packagingId: item.packagingId ?? null,
    productName: item.productName,
    packagingLabel: item.packagingLabel,
    actualWeightGrams: item.actualWeightGrams,
    weightBasis: item.weightBasis,
    quantity: item.quantity,
    ratePerGramPaise: item.ratePerGramPaise,
    standardAmountPaise: item.standardAmountPaise,
    adjustmentPaise: item.adjustmentPaise ?? 0,
    lineTotalPaise: item.lineTotalPaise,
    ...(item.notes ? { notes: item.notes } : {}),
  }));
}

function validateDelivery(input: OrderInput["delivery"]): OrderDelivery {
  if (!DELIVERY_METHODS.includes(input.method)) {
    throw new OrderError("Choose a delivery or collection method.", "delivery");
  }
  const chargePaise = Math.round(Number(input.chargePaise ?? 0));
  if (!Number.isFinite(chargePaise) || chargePaise < 0) {
    throw new OrderError("The delivery charge must be zero or more.", "delivery");
  }
  const notes = cleanSingleLine(input.notes, 500);
  return {
    method: input.method,
    chargePaise,
    ...(notes ? { notes } : {}),
  };
}

function customerSnapshot(customer: Customer): Order["customerSnapshot"] {
  return {
    name: customer.name,
    phone: customer.phoneOriginal || formatPhoneDisplay(customer.phone),
    ...(customer.email ? { email: customer.email } : {}),
  };
}

function invoiceBusiness(
  settings: Awaited<ReturnType<typeof getSettings>>,
): InvoiceSnapshot["business"] {
  return {
    name: settings.business.name,
    city: settings.business.city,
    state: settings.business.state,
    email: settings.business.email,
    phone: settings.business.phoneDisplay,
    whatsappNumber: settings.business.whatsappNumber,
    addressLine: settings.business.addressLine,
  };
}

function buildInvoice(
  input: {
    ref: string;
    version: number;
    invoiceDate: string;
    customer: Order["customerSnapshot"];
    items: OrderItem[];
    delivery: OrderDelivery;
    subtotalPaise: number;
    totalPaise: number;
  },
  settings: Awaited<ReturnType<typeof getSettings>>,
): InvoiceSnapshot {
  return {
    version: input.version,
    issuedAt: nowIso(),
    ref: input.ref,
    invoiceDate: input.invoiceDate,
    customer: input.customer,
    items: input.items,
    deliveryMethod: input.delivery.method,
    deliveryChargePaise: input.delivery.chargePaise,
    subtotalPaise: input.subtotalPaise,
    totalPaise: input.totalPaise,
    business: invoiceBusiness(settings),
    thankYou: settings.invoice.thankYou,
    footerNote: settings.invoice.footerNote,
  };
}

function invoiceContentKey(snapshot: InvoiceSnapshot): string {
  return JSON.stringify({
    customer: snapshot.customer,
    items: snapshot.items.map((item) => ({
      productName: item.productName,
      packagingLabel: item.packagingLabel,
      actualWeightGrams: item.actualWeightGrams,
      weightBasis: item.weightBasis,
      quantity: item.quantity,
      ratePerGramPaise: item.ratePerGramPaise,
      adjustmentPaise: item.adjustmentPaise,
      lineTotalPaise: item.lineTotalPaise,
      notes: item.notes ?? "",
    })),
    deliveryMethod: snapshot.deliveryMethod,
    deliveryChargePaise: snapshot.deliveryChargePaise,
    subtotalPaise: snapshot.subtotalPaise,
    totalPaise: snapshot.totalPaise,
    business: snapshot.business,
  });
}

async function saveInvoiceVersion(
  orderId: string,
  ref: string,
  snapshot: InvoiceSnapshot,
  actor: OrderActor,
): Promise<void> {
  const db = await getDb();
  const collection = db.collection<InvoiceVersionDoc>("invoice_versions");
  const now = nowIso();
  await collection.updateMany(
    { orderId, version: { $lt: snapshot.version }, supersededAt: { $exists: false } },
    { $set: { supersededAt: now } },
  );
  await collection.updateOne(
    { orderId, version: snapshot.version },
    {
      $setOnInsert: {
        _id: randomUUID(),
        orderId,
        ref,
        version: snapshot.version,
        snapshot,
        createdAt: now,
        createdBy: actor.id,
        createdByName: actor.name,
      },
    },
    { upsert: true },
  );
}

export async function listInvoiceVersions(orderId: string): Promise<InvoiceVersion[]> {
  const db = await getDb();
  const docs = await db
    .collection<InvoiceVersionDoc>("invoice_versions")
    .find({ orderId })
    .sort({ version: -1 })
    .toArray();
  return docs.map(mapInvoiceVersion);
}

export async function getInvoiceVersion(
  orderId: string,
  version: number,
): Promise<InvoiceVersion | null> {
  const db = await getDb();
  const doc = await db
    .collection<InvoiceVersionDoc>("invoice_versions")
    .findOne({ orderId, version });
  return doc ? mapInvoiceVersion(doc) : null;
}

export async function ensureInvoiceVersion(order: Order): Promise<InvoiceVersion | null> {
  if (order.type !== "SALES" || !order.invoice) return null;
  const existing = await getInvoiceVersion(order.id, order.invoice.version);
  if (existing) return existing;
  await saveInvoiceVersion(
    order.id,
    order.ref,
    order.invoice.snapshot,
    { id: order.createdBy, name: order.createdByName ?? "System", email: "" },
  );
  return getInvoiceVersion(order.id, order.invoice.version);
}

async function ensureGiftExpense(
  orderId: string,
  ref: string,
  gift: GiftDetails,
  orderDate: string,
  actor: OrderActor,
): Promise<string | null> {
  if (gift.treatment !== "NEW_EXPENSE" || gift.costPaise <= 0) return null;
  const db = await getDb();
  const expenses = db.collection<Omit<Expense, "id"> & { _id: string }>("expenses");
  const existing = await expenses.findOne({ giftOrderId: orderId });
  if (existing) return String(existing._id);
  const id = randomUUID();
  try {
    await expenses.insertOne({
      _id: id,
      date: orderDate,
      amountPaise: gift.costPaise,
      category: "Gifting",
      description: `Gifting cost for order ${ref}`,
      giftOrderId: orderId,
      source: "GIFT",
      createdAt: nowIso(),
      createdBy: actor.id,
    });
    return id;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const raced = await expenses.findOne({ giftOrderId: orderId });
      return raced ? String(raced._id) : null;
    }
    await createAlert({
      type: "SYSTEM_ERROR",
      severity: "WARNING",
      title: `Gift expense not recorded for ${ref}`,
      message:
        "The gift order was saved, but its cost could not be added to expenses. Add it manually in Expenses.",
      permission: "expenses.manage",
      link: `/admin/orders/${orderId}`,
    });
    return null;
  }
}

async function paymentTotals(
  orderId: string,
): Promise<{ paidPaise: number; refundedPaise: number }> {
  const db = await getDb();
  const [payments, refunds] = await Promise.all([
    db
      .collection("payments")
      .aggregate([
        { $match: { orderId, voidedAt: { $exists: false } } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ])
      .toArray(),
    db
      .collection("refunds")
      .aggregate([
        { $match: { orderId } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ])
      .toArray(),
  ]);
  return {
    paidPaise: Number(payments[0]?.total ?? 0),
    refundedPaise: Number(refunds[0]?.total ?? 0),
  };
}

function summaryFor(
  type: OrderType,
  totalPaise: number,
  paidPaise: number,
  refundedPaise: number,
): { paymentStatus: PaymentStatus; balancePaise: number } {
  if (type === "GIFT") {
    return { paymentStatus: "UNPAID", balancePaise: 0 };
  }
  const net = paidPaise - refundedPaise;
  return {
    paymentStatus: paymentStatusFor(totalPaise, net),
    balancePaise: balanceFor(totalPaise, net),
  };
}

async function refreshPaymentSummary(orderId: string): Promise<void> {
  const db = await getDb();
  const doc = await db.collection<OrderDoc>("orders").findOne({ _id: orderId });
  if (!doc) return;
  const { paidPaise, refundedPaise } = await paymentTotals(orderId);
  const summary = summaryFor(doc.type, doc.totalPaise, paidPaise, refundedPaise);
  await db.collection<OrderDoc>("orders").updateOne(
    { _id: orderId },
    {
      $set: {
        paidPaise,
        refundedPaise,
        balancePaise: summary.balancePaise,
        paymentStatus: summary.paymentStatus,
      },
    },
  );
}

export async function getOrder(id: string): Promise<Order | null> {
  const db = await getDb();
  const doc = await db.collection<OrderDoc>("orders").findOne({ _id: id });
  return doc ? mapOrder(doc) : null;
}

export const getOrderCached = cache(getOrder);

export async function getOrderByRef(ref: string): Promise<Order | null> {
  const db = await getDb();
  const doc = await db.collection<OrderDoc>("orders").findOne({ ref: ref.trim() });
  return doc ? mapOrder(doc) : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface OrderListResult {
  items: Order[];
  total: number;
}

export async function listOrders(options: {
  query?: string;
  status?: OrderStatus | "";
  type?: OrderType | "";
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<OrderListResult> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (options.status) filter.status = options.status;
  if (options.type) filter.type = options.type;
  if (options.customerId) filter.customerId = options.customerId;
  const query = (options.query ?? "").trim();
  if (query) {
    const escaped = escapeRegex(query);
    const digits = query.replace(/\D/g, "");
    const parts: Record<string, unknown>[] = [
      { ref: { $regex: escaped, $options: "i" } },
      { "customerSnapshot.name": { $regex: escaped, $options: "i" } },
      { "customerSnapshot.phone": { $regex: escaped, $options: "i" } },
    ];
    if (digits.length >= 3) {
      parts.push({ "customerSnapshot.phone": { $regex: digits, $options: "i" } });
    }
    filter.$or = parts;
  }
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const [docs, total] = await Promise.all([
    db
      .collection<OrderDoc>("orders")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("orders").countDocuments(filter),
  ]);
  return { items: docs.map(mapOrder), total };
}

export async function listCustomerOrders(customerId: string): Promise<Order[]> {
  const db = await getDb();
  const docs = await db
    .collection<OrderDoc>("orders")
    .find({ customerId })
    .sort({ orderDate: -1, createdAt: -1 })
    .limit(100)
    .toArray();
  return docs.map(mapOrder);
}

export async function listRecentOrders(limit = 6): Promise<Order[]> {
  const db = await getDb();
  const docs = await db
    .collection<OrderDoc>("orders")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(mapOrder);
}

export async function countOrders(options?: { status?: OrderStatus }): Promise<number> {
  const db = await getDb();
  return db.collection("orders").countDocuments(options?.status ? { status: options.status } : {});
}

// The customers who order most often, so a busy day of repeat orders can be
// logged without typing a name each time.
export async function listRepeatCustomers(
  limit = 8,
): Promise<{ id: string; name: string; phone: string; orders: number }[]> {
  const db = await getDb();
  const docs = await db
    .collection<OrderDoc>("orders")
    .find({ customerId: { $type: "string" } })
    .sort({ orderDate: -1 })
    .limit(Math.min(Math.max(limit, 1), 20) * 12)
    .toArray();
  const seen = new Map<string, { id: string; name: string; phone: string; orders: number }>();
  for (const doc of docs) {
    const id = doc.customerId as string;
    const entry = seen.get(id);
    if (entry) {
      entry.orders += 1;
      continue;
    }
    seen.set(id, {
      id,
      name: doc.customerSnapshot?.name ?? "Customer",
      phone: doc.customerSnapshot?.phone ?? "",
      orders: 1,
    });
  }
  return [...seen.values()].sort((a, b) => b.orders - a.orders).slice(0, limit);
}

export interface CustomerOrderStats {
  count: number;
  totalPaise: number;
  outstandingPaise: number;
  lastOrderDate: string | null;
}

export async function customerOrderStats(
  customerIds: string[],
): Promise<Map<string, CustomerOrderStats>> {
  const map = new Map<string, CustomerOrderStats>();
  if (customerIds.length === 0) return map;
  const db = await getDb();
  const docs = await db
    .collection<OrderDoc>("orders")
    .aggregate([
      { $match: { customerId: { $in: customerIds } } },
      {
        $group: {
          _id: "$customerId",
          count: { $sum: 1 },
          totalPaise: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "SALES"] },
                    { $ne: ["$status", "CANCELLED"] },
                  ],
                },
                "$totalPaise",
                0,
              ],
            },
          },
          outstandingPaise: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "SALES"] },
                    { $ne: ["$status", "CANCELLED"] },
                  ],
                },
                "$balancePaise",
                0,
              ],
            },
          },
          lastOrderDate: { $max: "$orderDate" },
        },
      },
    ])
    .toArray();
  for (const doc of docs) {
    map.set(String(doc._id), {
      count: Number(doc.count ?? 0),
      totalPaise: Number(doc.totalPaise ?? 0),
      outstandingPaise: Number(doc.outstandingPaise ?? 0),
      lastOrderDate: doc.lastOrderDate ? String(doc.lastOrderDate) : null,
    });
  }
  return map;
}

export async function createOrder(input: OrderInput, actor: OrderActor): Promise<Order> {
  if (input.idempotencyKey) {
    const db = await getDb();
    const existing = await db
      .collection<OrderDoc>("orders")
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return mapOrder(existing);
  }

  if (input.type !== "SALES" && input.type !== "GIFT") {
    throw new OrderError("Choose Sales or Gifting.", "type");
  }
  const customer = await getCustomer(input.customerId);
  if (!customer) throw new OrderError("Select a customer for this order.", "customer");
  if (customer.archived) {
    throw new OrderError(
      "That customer profile is archived. Restore it or choose another customer.",
      "customer",
    );
  }

  if (input.type === "GIFT" && input.initialPayment) {
    throw new OrderError("Gift records do not take payments.", "payment");
  }

  const orderDate = normalizeBusinessDate(input.orderDate, "orderDate", "order date");
  let expectedDate: string | null = null;
  if (input.expectedDate) {
    expectedDate = normalizeBusinessDate(input.expectedDate, "expectedDate", "expected date");
  }

  const items = await resolveItems(input.items);
  const orderItems = buildOrderItems(items);
  const subtotalPaise = orderItems.reduce((total, item) => total + item.lineTotalPaise, 0);
  const delivery = validateDelivery(input.delivery);
  const totalPaise = subtotalPaise + delivery.chargePaise;

  let gift: GiftDetails | undefined;
  if (input.type === "GIFT") {
    const costPaise = Math.round(Number(input.gift?.costPaise ?? NaN));
    if (!Number.isFinite(costPaise) || costPaise < 0) {
      throw new OrderError("Enter the gifting cost, or zero if there was none.", "gift");
    }
    const treatment =
      input.gift?.treatment === "ALREADY_RECORDED" ? "ALREADY_RECORDED" : "NEW_EXPENSE";
    const note = cleanText(input.gift?.note, 1000);
    gift = {
      costPaise,
      treatment,
      ...(note ? { note } : {}),
    };
  }

  let initialPayment: PaymentInput | null = null;
  if (input.type === "SALES" && input.initialPayment) {
    const amountPaise = Math.round(Number(input.initialPayment.amountPaise));
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new OrderError("Enter a payment amount greater than zero, or leave it blank.", "payment");
    }
    if (amountPaise > totalPaise) {
      throw new OrderError("The first payment cannot be more than the order total.", "payment");
    }
    if (!PAYMENT_METHODS.includes(input.initialPayment.method)) {
      throw new OrderError("Choose a payment method.", "payment");
    }
    initialPayment = {
      orderId: "",
      amountPaise,
      method: input.initialPayment.method,
      date: normalizeBusinessDate(input.initialPayment.date, "paymentDate", "payment date"),
      reference: cleanSingleLine(input.initialPayment.reference, 120) || undefined,
      notes: cleanText(input.initialPayment.notes, 1000) || undefined,
    };
  }

  const settings = await getSettings();
  const db = await getDb();
  const orders = db.collection<OrderDoc>("orders");
  const comments = cleanText(input.comments, 4000);
  const now = nowIso();
  const initialSummary = summaryFor(input.type, totalPaise, 0, 0);

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ref = await allocateOrderRef();
    const id = randomUUID();
    const invoice =
      input.type === "SALES"
        ? {
            version: 1,
            issuedAt: now,
            snapshot: buildInvoice(
              {
                ref,
                version: 1,
                invoiceDate: orderDate,
                customer: customerSnapshot(customer),
                items: orderItems,
                delivery,
                subtotalPaise,
                totalPaise,
              },
              settings,
            ),
          }
        : undefined;

    const doc: OrderDoc = {
      _id: id,
      ref,
      type: input.type,
      status: "NEW",
      customerId: customer.id,
      customerSnapshot: customerSnapshot(customer),
      items: orderItems,
      delivery,
      ...(comments ? { comments } : {}),
      ...(expectedDate ? { expectedDate } : {}),
      ...(gift ? { gift } : {}),
      subtotalPaise,
      totalPaise,
      orderDate,
      statusHistory: [
        {
          status: "NEW",
          at: now,
          by: actor.id,
          byName: actor.name,
        },
      ],
      ...(invoice ? { invoice } : {}),
      source: "MANUAL",
      historical: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      createdByName: actor.name,
      updatedBy: actor.id,
      updatedByName: actor.name,
      paymentStatus: initialSummary.paymentStatus,
      paidPaise: 0,
      refundedPaise: 0,
      balancePaise: initialSummary.balancePaise,
      ...(input.enquiryId ? { enquiryId: input.enquiryId } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    };

    try {
      await orders.insertOne(doc);
    } catch (error) {
      lastError = error;
      if (error instanceof MongoServerError && error.code === 11000) {
        if (error.keyPattern && "idempotencyKey" in error.keyPattern && input.idempotencyKey) {
          const existing = await orders.findOne({ idempotencyKey: input.idempotencyKey });
          if (existing) return mapOrder(existing);
        }
        continue;
      }
      throw error;
    }

    if (invoice) {
      await saveInvoiceVersion(id, ref, invoice.snapshot, actor);
    }
    if (gift) {
      const expenseId = await ensureGiftExpense(id, ref, gift, orderDate, actor);
      if (expenseId) {
        await orders.updateOne({ _id: id }, { $set: { "gift.expenseId": expenseId } });
        doc.gift = { ...gift, expenseId };
      }
    }
    if (initialPayment) {
      await insertPayment(id, doc, initialPayment, actor, `order-open-${id}`);
    }
    if (input.enquiryId) {
      await db
        .collection<Omit<Enquiry, "id"> & { _id: string }>("enquiries")
        .updateOne(
          { _id: input.enquiryId, linkedOrderId: { $exists: false } },
          { $set: { linkedOrderId: id, updatedAt: now, updatedBy: actor.id, updatedByName: actor.name } },
        );
    }

    await recordAudit({
      actor: { id: actor.id, email: actor.email },
      action: "order.create",
      entityType: "order",
      entityId: id,
      summary: `Created ${input.type === "GIFT" ? "gifting" : "sales"} order ${ref} for ${customer.name}`,
    });

    const saved = await getOrder(id);
    return saved ?? mapOrder(doc);
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("The order could not be saved. Try again.");
}

export async function updateOrder(
  orderId: string,
  input: OrderInput,
  actor: OrderActor,
): Promise<Order> {
  const existing = await getOrder(orderId);
  if (!existing) throw new OrderError("That order could not be found.");
  if (existing.status === "CANCELLED") {
    throw new OrderError(
      "Cancelled orders cannot be edited. Their invoice and history stay as issued.",
    );
  }
  if (existing.historical) {
    throw new OrderError(
      "Imported historical orders cannot be edited. Their original details are kept as imported.",
    );
  }
  if (input.type !== existing.type) {
    throw new OrderError(
      "The Sales / Gifting type cannot be changed after the order is saved.",
      "type",
    );
  }

  const customer = await getCustomer(input.customerId);
  if (!customer) throw new OrderError("Select a customer for this order.", "customer");
  if (customer.archived && customer.id !== existing.customerId) {
    throw new OrderError("That customer profile is archived.", "customer");
  }

  const orderDate = normalizeBusinessDate(input.orderDate, "orderDate", "order date");
  let expectedDate: string | null = null;
  if (input.expectedDate) {
    expectedDate = normalizeBusinessDate(input.expectedDate, "expectedDate", "expected date");
  }
  const items = await resolveItems(input.items);
  const orderItems = buildOrderItems(items);
  const subtotalPaise = orderItems.reduce((total, item) => total + item.lineTotalPaise, 0);
  const delivery = validateDelivery(input.delivery);
  const totalPaise = subtotalPaise + delivery.chargePaise;

  let gift: GiftDetails | undefined;
  if (input.type === "GIFT") {
    const costPaise = Math.round(Number(input.gift?.costPaise ?? NaN));
    if (!Number.isFinite(costPaise) || costPaise < 0) {
      throw new OrderError("Enter the gifting cost, or zero if there was none.", "gift");
    }
    const treatment =
      input.gift?.treatment === "ALREADY_RECORDED" ? "ALREADY_RECORDED" : "NEW_EXPENSE";
    const note = cleanText(input.gift?.note, 1000);
    gift = {
      costPaise,
      treatment,
      ...(note ? { note } : {}),
      ...(existing.gift?.expenseId ? { expenseId: existing.gift.expenseId } : {}),
    };
  }

  const settings = await getSettings();
  const now = nowIso();
  let invoice = existing.invoice;
  let invoiceChanged = false;
  if (input.type === "SALES") {
    const nextVersion = existing.invoice ? existing.invoice.version + 1 : 1;
    const candidate = buildInvoice(
      {
        ref: existing.ref,
        version: nextVersion,
        invoiceDate: businessToday(),
        customer: customerSnapshot(customer),
        items: orderItems,
        delivery,
        subtotalPaise,
        totalPaise,
      },
      settings,
    );
    if (!existing.invoice || invoiceContentKey(existing.invoice.snapshot) !== invoiceContentKey(candidate)) {
      invoice = {
        version: candidate.version,
        issuedAt: candidate.issuedAt,
        snapshot: candidate,
      };
      invoiceChanged = true;
    }
  }

  const { paidPaise, refundedPaise } = await paymentTotals(orderId);
  const summary = summaryFor(input.type, totalPaise, paidPaise, refundedPaise);
  const comments = cleanText(input.comments, 4000);

  const db = await getDb();
  await db.collection<OrderDoc>("orders").updateOne(
    { _id: orderId },
    {
      $set: {
        customerId: customer.id,
        customerSnapshot: customerSnapshot(customer),
        items: orderItems,
        delivery,
        comments,
        expectedDate,
        ...(gift ? { gift } : {}),
        subtotalPaise,
        totalPaise,
        orderDate,
        updatedAt: now,
        updatedBy: actor.id,
        updatedByName: actor.name,
        paymentStatus: summary.paymentStatus,
        balancePaise: summary.balancePaise,
        ...(invoice ? { invoice } : {}),
      },
    },
  );

  const updated = await getOrder(orderId);
  if (!updated) throw new OrderError("The order could not be saved.");

  if (invoice && invoiceChanged) {
    await saveInvoiceVersion(orderId, updated.ref, invoice.snapshot, actor);
  }
  if (gift && gift.treatment === "NEW_EXPENSE" && !gift.expenseId) {
    const expenseId = await ensureGiftExpense(orderId, updated.ref, gift, updated.orderDate, actor);
    if (expenseId) {
      await db
        .collection<OrderDoc>("orders")
        .updateOne({ _id: orderId }, { $set: { "gift.expenseId": expenseId } });
      updated.gift = { ...gift, expenseId };
    }
  }

  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "order.update",
    entityType: "order",
    entityId: orderId,
    summary: `Updated order ${updated.ref}${invoiceChanged ? ` · invoice version ${invoice?.version}` : ""}`,
  });

  if (invoiceChanged) {
    try {
      await flagOrderJobsForReview(
        orderId,
        "Order details changed after this message was queued; review it against the latest invoice.",
      );
    } catch (error) {
      console.error("Could not flag queued messages after order update", error);
    }
  }

  return updated;
}

export async function changeOrderStatus(
  orderId: string,
  status: OrderStatus,
  note: string,
  actor: OrderActor,
): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new OrderError("That order could not be found.");
  if (!["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status)) {
    throw new OrderError("Choose one of the four order statuses.");
  }
  if (order.status === status) {
    return order;
  }
  const now = nowIso();
  const cleanNote = cleanSingleLine(note, 500);
  const historyEntry = {
    status,
    at: now,
    by: actor.id,
    byName: actor.name,
    ...(cleanNote ? { note: cleanNote } : {}),
  };
  const db = await getDb();
  await db.collection<OrderDoc>("orders").updateOne(
    { _id: orderId },
    {
      $set: {
        status,
        statusHistory: [...order.statusHistory, historyEntry],
        updatedAt: now,
        updatedBy: actor.id,
        updatedByName: actor.name,
      },
    },
  );

  if (status === "CANCELLED" && order.type === "SALES") {
    const { paidPaise, refundedPaise } = await paymentTotals(orderId);
    if (paidPaise - refundedPaise > 0) {
      await createAlert({
        type: "CANCELLED_ORDER_PAYMENT",
        severity: "WARNING",
        title: `Cancelled order ${order.ref} has payments recorded`,
        message:
          "Decide whether a refund is due and record it on the order. The invoice number stays issued.",
        permission: "payments.manage",
        link: `/admin/orders/${orderId}`,
      });
    }
  }

  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "order.status",
    entityType: "order",
    entityId: orderId,
    summary: `Order ${order.ref} moved to ${status.toLowerCase()}${
      cleanNote ? ` (${cleanNote})` : ""
    }`,
  });

  if (status === "CANCELLED") {
    try {
      await flagOrderJobsForReview(
        orderId,
        "Order was cancelled before this message was sent.",
      );
    } catch (error) {
      console.error("Could not flag queued messages after cancellation", error);
    }
  }

  if (status === "COMPLETED" && order.type === "SALES") {
    try {
      await enqueueOrderCompletedMessage(orderId, actor);
    } catch (error) {
      console.error("Could not queue the order completion message", error);
      await createAlert({
        type: "WHATSAPP_FAILED",
        severity: "WARNING",
        title: `Completion message not queued for ${order.ref}`,
        message:
          "The order was marked complete, but its WhatsApp message could not be prepared. Open the order to send it manually.",
        permission: "messaging.manage",
        link: `/admin/orders/${orderId}`,
      });
    }
  }

  const updated = await getOrder(orderId);
  if (!updated) throw new OrderError("The order could not be updated.");
  return updated;
}

// Removes a mis-keyed order outright; anything that took money or was imported
// keeps its record, because an issued invoice number has to stay explainable.
export async function deleteOrder(orderId: string, actor: OrderActor): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new OrderError("That order could not be found.");
  if (order.historical) {
    throw new OrderError("Imported historical orders cannot be deleted. Their source file stands as the record.");
  }
  if (order.paidPaise - order.refundedPaise > 0) {
    throw new OrderError(
      "Money is recorded against this order, so it cannot be deleted. Cancel it and refund the payment instead.",
    );
  }

  const db = await getDb();
  await Promise.all([
    db.collection("invoice_versions").deleteMany({ orderId }),
    db.collection("payments").deleteMany({ orderId }),
    db.collection("refunds").deleteMany({ orderId }),
    order.gift?.expenseId
      ? db.collection<{ _id: string }>("expenses").deleteOne({ _id: order.gift.expenseId })
      : Promise.resolve(),
    order.enquiryId
      ? db
          .collection<Omit<Enquiry, "id"> & { _id: string }>("enquiries")
          .updateOne(
            { _id: order.enquiryId, linkedOrderId: orderId },
            { $unset: { linkedOrderId: "" } },
          )
      : Promise.resolve(),
  ]);
  await db.collection<OrderDoc>("orders").deleteOne({ _id: orderId });

  try {
    await flagOrderJobsForReview(orderId, "Order was deleted.");
  } catch (error) {
    console.error("Could not flag queued messages after deletion", error);
  }

  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "order.delete",
    entityType: "order",
    entityId: orderId,
    summary: `Deleted order ${order.ref} for ${order.customerSnapshot.name} — ${itemsSummary(order.items)}, ${formatINR(order.totalPaise)}`,
  });
}

async function insertPayment(
  orderId: string,
  order: Pick<Order, "ref" | "type" | "totalPaise">,
  input: PaymentInput,
  actor: OrderActor,
  fallbackKey: string,
): Promise<Payment> {
  const db = await getDb();
  const collection = db.collection<PaymentDoc>("payments");
  const idempotencyKey = input.idempotencyKey || fallbackKey;
  const existing = await collection.findOne({ idempotencyKey });
  if (existing) return mapPayment(existing);

  const date = normalizeBusinessDate(input.date, "paymentDate", "payment date");
  const doc: PaymentDoc = {
    _id: randomUUID(),
    orderId,
    amountPaise: input.amountPaise,
    method: input.method,
    paidAt: nowIso(),
    date,
    ...(cleanSingleLine(input.reference, 120) ? { reference: cleanSingleLine(input.reference, 120) } : {}),
    ...(cleanText(input.notes, 1000) ? { notes: cleanText(input.notes, 1000) } : {}),
    createdBy: actor.id,
    createdByName: actor.name,
    createdAt: nowIso(),
    idempotencyKey,
  };
  try {
    await collection.insertOne(doc);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000 && doc.idempotencyKey) {
      const raced = await collection.findOne({ idempotencyKey: doc.idempotencyKey });
      if (raced) return mapPayment(raced);
    }
    throw error;
  }
  await refreshPaymentSummary(orderId);
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "payment.create",
    entityType: "payment",
    entityId: doc._id,
    summary: `Recorded ${input.method.toLowerCase()} payment on ${order.ref}`,
  });
  return mapPayment(doc);
}

export async function addPayment(input: PaymentInput, actor: OrderActor): Promise<Payment> {
  const order = await getOrder(input.orderId);
  if (!order) throw new OrderError("That order could not be found.");
  if (order.type !== "SALES") throw new OrderError("Gift records do not take payments.");
  if (order.status === "CANCELLED") {
    throw new OrderError("Cancelled orders cannot take new payments. Record a refund instead.");
  }
  const amountPaise = Math.round(Number(input.amountPaise));
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new OrderError("Enter a payment amount greater than zero.", "amount");
  }
  if (!PAYMENT_METHODS.includes(input.method)) {
    throw new OrderError("Choose a payment method.", "method");
  }
  const { paidPaise, refundedPaise } = await paymentTotals(order.id);
  const balance = balanceFor(order.totalPaise, paidPaise - refundedPaise);
  if (amountPaise > balance) {
    throw new OrderError(
      `This payment is more than the outstanding balance (${formatBalance(balance)}).`,
      "amount",
    );
  }
  return insertPayment(
    order.id,
    order,
    { ...input, amountPaise },
    actor,
    input.idempotencyKey || `payment-${order.id}-${Date.now()}`,
  );
}

function formatBalance(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export async function addRefund(input: RefundInput, actor: OrderActor): Promise<Refund> {
  const order = await getOrder(input.orderId);
  if (!order) throw new OrderError("That order could not be found.");
  if (order.type !== "SALES") throw new OrderError("Gift records do not take refunds.");
  const amountPaise = Math.round(Number(input.amountPaise));
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new OrderError("Enter a refund amount greater than zero.", "amount");
  }
  if (!PAYMENT_METHODS.includes(input.method)) {
    throw new OrderError("Choose a refund method.", "method");
  }
  const reason = cleanSingleLine(input.reason, 500);
  if (reason.length < 3) {
    throw new OrderError("Add a short reason for the refund.", "reason");
  }
  const { paidPaise, refundedPaise } = await paymentTotals(order.id);
  const net = paidPaise - refundedPaise;
  if (net <= 0) {
    throw new OrderError("There are no net receipts to refund on this order.", "amount");
  }
  if (amountPaise > net) {
    throw new OrderError(
      `The refund cannot exceed the net amount received (${formatBalance(net)}).`,
      "amount",
    );
  }
  const date = normalizeBusinessDate(input.date, "refundDate", "refund date");
  const db = await getDb();
  const collection = db.collection<RefundDoc>("refunds");
  const idempotencyKey = input.idempotencyKey || `refund-${order.id}-${Date.now()}`;
  const existing = await collection.findOne({ idempotencyKey });
  if (existing) return mapRefund(existing);

  const doc: RefundDoc = {
    _id: randomUUID(),
    orderId: order.id,
    amountPaise,
    method: input.method,
    refundedAt: nowIso(),
    date,
    reason,
    createdBy: actor.id,
    createdByName: actor.name,
    createdAt: nowIso(),
    idempotencyKey,
  };
  try {
    await collection.insertOne(doc);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const raced = await collection.findOne({ idempotencyKey });
      if (raced) return mapRefund(raced);
    }
    throw error;
  }
  await refreshPaymentSummary(order.id);
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "refund.create",
    entityType: "refund",
    entityId: doc._id,
    summary: `Recorded refund on ${order.ref} · ${reason}`,
  });
  return mapRefund(doc);
}

export async function listPayments(orderId: string): Promise<Payment[]> {
  const db = await getDb();
  const docs = await db
    .collection<PaymentDoc>("payments")
    .find({ orderId })
    .sort({ paidAt: 1 })
    .toArray();
  return docs.map(mapPayment);
}

export async function listRefunds(orderId: string): Promise<Refund[]> {
  const db = await getDb();
  const docs = await db
    .collection<RefundDoc>("refunds")
    .find({ orderId })
    .sort({ refundedAt: 1 })
    .toArray();
  return docs.map(mapRefund);
}

export function itemsSummary(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `${item.productName} · ${item.packagingLabel} · ${item.actualWeightGrams} g${
          item.weightBasis === "PER_UNIT" ? " each" : " total"
        } × ${item.quantity}`,
    )
    .join("; ");
}
