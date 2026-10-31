import "server-only";
import { createHash, randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { MongoServerError, type Document } from "mongodb";
import { recordAudit } from "./audit";
import { getDb } from "./db";
import { businessToday, nowIso, parseBusinessDate } from "./dates";
import { parseRupeesToPaise, paymentStatusFor } from "./money";
import { allocateOrderRef } from "./orders";
import { formatPhoneDisplay, normalizePhone } from "./phone";
import { getSettings } from "./settings";
import { cleanSingleLine, cleanText } from "./text";
import type {
  BusinessDate,
  Customer,
  DeliveryMethod,
  ImportBatch,
  ImportKind,
  ImportStatus,
  InvoiceSnapshot,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from "./types";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_COLUMNS = 30;
const MAX_SUMMARY_ERRORS = 25;

export class ImportError extends Error {
  readonly existingBatchId?: string;

  constructor(message: string, existingBatchId?: string) {
    super(message);
    this.name = "ImportError";
    this.existingBatchId = existingBatchId;
  }
}

export interface ImportActor {
  id: string;
  name: string;
  email: string;
}

export type ImportFieldKey =
  | "name"
  | "phone"
  | "email"
  | "company"
  | "gstin"
  | "notes"
  | "customerName"
  | "orderDate"
  | "total"
  | "amountPaid"
  | "paymentMethod"
  | "product"
  | "quantityKg"
  | "reference"
  | "status"
  | "deliveryMethod"
  | "deliveryCharge";

export interface ImportField {
  key: ImportFieldKey;
  label: string;
  required?: boolean;
  aliases: string[];
  hint?: string;
}

export const IMPORT_FIELDS: Record<ImportKind, ImportField[]> = {
  CUSTOMERS: [
    {
      key: "name",
      label: "Customer name",
      required: true,
      aliases: ["name", "customer", "customer name", "customer name", "full name", "fullname"],
    },
    {
      key: "phone",
      label: "Phone",
      required: true,
      aliases: ["phone", "mobile", "phone number", "mobile number", "whatsapp", "contact"],
      hint: "10-digit Indian numbers are assumed to be +91.",
    },
    {
      key: "email",
      label: "Email",
      aliases: ["email", "email address", "e-mail", "mail"],
    },
    {
      key: "company",
      label: "Company",
      aliases: ["company", "business", "firm", "organisation", "organization"],
    },
    {
      key: "gstin",
      label: "GSTIN",
      aliases: ["gstin", "gst", "gst number", "tax id"],
    },
    {
      key: "notes",
      label: "Notes",
      aliases: ["notes", "note", "remarks", "comments"],
    },
  ],
  ORDERS: [
    {
      key: "customerName",
      label: "Customer name",
      required: true,
      aliases: ["customer name", "customer", "name", "full name", "fullname"],
    },
    {
      key: "phone",
      label: "Phone",
      required: true,
      aliases: ["phone", "mobile", "phone number", "mobile number", "whatsapp", "contact"],
      hint: "Existing customers are matched by phone; duplicates are never created.",
    },
    {
      key: "email",
      label: "Email",
      aliases: ["email", "email address", "e-mail", "mail"],
    },
    {
      key: "orderDate",
      label: "Order date",
      required: true,
      aliases: ["order date", "date", "invoice date", "orderdate", "purchase date"],
      hint: "DD/MM/YYYY, DD-MM-YYYY or YYYY-MM-DD.",
    },
    {
      key: "total",
      label: "Order total",
      required: true,
      aliases: ["total", "amount", "order total", "grand total", "value"],
      hint: "Rupees. Include the delivery charge in the total.",
    },
    {
      key: "amountPaid",
      label: "Amount paid",
      aliases: ["amount paid", "paid", "payment received", "advance"],
      hint: "Rupees. Blank means nothing has been paid.",
    },
    {
      key: "paymentMethod",
      label: "Payment method",
      aliases: ["payment method", "method", "paid by", "payment mode"],
      hint: "Cash, UPI, bank transfer or other. Defaults to other.",
    },
    {
      key: "product",
      label: "Product / description",
      aliases: ["product", "item", "description", "product name", "particulars"],
    },
    {
      key: "quantityKg",
      label: "Quantity (kg)",
      aliases: ["quantity", "quantity kg", "weight", "weight kg", "kg", "qty"],
      hint: "Optional. Shown on the invoice without inventing a rate per gram.",
    },
    {
      key: "reference",
      label: "Invoice reference",
      aliases: ["reference", "invoice reference", "invoice number", "invoice no", "ref", "order id"],
      hint: "Preserved when valid and unique. GH- gaps are filled safely.",
    },
    {
      key: "status",
      label: "Order status",
      aliases: ["status", "order status"],
      hint: "NEW, CONFIRMED, COMPLETED or CANCELLED. Defaults to COMPLETED.",
    },
    {
      key: "deliveryMethod",
      label: "Delivery method",
      aliases: ["delivery method", "delivery", "collection", "delivery type"],
      hint: "Home collection, Porter, Courier or Other. Defaults to home collection.",
    },
    {
      key: "deliveryCharge",
      label: "Delivery charge",
      aliases: ["delivery charge", "delivery amount", "shipping", "delivery fee"],
      hint: "Rupees. Deducted from the total for the invoice subtotal.",
    },
    {
      key: "notes",
      label: "Notes",
      aliases: ["notes", "note", "remarks", "comments", "internal notes"],
    },
  ],
};

interface ImportBatchDoc extends Omit<ImportBatch, "id"> {
  _id: string;
}

interface CustomerDoc extends Omit<Customer, "id"> {
  _id: string;
}

interface OrderDoc extends Document {
  _id: string;
  ref: string;
  type: "SALES" | "GIFT";
  status: OrderStatus;
  customerId: string | null;
  customerSnapshot: { name: string; phone: string; email?: string };
  items: OrderItem[];
  delivery: { method: DeliveryMethod; chargePaise: number; notes?: string };
  comments?: string;
  subtotalPaise: number;
  totalPaise: number;
  orderDate: BusinessDate;
  statusHistory: {
    status: OrderStatus;
    at: string;
    by: string;
    byName?: string;
    note?: string;
  }[];
  invoice?: { version: number; issuedAt: string; snapshot: InvoiceSnapshot };
  source: "MANUAL" | "IMPORT";
  historical: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName?: string;
  updatedBy: string;
  updatedByName?: string;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID";
  paidPaise: number;
  refundedPaise: number;
  balancePaise: number;
  idempotencyKey?: string;
  importBatchId?: string;
  importRow?: number;
}

interface PaymentDoc extends Document {
  _id: string;
  orderId: string;
  amountPaise: number;
  method: PaymentMethod;
  paidAt: string;
  date: string;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  idempotencyKey: string;
}

const ORDER_STATUS_ALIASES: Record<string, OrderStatus> = {
  NEW: "NEW",
  OPEN: "NEW",
  CONFIRMED: "CONFIRMED",
  COMPLETE: "COMPLETED",
  COMPLETED: "COMPLETED",
  DONE: "COMPLETED",
  CANCELLED: "CANCELLED",
  CANCELED: "CANCELLED",
};

const DELIVERY_ALIASES: Record<string, DeliveryMethod> = {
  HOME_COLLECTION: "HOME_COLLECTION",
  HOME: "HOME_COLLECTION",
  COLLECTION: "HOME_COLLECTION",
  "HOME COLLECTION": "HOME_COLLECTION",
  PICKUP: "HOME_COLLECTION",
  PORTER: "PORTER",
  COURIER: "COURIER",
  SHIPPING: "COURIER",
  OTHER: "OTHER",
};

const PAYMENT_ALIASES: Record<string, PaymentMethod> = {
  CASH: "CASH",
  UPI: "UPI",
  GPAY: "UPI",
  "GOOGLE PAY": "UPI",
  PHONEPE: "UPI",
  PAYTM: "UPI",
  BANK: "BANK_TRANSFER",
  BANK_TRANSFER: "BANK_TRANSFER",
  "BANK TRANSFER": "BANK_TRANSFER",
  NEFT: "BANK_TRANSFER",
  IMPS: "BANK_TRANSFER",
  RTGS: "BANK_TRANSFER",
  OTHER: "OTHER",
};

const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,39}$/;

function mapBatch(doc: ImportBatchDoc): ImportBatch {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeToken(value: string): string {
  return value.trim().toUpperCase().replace(/[_]+/g, " ").replace(/\s+/g, " ");
}

function cleanCell(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().slice(0, 2000);
}

function readCell(row: string[], mapping: Record<string, string>, key: ImportFieldKey): string {
  const index = Number(mapping[key]);
  if (!Number.isInteger(index) || index < 0) return "";
  return cleanCell(row[index] ?? "");
}

function formatQuantityKg(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

function parseQuantityKg(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000) return null;
  return parsed;
}

function parseStatus(value: string): OrderStatus {
  if (!value.trim()) return "COMPLETED";
  return ORDER_STATUS_ALIASES[normalizeToken(value)] ?? "COMPLETED";
}

function parseDelivery(value: string): DeliveryMethod {
  if (!value.trim()) return "HOME_COLLECTION";
  return DELIVERY_ALIASES[normalizeToken(value)] ?? "HOME_COLLECTION";
}

function parsePaymentMethod(value: string): PaymentMethod {
  if (!value.trim()) return "OTHER";
  return PAYMENT_ALIASES[normalizeToken(value)] ?? "OTHER";
}

function validReference(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^gh-\d+$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
  return REFERENCE_PATTERN.test(candidate) ? candidate : null;
}

function stableId(seed: string): string {
  const chars = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(
    16,
    20,
  )}-${value.slice(20)}`;
}

export interface ParsedImportFile {
  headers: string[];
  rows: string[][];
  checksum: string;
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (character === "\r") {
      if (source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new ImportError("The CSV file has an unclosed quote.");
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const comma = (firstLine.match(/,/g) ?? []).length;
  const semicolon = (firstLine.match(/;/g) ?? []).length;
  const tab = (firstLine.match(/\t/g) ?? []).length;
  if (semicolon > comma && semicolon >= tab) return ";";
  if (tab > comma && tab > semicolon) return "\t";
  return ",";
}

function excelCellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const day = String(value.getUTCDate()).padStart(2, "0");
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${value.getUTCFullYear()}`;
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== undefined && value.result !== null) {
      return excelCellText(value.result as ExcelJS.CellValue);
    }
    if ("error" in value) return "";
  }
  return "";
}

