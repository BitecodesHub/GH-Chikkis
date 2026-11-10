import "server-only";
import ExcelJS from "exceljs";
import { formatDateTime, rangeLabel } from "./dates";
import type { ReportData, ReportMetrics } from "./types";

const COMPARISON_LABELS: [keyof ReportMetrics, string, boolean][] = [
  ["grossRevenuePaise", "Gross sales revenue", true],
  ["refundsPaise", "Refunds", true],
  ["netRevenuePaise", "Net sales revenue", true],
  ["paymentsReceivedPaise", "Payments received", true],
  ["outstandingPaise", "Outstanding balances", true],
  ["expensesPaise", "Recorded expenses", true],
  ["estimatedProfitPaise", "Estimated management profit", true],
  ["salesOrders", "Sales orders", false],
  ["completedSalesOrders", "Completed sales orders", false],
  ["cancelledOrders", "Cancelled orders", false],
  ["giftOrders", "Gift orders", false],
  ["newEnquiries", "New enquiries", false],
];

const REPORT_NOTE =
  "Estimated management figures based on recorded data. Not audited. Gifting is excluded from revenue; gifting costs sit inside expenses; raw-material usage is not a second expense.";

function rupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

function changePercent(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "0" : "—";
  return String(Math.round(((current - previous) / previous) * 100));
}

