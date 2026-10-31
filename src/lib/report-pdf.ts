import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { formatDateDDMMYYYY, formatDateTime, rangeLabel } from "./dates";
import { formatINR } from "./money";
import { loadFontBytes } from "./pdf-fonts";
import type { ReportData } from "./types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = 72;

const COLORS: Record<string, RGB> = {
  ink: hex("#221d16"),
  soft: hex("#57503f"),
  muted: hex("#6b6353"),
  brass: hex("#8a6a2f"),
  line: hex("#d9cdb4"),
  paper: hex("#f6f1e6"),
  paperDeep: hex("#ece2cd"),
};

const NOTE =
  "Estimated management figures based on recorded data. Not audited. Gifting is excluded from revenue; gifting costs sit inside expenses; raw-material usage is not a second expense.";

function hex(value: string): RGB {
  const clean = value.replace("#", "");
  return rgb(
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  );
}

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  options: { font: PDFFont; size: number; color?: RGB },
): void {
  page.drawText(value.replace(/[\u0000-\u0008\u000b-\u001f]/g, ""), {
    x,
    y,
    size: options.size,
    font: options.font,
    color: options.color ?? COLORS.ink,
  });
}

function textRight(
  page: PDFPage,
  value: string,
  right: number,
  y: number,
  options: { font: PDFFont; size: number; color?: RGB },
): void {
  const width = options.font.widthOfTextAtSize(value, options.size);
  text(page, value, right - width, y, options);
}

function wrapText(textValue: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = textValue.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0];
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
}