async function parseWorkbook(bytes: Uint8Array): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    throw new ImportError("That Excel file could not be read. Save it as .xlsx and try again.");
  }
  const sheet = workbook.worksheets.find((worksheet) => worksheet.rowCount > 1);
  if (!sheet) throw new ImportError("The workbook does not contain any data rows.");

  const rows: string[][] = [];
  const rowCount = Math.min(sheet.rowCount, MAX_IMPORT_ROWS + 2);
  for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
    const worksheetRow = sheet.getRow(rowIndex);
    const values: string[] = [];
    const columnCount = Math.min(sheet.columnCount, MAX_IMPORT_COLUMNS + 5);
    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      values.push(excelCellText(worksheetRow.getCell(columnIndex).value));
    }
    while (values.length > 0 && values[values.length - 1].trim() === "") values.pop();
    rows.push(values);
  }
  return rows;
}

export async function parseImportFile(
  filename: string,
  bytes: Uint8Array,
): Promise<ParsedImportFile> {
  if (bytes.byteLength === 0) throw new ImportError("Choose a file to upload.");
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new ImportError("The file is larger than 2 MB. Split it into smaller files.");
  }
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  let matrix: string[][];
  if (extension === "csv") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ImportError("The CSV file is not valid UTF-8 text.");
    }
    if (text.includes("\u0000")) throw new ImportError("The CSV file is not plain text.");
    matrix = parseCsv(text);
  } else if (extension === "xlsx") {
    matrix = await parseWorkbook(bytes);
  } else {
    throw new ImportError("Upload a .csv or .xlsx file.");
  }

  if (matrix.length === 0) throw new ImportError("The file is empty.");
  const headerRow = matrix[0].map((cell) => cleanSingleLine(cell, 80));
  while (headerRow.length > 0 && headerRow[headerRow.length - 1] === "") headerRow.pop();
  if (headerRow.length === 0) throw new ImportError("The first row must contain column names.");
  if (headerRow.some((header) => header === "")) {
    throw new ImportError("Every column in the first row needs a name.");
  }
  if (headerRow.length > MAX_IMPORT_COLUMNS) {
    throw new ImportError(`Use at most ${MAX_IMPORT_COLUMNS} columns.`);
  }
  const seenHeaders = new Set<string>();
  for (const header of headerRow) {
    const normalized = normalizeHeader(header);
    if (seenHeaders.has(normalized)) {
      throw new ImportError(`The file has more than one column named “${header}”.`);
    }
    seenHeaders.add(normalized);
  }

  const dataRows: string[][] = [];
  for (let index = 1; index < matrix.length; index += 1) {
    const raw = matrix[index];
    if (raw.length > headerRow.length) {
      const extras = raw.slice(headerRow.length).filter((cell) => cell.trim() !== "");
      if (extras.length > 0) {
        throw new ImportError(`Row ${index + 1} has values beyond the last column.`);
      }
    }
    const row = headerRow.map((_, columnIndex) => cleanCell(raw[columnIndex] ?? ""));
    dataRows.push(row);
  }
  while (dataRows.length > 0 && dataRows[dataRows.length - 1].every((cell) => cell === "")) {
    dataRows.pop();
  }
  if (dataRows.length === 0) throw new ImportError("The file has no data rows.");
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new ImportError(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);
  }

  return {
    headers: headerRow,
    rows: dataRows,
    checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function autoMapColumns(
  kind: ImportKind,
  headers: string[],
): Record<string, string> {
  const normalizedHeaders = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: Record<string, string> = {};
  for (const field of IMPORT_FIELDS[kind]) {
    const aliases = new Set(
      [field.key, field.label, ...field.aliases].map((alias) => normalizeHeader(alias)),
    );
    const index = normalizedHeaders.findIndex(
      (header, headerIndex) => !used.has(headerIndex) && aliases.has(header),
    );
    if (index >= 0) {
      mapping[field.key] = String(index);
      used.add(index);
    }
  }
  return mapping;
}

export async function createImportBatch(
  input: ParsedImportFile & { kind: ImportKind; filename: string },
  actor: ImportActor,
): Promise<ImportBatch> {
  const db = await getDb();
  const collection = db.collection<ImportBatchDoc>("import_batches");
  const existing = await collection.findOne({
    checksum: input.checksum,
    kind: input.kind,
    status: { $in: ["UPLOADED", "READY", "IMPORTED"] },
  });
  if (existing) {
    throw new ImportError(
      `This exact file was already uploaded as ${existing.filename}. Open that batch instead.`,
      existing._id,
    );
  }
  const now = nowIso();
  const doc: ImportBatchDoc = {
    _id: randomUUID(),
    kind: input.kind,
    filename: cleanSingleLine(input.filename, 160) || "Import file",
    headers: input.headers,
    rows: input.rows,
    status: "UPLOADED",
    checksum: input.checksum,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    createdByName: actor.name,
  };
  await collection.insertOne(doc);
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "import.upload",
    entityType: "import",
    entityId: doc._id,
    summary: `Uploaded ${doc.filename} · ${doc.rows.length} ${input.kind === "CUSTOMERS" ? "customer" : "order"} rows`,
  });
  return mapBatch(doc);
}

