import "server-only";
import { getDb } from "./db";
import {
  addDays,
  businessDateEndUtc,
  businessDateStartUtc,
  businessToday,
  dayLabel,
  eachDay,
  monthLabel,
} from "./dates";
import { listInventoryItems } from "./inventory";
import { PAYMENT_METHOD_LABELS, type DateRange, type Expense, type Order, type Payment, type Refund, type ReportBreakdown, type ReportData, type ReportMetrics, type ReportSeriesPoint } from "./types";

type OrderDoc = Omit<Order, "id"> & { _id: string };
type PaymentDoc = Omit<Payment, "id"> & { _id: string };
type RefundDoc = Omit<Refund, "id"> & { _id: string };
type ExpenseDoc = Omit<Expense, "id"> & { _id: string };

interface RangeDocs {
  orders: OrderDoc[];
  payments: PaymentDoc[];
  refunds: RefundDoc[];
  expenses: ExpenseDoc[];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + Math.round(value), 0);
}

function dayCount(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function monthsBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  let [year, month] = from.slice(0, 7).split("-").map(Number);
  const last = to.slice(0, 7);
  let guard = 0;
  while (guard < 240) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    keys.push(key);
    if (key >= last) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    guard += 1;
  }
  return keys;
}

async function fetchRangeDocs(from: string, to: string): Promise<RangeDocs> {
  const db = await getDb();
  const dateFilter = { $gte: from, $lte: to };
  const [orders, payments, refunds, expenses] = await Promise.all([
    db
      .collection<OrderDoc>("orders")
      .find({ orderDate: dateFilter })
      .sort({ orderDate: 1, createdAt: 1 })
      .toArray(),
    db
      .collection<PaymentDoc>("payments")
      .find({ date: dateFilter, voidedAt: { $exists: false } })
      .sort({ date: 1, createdAt: 1 })
      .toArray(),
    db
      .collection<RefundDoc>("refunds")
      .find({ date: dateFilter })
      .sort({ date: 1, createdAt: 1 })
      .toArray(),
    db
      .collection<ExpenseDoc>("expenses")
      .find({ date: dateFilter })
      .sort({ date: 1, createdAt: 1 })
      .toArray(),
  ]);
  return { orders, payments, refunds, expenses };
}

function metricsFromDocs(docs: RangeDocs, newEnquiries: number): ReportMetrics {  const validSales = docs.orders.filter(
    (order) => order.type === "SALES" && order.status !== "CANCELLED",
  );
  const grossRevenuePaise = sum(validSales.map((order) => order.totalPaise));
  const refundsPaise = sum(docs.refunds.map((refund) => refund.amountPaise));
  const netRevenuePaise = grossRevenuePaise - refundsPaise;
  const paymentsReceivedPaise = sum(docs.payments.map((payment) => payment.amountPaise));
  const outstandingPaise = sum(validSales.map((order) => order.balancePaise));
  const expensesPaise = sum(docs.expenses.map((expense) => expense.amountPaise));
  const giftingCostPaise = sum(
    docs.expenses
      .filter((expense) => expense.source === "GIFT")
      .map((expense) => expense.amountPaise),
  );
  return {
    grossRevenuePaise,
    refundsPaise,
    netRevenuePaise,
    paymentsReceivedPaise,
    outstandingPaise,
    expensesPaise,
    giftingCostPaise,
    estimatedProfitPaise: netRevenuePaise - expensesPaise,
    salesOrders: validSales.length,
    completedSalesOrders: validSales.filter((order) => order.status === "COMPLETED").length,
    cancelledOrders: docs.orders.filter((order) => order.status === "CANCELLED").length,
    giftOrders: docs.orders.filter((order) => order.type === "GIFT").length,
    newEnquiries,
  };
}

/**
 * A range query is one wave of four reads, and the dashboard and reports page
 * each wanted two or three of those waves for windows that sit inside one
 * another. So the widest window is read once and the narrower ones are cut out
 * of it by their business dates, which is what their own queries would have
 * returned.
 */
function docsInRange(docs: RangeDocs, from: string, to: string): RangeDocs {
  const keep = (date: string) => date >= from && date <= to;
  return {
    orders: docs.orders.filter((order) => keep(order.orderDate)),
    payments: docs.payments.filter((payment) => keep(payment.date)),
    refunds: docs.refunds.filter((refund) => keep(refund.date)),
    expenses: docs.expenses.filter((expense) => keep(expense.date)),
  };
}