function fitText(value: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let cut = value;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

interface RenderContext {
  doc: PDFDocument;
  regular: PDFFont;
  semibold: PDFFont;
  pages: PDFPage[];
  page: PDFPage;
  y: number;
  businessName: string;
  rangeText: string;
}

function runningHeader(ctx: RenderContext): void {
  text(ctx.page, ctx.businessName.toUpperCase(), MARGIN, PAGE_HEIGHT - 30, {
    font: ctx.semibold,
    size: 7.5,
    color: COLORS.brass,
  });
  textRight(ctx.page, `Management report · ${ctx.rangeText}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 30, {
    font: ctx.regular,
    size: 7.5,
    color: COLORS.muted,
  });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 36,
    width: CONTENT_WIDTH,
    height: 0.6,
    color: COLORS.line,
  });
  ctx.y = PAGE_HEIGHT - 54;
}

function newPage(ctx: RenderContext): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pages.push(ctx.page);
  runningHeader(ctx);
}

function ensureSpace(ctx: RenderContext, needed: number): void {
  if (ctx.y - needed < BOTTOM_LIMIT) newPage(ctx);
}

function sectionTitle(ctx: RenderContext, title: string): void {
  ensureSpace(ctx, 40);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 1, width: 10, height: 10, color: COLORS.brass });
  text(ctx.page, title, MARGIN + 18, ctx.y, {
    font: ctx.semibold,
    size: 12,
    color: COLORS.ink,
  });
  ctx.y -= 14;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y,
    width: CONTENT_WIDTH,
    height: 0.6,
    color: COLORS.line,
  });
  ctx.y -= 14;
}

interface TableColumn {
  label: string;
  width: number;
  align?: "left" | "right";
}

function drawTable(
  ctx: RenderContext,
  columns: TableColumn[],
  rows: string[][],
): void {
  const drawHeader = () => {
    ensureSpace(ctx, 24);
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 5,
      width: CONTENT_WIDTH,
      height: 17,
      color: COLORS.paper,
    });
    let x = MARGIN + 6;
    for (const column of columns) {
      const label = fitText(column.label.toUpperCase(), ctx.semibold, 6.8, column.width - 10);
      if (column.align === "right") {
        textRight(ctx.page, label, x + column.width - 6, ctx.y, {
          font: ctx.semibold,
          size: 6.8,
          color: COLORS.muted,
        });
      } else {
        text(ctx.page, label, x, ctx.y, {
          font: ctx.semibold,
          size: 6.8,
          color: COLORS.muted,
        });
      }
      x += column.width;
    }
    ctx.y -= 20;
  };
  drawHeader();
  if (rows.length === 0) {
    text(ctx.page, "No records in this period.", MARGIN + 6, ctx.y, {
      font: ctx.regular,
      size: 8.5,
      color: COLORS.muted,
    });
    ctx.y -= 18;
    return;
  }
  for (const row of rows) {
    if (ctx.y - 16 < BOTTOM_LIMIT) {
      newPage(ctx);
      drawHeader();
    }
    let x = MARGIN + 6;
    columns.forEach((column, index) => {
      const value = fitText(row[index] ?? "", ctx.regular, 8.4, column.width - 10);
      if (column.align === "right") {
        textRight(ctx.page, value, x + column.width - 6, ctx.y, {
          font: ctx.regular,
          size: 8.4,
          color: COLORS.ink,
        });
      } else {
        text(ctx.page, value, x, ctx.y, {
          font: ctx.regular,
          size: 8.4,
          color: COLORS.ink,
        });
      }
      x += column.width;
    });
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 5,
      width: CONTENT_WIDTH,
      height: 0.4,
      color: COLORS.line,
    });
    ctx.y -= 16;
  }
  ctx.y -= 6;
}

function changePercent(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "0%" : "—";
  return `${Math.round(((current - previous) / previous) * 100)}%`;
}

export async function buildReportPdf(
  data: ReportData,
  businessName: string,
): Promise<Uint8Array> {
  const { regular: regularBytes, semibold: semiboldBytes } = await loadFontBytes();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(regularBytes);
  const semibold = await doc.embedFont(semiboldBytes);
  const firstPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const rangeText = rangeLabel(data.range);
  const ctx: RenderContext = {
    doc,
    regular,
    semibold,
    pages: [firstPage],
    page: firstPage,
    y: PAGE_HEIGHT - MARGIN - 40,
    businessName,
    rangeText,
  };

  text(firstPage, businessName.toUpperCase(), MARGIN, PAGE_HEIGHT - MARGIN, {
    font: semibold,
    size: 9,
    color: COLORS.brass,
  });
  text(firstPage, "Management report", MARGIN, PAGE_HEIGHT - MARGIN - 34, {
    font: semibold,
    size: 24,
    color: COLORS.ink,
  });
  text(firstPage, rangeText, MARGIN, PAGE_HEIGHT - MARGIN - 52, {
    font: regular,
    size: 11,
    color: COLORS.soft,
  });
  textRight(
    firstPage,
    `Generated ${formatDateTime(new Date())}`,
    PAGE_WIDTH - MARGIN,
    PAGE_HEIGHT - MARGIN,
    { font: regular, size: 7.5, color: COLORS.muted },
  );
  ctx.y = PAGE_HEIGHT - MARGIN - 76;
  for (const line of wrapText(NOTE, regular, 7.8, CONTENT_WIDTH)) {
    text(firstPage, line, MARGIN, ctx.y, { font: regular, size: 7.8, color: COLORS.muted });
    ctx.y -= 10;
  }
  ctx.y -= 8;

  sectionTitle(ctx, "Summary");
  const metrics = data.metrics;
  drawTable(
    ctx,
    [
      { label: "Metric", width: 300 },
      { label: "Value", width: CONTENT_WIDTH - 300, align: "right" },
    ],
    [
      ["Gross sales revenue", formatINR(metrics.grossRevenuePaise)],
      ["Refunds", formatINR(metrics.refundsPaise)],
      ["Net sales revenue", formatINR(metrics.netRevenuePaise)],
      ["Payments received", formatINR(metrics.paymentsReceivedPaise)],
      ["Outstanding balances", formatINR(metrics.outstandingPaise)],
      ["Recorded expenses", formatINR(metrics.expensesPaise)],
      ["Gifting costs (inside expenses)", formatINR(metrics.giftingCostPaise)],
      ["Estimated management profit", formatINR(metrics.estimatedProfitPaise)],
      ["Sales orders", String(metrics.salesOrders)],
      ["Completed sales orders", String(metrics.completedSalesOrders)],
      ["Cancelled orders (all types)", String(metrics.cancelledOrders)],
      ["Gift orders", String(metrics.giftOrders)],
      ["New enquiries", String(metrics.newEnquiries)],
    ],
  );

  sectionTitle(ctx, "Compared with previous period");
  drawTable(
    ctx,
    [
      { label: "Metric", width: 210 },
      { label: rangeText, width: 120, align: "right" },
      { label: rangeLabel(data.previous.range), width: 120, align: "right" },
      { label: "Change", width: CONTENT_WIDTH - 450, align: "right" },
    ],
    (
      [
        ["Gross sales revenue", metrics.grossRevenuePaise, data.previous.metrics.grossRevenuePaise],
        ["Net sales revenue", metrics.netRevenuePaise, data.previous.metrics.netRevenuePaise],
        ["Payments received", metrics.paymentsReceivedPaise, data.previous.metrics.paymentsReceivedPaise],
        ["Recorded expenses", metrics.expensesPaise, data.previous.metrics.expensesPaise],
        ["Estimated profit", metrics.estimatedProfitPaise, data.previous.metrics.estimatedProfitPaise],
      ] as [string, number, number][]
    ).map(([label, current, previous]) => [
      label,
      formatINR(current),
      formatINR(previous),
      changePercent(current, previous),
    ]),
  );

  sectionTitle(ctx, "Period trend");
  drawTable(
    ctx,
    [
      { label: "Period", width: 110 },
      { label: "Sales", width: 110, align: "right" },
      { label: "Payments", width: 110, align: "right" },
      { label: "Expenses", width: 100, align: "right" },
      { label: "Profit", width: CONTENT_WIDTH - 430, align: "right" },
    ],
    data.series.map((point) => [
      point.label,
      formatINR(point.revenuePaise),
      formatINR(point.paymentsPaise),
      formatINR(point.expensesPaise),
      formatINR(point.profitPaise),
    ]),
  );

  sectionTitle(ctx, "Sales by product");
  drawTable(
    ctx,
    [
      { label: "Product", width: 300 },
      { label: "Revenue", width: 130, align: "right" },
      { label: "Lines", width: CONTENT_WIDTH - 430, align: "right" },
    ],
    data.salesByProduct.map((row) => [row.label, formatINR(row.amountPaise), String(row.count ?? 0)]),
  );

  sectionTitle(ctx, "Last 12 months");
  drawTable(
    ctx,
    [
      { label: "Month", width: 110 },
      { label: "Sales", width: 110, align: "right" },
      { label: "Payments", width: 110, align: "right" },
      { label: "Expenses", width: 100, align: "right" },
      { label: "Profit", width: CONTENT_WIDTH - 430, align: "right" },
    ],
    data.monthly.map((point) => [
      point.label,
      formatINR(point.revenuePaise),
      formatINR(point.paymentsPaise),
      formatINR(point.expensesPaise),
      formatINR(point.profitPaise),
    ]),
  );

  sectionTitle(ctx, "Expenses by category");
  drawTable(
    ctx,
    [
      { label: "Category", width: 300 },
      { label: "Amount", width: 130, align: "right" },
      { label: "Entries", width: CONTENT_WIDTH - 430, align: "right" },
    ],
    data.expensesByCategory.map((row) => [row.label, formatINR(row.amountPaise), String(row.count ?? 0)]),
  );

  sectionTitle(ctx, "Payments by method");
  drawTable(
    ctx,
    [
      { label: "Method", width: 300 },
      { label: "Amount", width: 130, align: "right" },
      { label: "Payments", width: CONTENT_WIDTH - 430, align: "right" },
    ],
    data.paymentsByMethod.map((row) => [row.label, formatINR(row.amountPaise), String(row.count ?? 0)]),
  );

  sectionTitle(ctx, "Top customers");
  drawTable(
    ctx,
    [
      { label: "Customer", width: 300 },
      { label: "Sales", width: 130, align: "right" },
      { label: "Orders", width: CONTENT_WIDTH - 430, align: "right" },
    ],
    data.topCustomers.map((row) => [row.label, formatINR(row.amountPaise), String(row.count ?? 0)]),
  );

  sectionTitle(ctx, "Outstanding balances");
  drawTable(
    ctx,
    [
      { label: "Order", width: 70 },
      { label: "Customer", width: 165 },
      { label: "Date", width: 65 },
      { label: "Total", width: 95, align: "right" },
      { label: "Balance", width: CONTENT_WIDTH - 395, align: "right" },
    ],
    data.outstandingOrders.map((order) => [
      order.ref,
      order.customerName,
      formatDateDDMMYYYY(order.orderDate),
      formatINR(order.totalPaise),
      formatINR(order.balancePaise),
    ]),
  );

  sectionTitle(ctx, "Gift records");
  drawTable(
    ctx,
    [
      { label: "Order", width: 70 },
      { label: "Recipient", width: 230 },
      { label: "Date", width: 80 },
      { label: "Cost", width: CONTENT_WIDTH - 380, align: "right" },
    ],
    data.giftOrdersList.map((order) => [
      order.ref,
      order.recipient,
      formatDateDDMMYYYY(order.orderDate),
      formatINR(order.costPaise),
    ]),
  );

  sectionTitle(ctx, "Inventory on hand");
  drawTable(
    ctx,
    [
      { label: "Item", width: 200 },
      { label: "Category", width: 150 },
      { label: "Quantity", width: 90, align: "right" },
      { label: "Unit", width: CONTENT_WIDTH - 440 },
    ],
    data.inventory.map((item) => [
      item.name,
      item.category,
      item.quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 }),
      item.unit,
    ]),
  );

  ctx.pages.forEach((page, index) => {
    page.drawRectangle({ x: MARGIN, y: 48, width: CONTENT_WIDTH, height: 0.6, color: COLORS.line });
    text(page, `${businessName} · Management report`, MARGIN, 35, {
      font: regular,
      size: 7,
      color: COLORS.muted,
    });
    textRight(page, `Page ${index + 1} of ${ctx.pages.length}`, PAGE_WIDTH - MARGIN, 35, {
      font: regular,
      size: 7,
      color: COLORS.muted,
    });
    text(page, "Estimated management figures — not audited.", MARGIN, 24, {
      font: regular,
      size: 6.8,
      color: COLORS.muted,
    });
  });

  return doc.save();
}