export async function getImportBatch(id: string): Promise<ImportBatch | null> {
  const db = await getDb();
  const doc = await db.collection<ImportBatchDoc>("import_batches").findOne({ _id: id });
  return doc ? mapBatch(doc) : null;
}

export async function listImportBatches(limit = 40): Promise<ImportBatch[]> {
  const db = await getDb();
  const docs = await db
    .collection<ImportBatchDoc>("import_batches")
    .find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();
  return docs.map(mapBatch);
}

export async function saveImportMapping(
  batchId: string,
  mapping: Record<string, string>,
  actor: ImportActor,
): Promise<ImportBatch> {
  const batch = await getImportBatch(batchId);
  if (!batch) throw new ImportError("That import batch could not be found.");
  if (batch.status === "IMPORTED") {
    throw new ImportError("This batch has already been imported.");
  }
  const fields = IMPORT_FIELDS[batch.kind];
  const cleaned: Record<string, string> = {};
  const used = new Set<number>();
  for (const field of fields) {
    const raw = String(mapping[field.key] ?? "").trim();
    if (!raw) continue;
    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0 || index >= batch.headers.length) {
      throw new ImportError(`Choose a valid column for ${field.label}.`);
    }
    if (used.has(index)) {
      throw new ImportError(`The column for ${field.label} is used twice.`);
    }
    used.add(index);
    cleaned[field.key] = String(index);
  }
  const missing = fields.filter((field) => field.required && !cleaned[field.key]);
  if (missing.length > 0) {
    throw new ImportError(`Map these required columns: ${missing.map((field) => field.label).join(", ")}.`);
  }
  const now = nowIso();
  const result = await getDb().then((db) =>
    db.collection<ImportBatchDoc>("import_batches").findOneAndUpdate(
      { _id: batchId, status: { $in: ["UPLOADED", "READY", "FAILED"] } },
      { $set: { mapping: cleaned, status: "READY", updatedAt: now } },
      { returnDocument: "after" },
    ),
  );
  if (!result) throw new ImportError("That import batch can no longer be changed.");
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "import.map",
    entityType: "import",
    entityId: batchId,
    summary: `Mapped columns for ${batch.filename}`,
  });
  return mapBatch(result);
}