type DateSpan = { from: string; to: string };

function widest(spans: DateSpan[]): DateSpan {
  let from = spans[0].from;
  let to = spans[0].to;
  for (const span of spans) {
    if (span.from < from) from = span.from;
    if (span.to > to) to = span.to;
  }
  return { from, to };
}

async function countEnquiriesPerRange(spans: DateSpan[]): Promise<number[]> {
  const db = await getDb();
  return Promise.all(
    spans.map((span) =>
      db.collection("enquiries").countDocuments({
        submittedAt: {
          $gte: businessDateStartUtc(span.from).toISOString(),
          $lte: businessDateEndUtc(span.to).toISOString(),
        },
      }),
    ),
  );
}

export async function getReportMetricsForWindows(
  windows: DateRange[],
): Promise<ReportMetrics[]> {
  if (windows.length === 0) return [];
  const span = widest(windows);
  const [docs, enquiryCounts] = await Promise.all([
    fetchRangeDocs(span.from, span.to),
    countEnquiriesPerRange(windows),
  ]);
  return windows.map((window, index) =>
    metricsFromDocs(docsInRange(docs, window.from, window.to), enquiryCounts[index]),
  );
}

export function buildReportSeries(
  docs: RangeDocs,
  from: string,
  to: string,
): ReportSeriesPoint[] {
  const useMonths = dayCount(from, to) > 45;
  const keys = useMonths ? monthsBetween(from, to) : eachDay(from, to);
  const buckets = new Map<string, { revenue: number; refunds: number; expenses: number; payments: number }>();
  for (const key of keys) {
    buckets.set(key, { revenue: 0, refunds: 0, expenses: 0, payments: 0 });
  }
  const bucketKey = (date: string) => (useMonths ? date.slice(0, 7) : date);
  for (const order of docs.orders) {
    if (order.type !== "SALES" || order.status === "CANCELLED") continue;
    const bucket = buckets.get(bucketKey(order.orderDate));
    if (bucket) bucket.revenue += order.totalPaise;
  }
  for (const refund of docs.refunds) {
    const bucket = buckets.get(bucketKey(refund.date));
    if (bucket) bucket.refunds += refund.amountPaise;
  }
  for (const expense of docs.expenses) {
    const bucket = buckets.get(bucketKey(expense.date));
    if (bucket) bucket.expenses += expense.amountPaise;
  }
  for (const payment of docs.payments) {
    const bucket = buckets.get(bucketKey(payment.date));
    if (bucket) bucket.payments += payment.amountPaise;
  }
  return keys.map((key) => {
    const bucket = buckets.get(key)!;
    return {
      date: useMonths ? `${key}-01` : key,
      label: useMonths ? monthLabel(`${key}-01`) : dayLabel(key),
      revenuePaise: bucket.revenue,
      expensesPaise: bucket.expenses,
      paymentsPaise: bucket.payments,
      profitPaise: bucket.revenue - bucket.refunds - bucket.expenses,
    };
  });
}

function monthlySpan(): DateSpan {
  const todayKey = businessToday();
  const [yearPart, monthPart] = todayKey.split("-").map(Number);
  let year = yearPart;
  let month = monthPart - 11;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: todayKey };
}

function previousRange(range: DateRange): DateRange {
  const span = dayCount(range.from, range.to);
  const to = addDays(range.from, -1);
  return { preset: "custom", from: addDays(to, -(span - 1)), to };
}