function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvBlock(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function buildReportCsv(data: ReportData, businessName: string): string {
  const metrics = data.metrics;
  const blocks: string[] = [];
  blocks.push(
    csvBlock([
      [`${businessName} — Management report`],
      ["Period", rangeLabel(data.range)],
      [`From / to`, `${data.range.from} to ${data.range.to}`],
      ["Generated", formatDateTime(new Date())],
      ["Note", REPORT_NOTE],
    ]),
  );
  blocks.push(
    csvBlock([
      ["Metric", "Value (INR) or count"],
      ...COMPARISON_LABELS.map(([key, label, money]) => [
        label,
        money ? rupees(Number(metrics[key])) : Number(metrics[key]),
      ]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Compared with previous period", rangeLabel(data.previous.range)],
      ["Metric", "This period", "Previous period", "Change %"],
      ...COMPARISON_LABELS.map(([key, label, money]) => {
        const current = Number(metrics[key]);
        const previous = Number(data.previous.metrics[key]);
        return [
          label,
          money ? rupees(current) : current,
          money ? rupees(previous) : previous,
          changePercent(current, previous),
        ];
      }),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Period trend", "Sales revenue (INR)", "Payments received (INR)", "Expenses (INR)", "Estimated profit (INR)"],
      ...data.series.map((point) => [
        point.label,
        rupees(point.revenuePaise),
        rupees(point.paymentsPaise),
        rupees(point.expensesPaise),
        rupees(point.profitPaise),
      ]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Sales by product", "Revenue (INR)", "Line items"],
      ...data.salesByProduct.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Monthly trend", "Sales revenue (INR)", "Payments received (INR)", "Expenses (INR)", "Estimated profit (INR)"],
      ...data.monthly.map((point) => [
        point.label,
        rupees(point.revenuePaise),
        rupees(point.paymentsPaise),
        rupees(point.expensesPaise),
        rupees(point.profitPaise),
      ]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Expenses by category", "Amount (INR)", "Entries"],
      ...data.expensesByCategory.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Payments by method", "Amount (INR)", "Payments"],
      ...data.paymentsByMethod.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Top customers", "Sales (INR)", "Orders"],
      ...data.topCustomers.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Outstanding balances", "Customer", "Order date", "Order total (INR)", "Balance due (INR)"],
      ...data.outstandingOrders.map((order) => [
        order.ref,
        order.customerName,
        order.orderDate,
        rupees(order.totalPaise),
        rupees(order.balancePaise),
      ]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Gift records", "Recipient", "Order date", "Cost (INR)"],
      ...data.giftOrdersList.map((order) => [
        order.ref,
        order.recipient,
        order.orderDate,
        rupees(order.costPaise),
      ]),
    ]),
  );
  blocks.push(
    csvBlock([
      ["Inventory on hand", "Category", "Quantity", "Unit"],
      ...data.inventory.map((item) => [item.name, item.category, item.quantity, item.unit]),
    ]),
  );
  return `\ufeff${blocks.join("\r\n\r\n")}\r\n`;
}

interface ExcelColumn {
  header: string;
  width: number;
  money?: boolean;
}

function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ExcelColumn[],
  rows: (string | number)[][],
): void {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map((column) => ({ header: column.header, width: column.width }));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFE5D0" } };
  header.border = { bottom: { style: "thin", color: { argb: "FFD9CDB4" } } };
  if (rows.length === 0) {
    sheet.addRow(["No records in this period."]);
  } else {
    for (const values of rows) {
      const row = sheet.addRow(values);
      columns.forEach((column, index) => {
        if (column.money) row.getCell(index + 1).numFmt = "#,##0.00";
      });
    }
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildReportExcel(
  data: ReportData,
  businessName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName;
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 42 }, { width: 24 }];
  summary.addRow([`${businessName} — Management report`]).font = { bold: true, size: 14 };
  summary.addRow(["Period", rangeLabel(data.range)]);
  summary.addRow(["From / to", `${data.range.from} to ${data.range.to}`]);
  summary.addRow(["Generated", formatDateTime(new Date())]);
  summary.addRow(["Note", REPORT_NOTE]);
  summary.addRow([]);
  const header = summary.addRow(["Metric", "Value"]);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFE5D0" } };
  for (const [key, label, money] of COMPARISON_LABELS) {
    const row = summary.addRow([label, money ? rupees(Number(data.metrics[key])) : Number(data.metrics[key])]);
    if (money) row.getCell(2).numFmt = "#,##0.00";
  }
  summary.getCell("A1").alignment = { wrapText: true };

  addDataSheet(
    workbook,
    "Previous comparison",
    [
      { header: "Metric", width: 36 },
      { header: `This period (${rangeLabel(data.range)})`, width: 26 },
      { header: `Previous period (${rangeLabel(data.previous.range)})`, width: 30 },
      { header: "Change %", width: 14 },
    ],
    COMPARISON_LABELS.map(([key, label, money]) => {
      const current = Number(data.metrics[key]);
      const previous = Number(data.previous.metrics[key]);
      return [
        label,
        money ? rupees(current) : current,
        money ? rupees(previous) : previous,
        changePercent(current, previous),
      ];
    }),
  );

  addDataSheet(
    workbook,
    "Period trend",
    [
      { header: "Period", width: 16 },
      { header: "Sales revenue (INR)", width: 20, money: true },
      { header: "Payments received (INR)", width: 22, money: true },
      { header: "Expenses (INR)", width: 18, money: true },
      { header: "Estimated profit (INR)", width: 22, money: true },
    ],
    data.series.map((point) => [
      point.label,
      rupees(point.revenuePaise),
      rupees(point.paymentsPaise),
      rupees(point.expensesPaise),
      rupees(point.profitPaise),
    ]),
  );

  addDataSheet(
    workbook,
    "Sales by product",
    [
      { header: "Product", width: 32 },
      { header: "Revenue (INR)", width: 18, money: true },
      { header: "Line items", width: 12 },
    ],
    data.salesByProduct.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
  );

  addDataSheet(
    workbook,
    "Monthly trend",
    [
      { header: "Month", width: 16 },
      { header: "Sales revenue (INR)", width: 20, money: true },
      { header: "Payments received (INR)", width: 22, money: true },
      { header: "Expenses (INR)", width: 18, money: true },
      { header: "Estimated profit (INR)", width: 22, money: true },
    ],
    data.monthly.map((point) => [
      point.label,
      rupees(point.revenuePaise),
      rupees(point.paymentsPaise),
      rupees(point.expensesPaise),
      rupees(point.profitPaise),
    ]),
  );

  addDataSheet(
    workbook,
    "Expenses",
    [
      { header: "Category", width: 30 },
      { header: "Amount (INR)", width: 18, money: true },
      { header: "Entries", width: 10 },
    ],
    data.expensesByCategory.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
  );

  addDataSheet(
    workbook,
    "Payments",
    [
      { header: "Method", width: 24 },
      { header: "Amount (INR)", width: 18, money: true },
      { header: "Payments", width: 12 },
    ],
    data.paymentsByMethod.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
  );

  addDataSheet(
    workbook,
    "Top customers",
    [
      { header: "Customer", width: 30 },
      { header: "Sales (INR)", width: 18, money: true },
      { header: "Orders", width: 10 },
    ],
    data.topCustomers.map((row) => [row.label, rupees(row.amountPaise), row.count ?? 0]),
  );

  addDataSheet(
    workbook,
    "Outstanding",
    [
      { header: "Order", width: 12 },
      { header: "Customer", width: 28 },
      { header: "Order date", width: 14 },
      { header: "Order total (INR)", width: 18, money: true },
      { header: "Balance due (INR)", width: 18, money: true },
    ],
    data.outstandingOrders.map((order) => [
      order.ref,
      order.customerName,
      order.orderDate,
      rupees(order.totalPaise),
      rupees(order.balancePaise),
    ]),
  );

  addDataSheet(
    workbook,
    "Gifts",
    [
      { header: "Order", width: 12 },
      { header: "Recipient", width: 28 },
      { header: "Order date", width: 14 },
      { header: "Cost (INR)", width: 16, money: true },
    ],
    data.giftOrdersList.map((order) => [
      order.ref,
      order.recipient,
      order.orderDate,
      rupees(order.costPaise),
    ]),
  );

  addDataSheet(
    workbook,
    "Inventory",
    [
      { header: "Item", width: 30 },
      { header: "Category", width: 26 },
      { header: "Quantity on hand", width: 18 },
      { header: "Unit", width: 12 },
    ],
    data.inventory.map((item) => [item.name, item.category, item.quantity, item.unit]),
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