export async function correctImportRow(
  batchId: string,
  rowIndex: number,
  values: Record<string, string>,
  actor: ImportActor,
): Promise<ImportBatch> {
  const batch = await getImportBatch(batchId);
  if (!batch) throw new ImportError("That import batch could not be found.");
  if (batch.status === "IMPORTED" || batch.status === "PROCESSING") {
    throw new ImportError("This batch can no longer be edited.");
  }
  if (!batch.mapping) throw new ImportError("Map the columns before correcting rows.");
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= batch.rows.length) {
    throw new ImportError("That row could not be found.");
  }
  const row = [...batch.rows[rowIndex]];
  while (row.length < batch.headers.length) row.push("");
  for (const field of IMPORT_FIELDS[batch.kind]) {
    if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
    const index = Number(batch.mapping[field.key]);
    if (!Number.isInteger(index) || index < 0 || index >= batch.headers.length) continue;
    row[index] = cleanSingleLine(values[field.key], 2000);
  }
  const now = nowIso();
  await getDb().then((db) =>
    db.collection<ImportBatchDoc>("import_batches").updateOne(
      { _id: batchId },
      { $set: { [`rows.${rowIndex}`]: row, status: "READY", updatedAt: now } },
    ),
  );
  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "import.correct",
    entityType: "import",
    entityId: batchId,
    summary: `Corrected row ${rowIndex + 2} in ${batch.filename}`,
  });
  const updated = await getImportBatch(batchId);
  if (!updated) throw new ImportError("That import batch could not be found.");
  return updated;
}