export async function getReportData(range: DateRange): Promise<ReportData> {
  const prevRange = previousRange(range);
  const monthly = monthlySpan();
  const wide = widest([range, prevRange, monthly]);
  const [wideDocs, enquiryCounts, inventory] = await Promise.all([
    fetchRangeDocs(wide.from, wide.to),
    countEnquiriesPerRange([range, prevRange]),
    listInventoryItems({}),
  ]);
  const docs = docsInRange(wideDocs, range.from, range.to);
  const prevDocs = docsInRange(wideDocs, prevRange.from, prevRange.to);
  const monthlyDocs = docsInRange(wideDocs, monthly.from, monthly.to);

  const metrics = metricsFromDocs(docs, enquiryCounts[0]);
  const validSales = docs.orders.filter(
    (order) => order.type === "SALES" && order.status !== "CANCELLED",
  );

  const productMap = new Map<string, { amountPaise: number; count: number }>();
  for (const order of validSales) {
    for (const item of order.items) {
      const current = productMap.get(item.productName) ?? { amountPaise: 0, count: 0 };
      current.amountPaise += item.lineTotalPaise;
      current.count += 1;
      productMap.set(item.productName, current);
    }
  }
  const salesByProduct: ReportBreakdown[] = [...productMap.entries()]
    .map(([label, value]) => ({ key: label, label, amountPaise: value.amountPaise, count: value.count }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const expenseMap = new Map<string, { amountPaise: number; count: number }>();
  for (const expense of docs.expenses) {
    const current = expenseMap.get(expense.category) ?? { amountPaise: 0, count: 0 };
    current.amountPaise += expense.amountPaise;
    current.count += 1;
    expenseMap.set(expense.category, current);
  }
  const expensesByCategory: ReportBreakdown[] = [...expenseMap.entries()]
    .map(([label, value]) => ({ key: label, label, amountPaise: value.amountPaise, count: value.count }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const methodMap = new Map<string, { amountPaise: number; count: number }>();
  for (const payment of docs.payments) {
    const label = PAYMENT_METHOD_LABELS[payment.method] ?? payment.method;
    const current = methodMap.get(label) ?? { amountPaise: 0, count: 0 };
    current.amountPaise += payment.amountPaise;
    current.count += 1;
    methodMap.set(label, current);
  }
  const paymentsByMethod: ReportBreakdown[] = [...methodMap.entries()]
    .map(([label, value]) => ({ key: label, label, amountPaise: value.amountPaise, count: value.count }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const customerMap = new Map<string, { label: string; amountPaise: number; count: number }>();
  for (const order of validSales) {
    const key = order.customerSnapshot.phone || order.customerSnapshot.name;
    const current = customerMap.get(key) ?? {
      label: order.customerSnapshot.name,
      amountPaise: 0,
      count: 0,
    };
    current.amountPaise += order.totalPaise;
    current.count += 1;
    customerMap.set(key, current);
  }
  const topCustomers: ReportBreakdown[] = [...customerMap.entries()]
    .map(([key, value]) => ({ key, label: value.label, amountPaise: value.amountPaise, count: value.count }))
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, 10);

  const outstandingOrders = validSales
    .filter((order) => order.balancePaise > 0)
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate))
    .map((order) => ({
      orderId: String(order._id),
      ref: order.ref,
      customerName: order.customerSnapshot.name,
      orderDate: order.orderDate,
      totalPaise: order.totalPaise,
      balancePaise: order.balancePaise,
    }));

  const giftOrdersList = docs.orders
    .filter((order) => order.type === "GIFT")
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .map((order) => ({
      orderId: String(order._id),
      ref: order.ref,
      recipient: order.customerSnapshot.name,
      orderDate: order.orderDate,
      costPaise: order.gift?.costPaise ?? 0,
    }));

  return {
    range,
    metrics,
    previous: {
      range: prevRange,
      metrics: metricsFromDocs(prevDocs, enquiryCounts[1]),
    },
    series: buildReportSeries(docs, range.from, range.to),
    monthly: buildReportSeries(monthlyDocs, monthly.from, monthly.to),
    salesByProduct,
    expensesByCategory,
    paymentsByMethod,
    topCustomers,
    outstandingOrders,
    giftOrdersList,
    inventory: inventory.map((item) => ({
      itemId: item.id,
      name: item.name,
      unit: item.unit,
      quantity: item.currentQuantity,
      category: item.category,
    })),
  };
}

export async function getOutstandingTotalPaise(): Promise<number> {
  const db = await getDb();
  const result = await db
    .collection("orders")
    .aggregate<{ _id: null; totalPaise: number }>([
      {
        $match: {
          type: "SALES",
          status: { $ne: "CANCELLED" },
          balancePaise: { $gt: 0 },
        },
      },
      { $group: { _id: null, totalPaise: { $sum: "$balancePaise" } } },
    ])
    .toArray();
  return Number(result[0]?.totalPaise ?? 0);
}