export interface ImportRowPreview {
  rowIndex: number;
  rowNumber: number;
  values: Record<string, string>;
  status: "VALID" | "SKIPPED" | "INVALID";
  errors: string[];
}

export interface ImportPreview {
  rows: ImportRowPreview[];
  counts: { total: number; valid: number; skipped: number; invalid: number };
}

interface ExistingCustomer {
  name: string;
}

export async function buildImportPreview(batch: ImportBatch): Promise<ImportPreview> {
  if (!batch.mapping) throw new ImportError("Map the columns before validating rows.");
  const fields = IMPORT_FIELDS[batch.kind];
  const db = await getDb();

  const normalizedPhones = new Set<string>();
  const references = new Set<string>();
  for (const row of batch.rows) {
    const phone = normalizePhone(readCell(row, batch.mapping, "phone"));
    if (phone) normalizedPhones.add(phone.phone);
    if (batch.kind === "ORDERS") {
      const reference = validReference(readCell(row, batch.mapping, "reference"));
      if (reference) references.add(reference);
    }
  }

  const existingCustomers = new Map<string, ExistingCustomer>();
  if (normalizedPhones.size > 0) {
    const docs = await db
      .collection<CustomerDoc>("customers")
      .find({ phone: { $in: [...normalizedPhones] } })
      .project<{ _id: string; phone: string; name: string }>({ phone: 1, name: 1 })
      .toArray();
    for (const doc of docs) {
      existingCustomers.set(doc.phone, { name: doc.name });
    }
  }

  const existingRefs = new Set<string>();
  if (references.size > 0) {
    const values = [...references];
    const docs = await db
      .collection<OrderDoc>("orders")
      .find({
        $or: [
          { ref: { $in: values } },
          { ref: { $in: values.map((value) => value.toUpperCase()) } },
        ],
      })
      .project<{ _id: string; ref: string }>({ ref: 1 })
      .toArray();
    for (const doc of docs) existingRefs.add(doc.ref);
  }

  const today = businessToday();
  const seenCustomers = new Map<string, number>();
  const seenReferences = new Map<string, number>();
  const rows: ImportRowPreview[] = [];

  batch.rows.forEach((row, rowIndex) => {
    const values: Record<string, string> = {};
    for (const field of fields) {
      values[field.key] = readCell(row, batch.mapping!, field.key);
    }
    const errors: string[] = [];
    let duplicate = false;

    if (batch.kind === "CUSTOMERS") {
      const name = cleanSingleLine(values.name, 120);
      if (name.length < 2) errors.push("Customer name is required.");
      const phone = normalizePhone(values.phone);
      if (!phone) errors.push("Phone is not valid.");
      if (values.email) {
        const email = cleanSingleLine(values.email, 200).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email is not valid.");
      }
      if (errors.length === 0 && phone) {
        const existing = existingCustomers.get(phone.phone);
        const earlier = seenCustomers.get(phone.phone);
        if (existing) {
          duplicate = true;
          errors.push(`A customer with this phone already exists: ${existing.name}.`);
        } else if (earlier !== undefined) {
          duplicate = true;
          errors.push(`This phone also appears in row ${earlier}.`);
        } else {
          seenCustomers.set(phone.phone, rowIndex + 2);
        }
      }
    } else {
      const name = cleanSingleLine(values.customerName, 120);
      if (name.length < 2) errors.push("Customer name is required.");
      const phone = normalizePhone(values.phone);
      if (!phone) errors.push("Phone is not valid.");
      if (values.email) {
        const email = cleanSingleLine(values.email, 200).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email is not valid.");
      }

      const orderDate = parseBusinessDate(values.orderDate);
      if (!orderDate) {
        errors.push("Order date must be DD/MM/YYYY, DD-MM-YYYY or YYYY-MM-DD.");
      } else if (orderDate > today) {
        errors.push("Order date cannot be in the future.");
      }

      const totalPaise = parseRupeesToPaise(values.total);
      if (totalPaise === null || totalPaise <= 0) {
        errors.push("Order total must be greater than zero.");
      } else if (totalPaise > 10_000_000_000) {
        errors.push("Order total looks too large.");
      }
      const paidPaise = values.amountPaid ? parseRupeesToPaise(values.amountPaid) : 0;
      if (paidPaise === null || paidPaise < 0) {
        errors.push("Amount paid must be zero or more.");
      } else if (totalPaise !== null && paidPaise > totalPaise) {
        errors.push("Amount paid cannot be more than the order total.");
      }
      if (values.paymentMethod && !PAYMENT_ALIASES[normalizeToken(values.paymentMethod)]) {
        errors.push("Payment method must be cash, UPI, bank transfer or other.");
      }
      if (values.quantityKg && parseQuantityKg(values.quantityKg) === null) {
        errors.push("Quantity must be a number between 0 and 1,000 kg.");
      }
      const deliveryChargePaise = values.deliveryCharge
        ? parseRupeesToPaise(values.deliveryCharge)
        : 0;
      if (deliveryChargePaise === null || deliveryChargePaise < 0) {
        errors.push("Delivery charge must be zero or more.");
      } else if (totalPaise !== null && deliveryChargePaise > totalPaise) {
        errors.push("Delivery charge cannot be more than the order total.");
      }
      if (values.status && !ORDER_STATUS_ALIASES[normalizeToken(values.status)]) {
        errors.push("Status must be NEW, CONFIRMED, COMPLETED or CANCELLED.");
      }
      if (values.deliveryMethod && !DELIVERY_ALIASES[normalizeToken(values.deliveryMethod)]) {
        errors.push("Delivery method must be home collection, Porter, Courier or other.");
      }
      const reference = validReference(values.reference);
      if (reference === null) {
        errors.push("Invoice reference has invalid characters or is too long.");
      } else if (reference) {
        if (existingRefs.has(reference)) {
          errors.push(`Invoice reference ${reference} already belongs to an existing order.`);
        } else if (seenReferences.has(reference)) {
          errors.push(`Invoice reference ${reference} also appears in row ${seenReferences.get(reference)}.`);
        } else {
          seenReferences.set(reference, rowIndex + 2);
        }
      }
    }

    rows.push({
      rowIndex,
      rowNumber: rowIndex + 2,
      values,
      status: errors.length === 0 ? "VALID" : duplicate ? "SKIPPED" : "INVALID",
      errors,
    });
  });

  return {
    rows,
    counts: {
      total: rows.length,
      valid: rows.filter((row) => row.status === "VALID").length,
      skipped: rows.filter((row) => row.status === "SKIPPED").length,
      invalid: rows.filter((row) => row.status === "INVALID").length,
    },
  };
}

export function parseSkippedRowNumbers(input: string, rowCount: number): number[] {
  const values = input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const indexes = new Set<number>();
  for (const value of values) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 2 || number > rowCount + 1) {
      throw new ImportError(`Row ${value} is not in this file. Use the row numbers shown in the preview.`);
    }
    indexes.add(number - 2);
  }
  return [...indexes].sort((a, b) => a - b);
}

async function findOrCreateOrderCustomer(
  values: Record<string, string>,
  batch: ImportBatch,
): Promise<{ customer: Customer; created: boolean }> {
  const phone = normalizePhone(values.phone);
  if (!phone) throw new ImportError("Phone is not valid.");
  const db = await getDb();
  const customers = db.collection<CustomerDoc>("customers");
  const existing = await customers.findOne({ phone: phone.phone });
  if (existing) {
    const { _id, ...rest } = existing;
    return { customer: { id: _id, ...rest }, created: false };
  }
  const name = cleanSingleLine(values.customerName, 120);
  if (name.length < 2) throw new ImportError("Customer name is required.");
  const email = cleanSingleLine(values.email, 200).toLowerCase();
  const now = nowIso();
  const doc: CustomerDoc = {
    _id: randomUUID(),
    name,
    phone: phone.phone,
    phoneOriginal: phone.phoneOriginal,
    ...(email ? { email } : {}),
    addresses: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
    whatsappConsent: "NONE",
    importBatchId: batch.id,
  };
  try {
    await customers.insertOne(doc);
    const { _id, ...rest } = doc;
    return { customer: { id: _id, ...rest }, created: true };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const raced = await customers.findOne({ phone: phone.phone });
      if (raced) {
        const { _id, ...rest } = raced;
        return { customer: { id: _id, ...rest }, created: false };
      }
    }
    throw error;
  }
}

interface SequenceDoc {
  _id: string;
  current: number;
  prefix: string;
  updatedAt: string;
}

async function ensureSequenceAtLeast(value: number): Promise<void> {
  const db = await getDb();
  await db.collection<SequenceDoc>("invoice_sequences").updateOne(
    { _id: "orders" },
    {
      $max: { current: value },
      $setOnInsert: { prefix: "GH-" },
      $set: { updatedAt: nowIso() },
    },
    { upsert: true },
  );
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

export async function executeImport(
  batchId: string,
  actor: ImportActor,
  skipRows: number[],
): Promise<ImportBatch> {
  const batch = await getImportBatch(batchId);
  if (!batch) throw new ImportError("That import batch could not be found.");
  if (batch.status === "IMPORTED") {
    throw new ImportError("This batch has already been imported.");
  }
  if (!batch.mapping) throw new ImportError("Map the columns before importing.");
  if (batch.status === "PROCESSING") {
    const started = new Date(batch.updatedAt ?? batch.createdAt).getTime();
    if (Date.now() - started < 5 * 60_000) {
      throw new ImportError("This batch is already being imported. Wait a moment and refresh.");
    }
  }
  const preview = await buildImportPreview(batch);
  const skipSet = new Set(skipRows);
  for (const rowIndex of skipSet) {
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= batch.rows.length) {
      throw new ImportError("One of the skipped row numbers is not in this file.");
    }
  }

  const settings = await getSettings();
  const db = await getDb();
  const lockTime = nowIso();
  const locked = await db.collection<ImportBatchDoc>("import_batches").findOneAndUpdate(
    {
      _id: batch.id,
      $or: [
        { status: { $in: ["READY", "FAILED"] } },
        {
          status: "PROCESSING",
          updatedAt: { $lt: new Date(Date.now() - 5 * 60_000).toISOString() },
        },
      ],
    },
    { $set: { status: "PROCESSING", updatedAt: lockTime } },
    { returnDocument: "after" },
  );
  if (!locked) throw new ImportError("This batch is already being imported or cannot be changed.");
  const customers = db.collection<CustomerDoc>("customers");
  const orders = db.collection<OrderDoc>("orders");
  const invoiceVersions = db.collection<Document>("invoice_versions");
  const payments = db.collection<PaymentDoc>("payments");
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let customersCreated = 0;
  let ordersCreated = 0;
  const errors: string[] = [];

  const addError = (rowNumber: number, message: string) => {
    if (errors.length < MAX_SUMMARY_ERRORS) errors.push(`Row ${rowNumber}: ${message}`);
  };

  for (const row of preview.rows) {
    if (skipSet.has(row.rowIndex) || row.status === "SKIPPED") {
      skipped += 1;
      continue;
    }
    if (row.status === "INVALID") {
      failed += 1;
      addError(row.rowNumber, row.errors[0] ?? "This row is not valid.");
      continue;
    }
    try {
      if (batch.kind === "CUSTOMERS") {
        const phone = normalizePhone(row.values.phone);
        if (!phone) throw new ImportError("Phone is not valid.");
        const existing = await customers.findOne({ phone: phone.phone });
        if (existing) {
          skipped += 1;
          continue;
        }
        const name = cleanSingleLine(row.values.name, 120);
        const email = cleanSingleLine(row.values.email, 200).toLowerCase();
        const now = nowIso();
        const doc: CustomerDoc = {
          _id: randomUUID(),
          name,
          phone: phone.phone,
          phoneOriginal: phone.phoneOriginal,
          ...(email ? { email } : {}),
          addresses: [],
          ...(cleanSingleLine(row.values.company, 160)
            ? { company: cleanSingleLine(row.values.company, 160) }
            : {}),
          ...(cleanSingleLine(row.values.gstin, 20)
            ? { gstin: cleanSingleLine(row.values.gstin, 20) }
            : {}),
          ...(cleanText(row.values.notes, 2000)
            ? { notes: cleanText(row.values.notes, 2000) }
            : {}),
          archived: false,
          createdAt: now,
          updatedAt: now,
          whatsappConsent: "NONE",
          importBatchId: batch.id,
          importRow: row.rowNumber,
        };
        try {
          await customers.insertOne(doc);
          imported += 1;
          customersCreated += 1;
        } catch (error) {
          if (error instanceof MongoServerError && error.code === 11000) {
            skipped += 1;
          } else {
            throw error;
          }
        }
        continue;
      }

      const rowKey = `import:${batch.id}:${row.rowIndex}`;
      const existingOrder = await orders.findOne({ idempotencyKey: rowKey });
      if (existingOrder) {
        skipped += 1;
        continue;
      }
      const { customer, created } = await findOrCreateOrderCustomer(row.values, batch);
      if (created) customersCreated += 1;

      const totalPaise = parseRupeesToPaise(row.values.total);
      const paidPaise = row.values.amountPaid ? parseRupeesToPaise(row.values.amountPaid) : 0;
      const deliveryChargePaise = row.values.deliveryCharge
        ? parseRupeesToPaise(row.values.deliveryCharge)
        : 0;
      if (totalPaise === null || paidPaise === null || deliveryChargePaise === null) {
        throw new ImportError("One of the amounts is not valid.");
      }
      const subtotalPaise = totalPaise - deliveryChargePaise;
      const orderDate = parseBusinessDate(row.values.orderDate);
      if (!orderDate) throw new ImportError("Order date is not valid.");
      const reference = validReference(row.values.reference);
      if (reference === null) throw new ImportError("Invoice reference is not valid.");
      const quantityKg = row.values.quantityKg ? parseQuantityKg(row.values.quantityKg) : null;
      const productName = cleanSingleLine(row.values.product, 120) || "Historical order";
      const deliveryMethod = parseDelivery(row.values.deliveryMethod);
      const status = parseStatus(row.values.status);
      const now = nowIso();
      const orderId = stableId(`${batch.id}:${row.rowIndex}:order`);

      const item: OrderItem = {
        id: stableId(`${batch.id}:${row.rowIndex}:item`),
        productId: null,
        packagingId: null,
        productName,
        packagingLabel: quantityKg
          ? `Imported · ${formatQuantityKg(quantityKg)} kg`
          : "Imported historical record",
        actualWeightGrams: quantityKg ? Math.round(quantityKg * 1000) : 0,
        weightBasis: "TOTAL",
        quantity: 1,
        ratePerGramPaise: 0,
        standardAmountPaise: subtotalPaise,
        adjustmentPaise: 0,
        lineTotalPaise: subtotalPaise,
        imported: true,
        quantityLabel: quantityKg ? `${formatQuantityKg(quantityKg)} kg` : "1",
      };
      const snapshot: InvoiceSnapshot = {
        version: 1,
        issuedAt: now,
        ref: reference || "",
        invoiceDate: orderDate,
        customer: {
          name: customer.name,
          phone: customer.phoneOriginal || formatPhoneDisplay(customer.phone),
          ...(customer.email ? { email: customer.email } : {}),
        },
        items: [item],
        deliveryMethod,
        deliveryChargePaise,
        subtotalPaise,
        totalPaise,
        business: invoiceBusiness(settings),
        thankYou: settings.invoice.thankYou,
        footerNote: settings.invoice.footerNote,
      };

      let ref = reference;
      if (!ref) ref = await allocateOrderRef();
      const sequenceMatch = /^GH-(\d+)$/.exec(ref);
      if (sequenceMatch) await ensureSequenceAtLeast(Number(sequenceMatch[1]));
      snapshot.ref = ref;

      await invoiceVersions.updateOne(
        { orderId, version: 1 },
        {
          $setOnInsert: {
            _id: randomUUID(),
            orderId,
            ref,
            version: 1,
            snapshot,
            createdAt: now,
            createdBy: actor.id,
            createdByName: actor.name,
          },
        },
        { upsert: true },
      );

      if (paidPaise > 0) {
        try {
          await payments.insertOne({
            _id: randomUUID(),
            orderId,
            amountPaise: paidPaise,
            method: parsePaymentMethod(row.values.paymentMethod),
            paidAt: now,
            date: orderDate,
            notes: "Imported historical payment",
            createdBy: actor.id,
            createdByName: actor.name,
            createdAt: now,
            idempotencyKey: `${rowKey}:payment`,
          });
        } catch (error) {
          if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
        }
      }

      const statusHistory = [
        {
          status,
          at: now,
          by: actor.id,
          byName: actor.name,
          note: "Imported historical record",
        },
      ];
      const doc: OrderDoc = {
        _id: orderId,
        ref,
        type: "SALES",
        status,
        customerId: customer.id,
        customerSnapshot: {
          name: customer.name,
          phone: customer.phoneOriginal || formatPhoneDisplay(customer.phone),
          ...(customer.email ? { email: customer.email } : {}),
        },
        items: [item],
        delivery: { method: deliveryMethod, chargePaise: deliveryChargePaise },
        ...(cleanText(row.values.notes, 2000)
          ? { comments: cleanText(row.values.notes, 2000) }
          : {}),
        subtotalPaise,
        totalPaise,
        orderDate,
        statusHistory,
        invoice: { version: 1, issuedAt: now, snapshot },
        source: "IMPORT",
        historical: true,
        createdAt: now,
        updatedAt: now,
        createdBy: actor.id,
        createdByName: actor.name,
        updatedBy: actor.id,
        updatedByName: actor.name,
        paymentStatus: paymentStatusFor(totalPaise, paidPaise),
        paidPaise,
        refundedPaise: 0,
        balancePaise: Math.max(0, totalPaise - paidPaise),
        idempotencyKey: rowKey,
        importBatchId: batch.id,
        importRow: row.rowNumber,
      };

      try {
        await orders.insertOne(doc);
        imported += 1;
        ordersCreated += 1;
      } catch (error) {
        await Promise.all([
          invoiceVersions.deleteMany({ orderId }).catch(() => undefined),
          payments.deleteMany({ orderId }).catch(() => undefined),
        ]);
        if (error instanceof MongoServerError && error.code === 11000) {
          const byKey = await orders.findOne({ idempotencyKey: rowKey });
          if (byKey) {
            skipped += 1;
            continue;
          }
          throw new ImportError(`Invoice reference ${ref} already exists.`);
        }
        throw error;
      }
    } catch (error) {
      failed += 1;
      addError(row.rowNumber, error instanceof Error ? error.message : "The row could not be imported.");
    }
  }

  const status: ImportStatus = imported > 0 || failed === 0 ? "IMPORTED" : "FAILED";
  const now = nowIso();
  const result = await db.collection<ImportBatchDoc>("import_batches").findOneAndUpdate(
    { _id: batch.id },
    {
      $set: {
        status,
        summary: { imported, skipped, failed, errors, customersCreated, ordersCreated },
        completedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!result) throw new ImportError("That import batch could not be found.");

  await recordAudit({
    actor: { id: actor.id, email: actor.email },
    action: "import.run",
    entityType: "import",
    entityId: batch.id,
    summary: `Imported ${batch.filename} · ${imported} imported · ${skipped} skipped · ${failed} failed`,
  });

  return mapBatch(result);
}
