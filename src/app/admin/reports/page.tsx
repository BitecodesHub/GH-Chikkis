import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Gift,
  Lightbulb,
  Minus,
  Percent,
  ReceiptText,
  Repeat,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ExportReport } from "@/components/admin/export-report";
import { FilterNav } from "@/components/admin/filter-nav";
import {
  ExpenseDonut,
  MonthlyTrendChart,
  PaymentsChart,
  ProductMixChart,
  TrendChart,
} from "@/components/admin/report-charts";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getEnquiryConversion, getReportData } from "@/lib/reports";
import {
  businessToday,
  dateRangeFromParams,
  formatDateDDMMYYYY,
  rangeLabel,
} from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { ReportBreakdown } from "@/lib/types";

export const metadata: Metadata = { title: "Reports" };

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
] as const;

const SECTIONS = [
  { href: "#overview", label: "Overview" },
  { href: "#trends", label: "Trends" },
  { href: "#products", label: "Products" },
  { href: "#expenses", label: "Expenses" },
  { href: "#customers", label: "Customers" },
  { href: "#outstanding", label: "Outstanding" },
  { href: "#gifts", label: "Gifts" },
] as const;

function Delta({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (current === 0 && previous === 0) {
    return (
      <span className="delta-chip delta-flat">
        <Minus aria-hidden="true" className="size-3" />
        No activity in either period
      </span>
    );
  }
  if (previous === 0) {
    return <span className="delta-chip delta-up">New activity this period</span>;
  }
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (percent === 0) {
    return (
      <span className="delta-chip delta-flat">
        <Minus aria-hidden="true" className="size-3" />
        Same as previous period
      </span>
    );
  }
  const rising = percent > 0;
  const good = invert ? !rising : rising;
  const Icon = rising ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("delta-chip", good ? "delta-up" : "delta-down")}>
      <Icon aria-hidden="true" className="size-3" />
      {rising ? "Up" : "Down"} {Math.abs(percent)}% vs previous period
    </span>
  );
}

function BreakdownTable({
  rows,
  empty,
  amountHeader,
  countHeader,
  countLabel,
  totalPaise,
}: {
  rows: ReportBreakdown[];
  empty: string;
  amountHeader: string;
  countHeader?: string;
  countLabel?: string;
  totalPaise?: number;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[0.9375rem]">
        <thead>
          <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
            <th scope="col" className="px-5 py-3 font-semibold">
              {countHeader ?? "Item"}
            </th>
            {countLabel ? (
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                {countLabel}
              </th>
            ) : null}
            <th scope="col" className="px-5 py-3 text-right font-semibold">
              {amountHeader}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const share =
              totalPaise && totalPaise > 0
                ? Math.min(100, Math.round((row.amountPaise / totalPaise) * 100))
                : null;
            return (
              <tr key={row.key} className="hover:bg-paper-raised/60">
                <td className="px-5 py-3">
                  {row.label}
                  {share !== null ? (
                    <span className="mt-1.5 block h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-paper-deep">
                      <span
                        className="block h-full rounded-full bg-olive"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                  ) : null}
                </td>
                {countLabel ? (
                  <td className="px-5 py-3 text-right text-ink-soft">{row.count ?? 0}</td>
                ) : null}
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {formatINR(row.amountPaise)}
                  {share !== null ? (
                    <span className="block text-[0.75rem] text-ink-muted">{share}% of total</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("reports.view");
  const params = await searchParams;
  const range = dateRangeFromParams(params);
  const [data, conversion] = await Promise.all([
    getReportData(range),
    getEnquiryConversion(range),
  ]);
  const canExport = hasPermission(user, "exports.run");

  const { metrics, previous } = data;
  const previousLabel = `${formatDateDDMMYYYY(previous.range.from)} – ${formatDateDDMMYYYY(previous.range.to)}`;

  const cards = [
    {
      label: "Net revenue",
      value: metrics.netRevenuePaise,
      current: metrics.netRevenuePaise,
      previous: previous.metrics.netRevenuePaise,
      detail: `Gross ${formatINR(metrics.grossRevenuePaise)} · Refunds ${formatINR(metrics.refundsPaise)}`,
      icon: BarChart3,
      accent: "accent-olive",
      cardClass: "stat-card-olive",
      labelClass: "text-[#2e3e1c]",
      valueClass: "text-[#18260b]",
      detailClass: "text-[#3d5027]",
    },
    {
      label: "Payments received",
      value: metrics.paymentsReceivedPaise,
      current: metrics.paymentsReceivedPaise,
      previous: previous.metrics.paymentsReceivedPaise,
      detail: `Outstanding in period ${formatINR(metrics.outstandingPaise)}`,
      icon: Wallet,
      accent: "accent-brass",
      cardClass: "stat-card-brass",
      labelClass: "text-[#543d12]",
      valueClass: "text-[#382608]",
      detailClass: "text-[#634b1a]",
    },
    {
      label: "Expenses",
      value: metrics.expensesPaise,
      current: metrics.expensesPaise,
      previous: previous.metrics.expensesPaise,
      detail: `Includes ${formatINR(metrics.giftingCostPaise)} gifting costs`,
      icon: ReceiptText,
      invert: true,
      accent: "accent-terracotta",
      cardClass: "stat-card-terracotta",
      labelClass: "text-[#5c2311]",
      valueClass: "text-[#3d1306]",
      detailClass: "text-[#6e2e1a]",
    },
    {
      label: "Estimated profit",
      value: metrics.estimatedProfitPaise,
      current: metrics.estimatedProfitPaise,
      previous: previous.metrics.estimatedProfitPaise,
      detail: "Net revenue minus recorded expenses",
      icon: TrendingUp,
      accent: "accent-olive-deep",
      cardClass: "stat-card-profit",
      labelClass: "text-[#1c361e]",
      valueClass: "text-[#0e2210]",
      detailClass: "text-[#264b2a]",
    },
  ];

  // Derived business ratios, all from the same fetched documents.
  const avgOrderValue =
    metrics.salesOrders > 0 ? Math.round(metrics.netRevenuePaise / metrics.salesOrders) : 0;
  const margin =
    metrics.netRevenuePaise > 0
      ? Math.round((metrics.estimatedProfitPaise / metrics.netRevenuePaise) * 100)
      : null;
  const collection =
    metrics.netRevenuePaise > 0
      ? Math.round((metrics.paymentsReceivedPaise / metrics.netRevenuePaise) * 100)
      : null;
  const topProduct = data.salesByProduct[0];
  const topProductShare =
    topProduct && metrics.grossRevenuePaise > 0
      ? Math.round((topProduct.amountPaise / metrics.grossRevenuePaise) * 100)
      : null;
  const topCustomer = data.topCustomers[0];
  const topCustomerShare =
    topCustomer && metrics.grossRevenuePaise > 0
      ? Math.round((topCustomer.amountPaise / metrics.grossRevenuePaise) * 100)
      : null;
  const topExpense = data.expensesByCategory[0];
  const topExpenseShare =
    topExpense && metrics.expensesPaise > 0
      ? Math.round((topExpense.amountPaise / metrics.expensesPaise) * 100)
      : null;
  const revenueChange = percentChange(metrics.netRevenuePaise, previous.metrics.netRevenuePaise);
  const conversionPercent =
    conversion.total > 0 ? Math.round((conversion.converted / conversion.total) * 100) : null;

  // Outstanding ageing against today, bucketed by how old the order date is.
  const today = businessToday();
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const ageing = [
    { label: "0–7 days", min: 0, max: 7, count: 0, amountPaise: 0 },
    { label: "8–30 days", min: 8, max: 30, count: 0, amountPaise: 0 },
    { label: "31+ days", min: 31, max: Infinity, count: 0, amountPaise: 0 },
  ];
  for (const order of data.outstandingOrders) {
    const age = Math.max(0, Math.round((todayMs - Date.parse(`${order.orderDate}T00:00:00Z`)) / 86_400_000));
    const bucket = ageing.find((b) => age >= b.min && age <= b.max);
    if (bucket) {
      bucket.count += 1;
      bucket.amountPaise += order.balancePaise;
    }
  }

  const insights: { icon: typeof Lightbulb; text: string }[] = [];
  if (revenueChange !== null) {
    insights.push({
      icon: TrendingUp,
      text: `Net revenue is ${revenueChange >= 0 ? "up" : "down"} ${Math.abs(revenueChange)}% versus the previous period (${previousLabel}).`,
    });
  }
  if (margin !== null) {
    insights.push({
      icon: Percent,
      text: `You keep about ${margin}% of net revenue as estimated profit after recorded expenses.`,
    });
  }
  if (collection !== null) {
    insights.push({
      icon: Wallet,
      text: `Payments received cover ${collection}% of net revenue; ${formatINR(metrics.outstandingPaise)} is still outstanding on orders dated in this period.`,
    });
  }
  if (topProduct && topProductShare !== null) {
    insights.push({
      icon: BarChart3,
      text: `${topProduct.label} leads sales at ${topProductShare}% of gross revenue (${formatINR(topProduct.amountPaise)}).`,
    });
  }
  if (data.customerStats.total > 0) {
    insights.push({
      icon: Repeat,
      text: `${data.customerStats.repeat} of ${data.customerStats.total} customers ordered more than once; ${data.customerStats.firstTime} are first-time buyers.`,
    });
  }
  if (topCustomer && topCustomerShare !== null) {
    insights.push({
      icon: Users,
      text: `${topCustomer.label} is your largest customer at ${topCustomerShare}% of gross revenue — worth keeping close.`,
    });
  }
  if (topExpense && topExpenseShare !== null) {
    insights.push({
      icon: ReceiptText,
      text: `${topExpense.label} is the biggest expense line at ${topExpenseShare}% of spend (${formatINR(topExpense.amountPaise)}).`,
    });
  }
  if (conversionPercent !== null) {
    insights.push({
      icon: Lightbulb,
      text: `${conversion.converted} of ${conversion.total} enquiries became orders (${conversionPercent}% conversion).`,
    });
  }

  const kpis = [
    { label: "Avg order value", value: formatINR(avgOrderValue), icon: ReceiptText, accent: "accent-brass" },
    { label: "Profit margin", value: margin === null ? "—" : `${margin}%`, icon: Percent, accent: "accent-olive" },
    { label: "Collection rate", value: collection === null ? "—" : `${collection}%`, icon: Wallet, accent: "accent-brass" },
    {
      label: "Repeat customers",
      value: `${data.customerStats.repeat} / ${data.customerStats.total}`,
      icon: Repeat,
      accent: "accent-olive-deep",
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Money"
        title="Reports"
        description="Sales, payments, expenses and profit for any period, with a like-for-like comparison against the period before."
        actions={
          canExport ? (
            <ExportReport
              preset={range.preset}
              from={formatDateDDMMYYYY(range.from)}
              to={formatDateDDMMYYYY(range.to)}
              rangeLabel={rangeLabel(range)}
            />
          ) : undefined
        }
      />

      <section className="emboss px-5 py-4" aria-labelledby="report-range">
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Quick ranges" className="nav-segment grid grid-cols-4 sm:flex sm:flex-nowrap w-full sm:w-auto">
            {PRESETS.map((preset) => (
              <Link
                key={preset.value}
                href={`/admin/reports?preset=${preset.value}`}
                data-active={range.preset === preset.value}
                className="nav-segment-item text-center px-2 py-1.5 text-[0.8125rem] sm:text-[0.875rem]"
              >
                {preset.label}
              </Link>
            ))}
          </nav>
          <form className="ml-auto flex flex-wrap items-end gap-3" method="get">
            <input type="hidden" name="preset" value="custom" />
            <div>
              <label htmlFor="report-from" className="label">
                From
              </label>
              <input
                id="report-from"
                name="from"
                defaultValue={formatDateDDMMYYYY(range.from)}
                placeholder="DD/MM/YYYY"
                data-autosubmit="blur"
                className="field w-32"
              />
            </div>
            <div>
              <label htmlFor="report-to" className="label">
                To
              </label>
              <input
                id="report-to"
                name="to"
                defaultValue={formatDateDDMMYYYY(range.to)}
                placeholder="DD/MM/YYYY"
                data-autosubmit="blur"
                className="field w-32"
              />
            </div>
            <FilterNav />
            <button type="submit" className="sr-only">
              Apply
            </button>
          </form>
        </div>
        <p id="report-range" className="mt-3 text-[0.8125rem] text-ink-muted">
          Showing <strong className="font-medium text-ink">{rangeLabel(range)}</strong> ·{" "}
          {formatDateDDMMYYYY(range.from)} – {formatDateDDMMYYYY(range.to)}. Compared with{" "}
          {previousLabel}.
        </p>
        <nav aria-label="Report sections" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="text-[0.8125rem] text-olive-deep hover:underline"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </section>

      {insights.length > 0 ? (
        <section className="emboss-inset px-5 py-5" aria-labelledby="insights">
          <h2 id="insights" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
            <Lightbulb aria-hidden="true" className="size-4 text-brass" />
            What the numbers say
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <li key={insight.text} className="flex items-start gap-3 text-[0.875rem] leading-snug">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-paper-raised text-brass shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]">
                    <Icon aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="text-ink-soft">{insight.text}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section id="overview" aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                "emboss emboss-lift p-5",
                card.cardClass,
                card.accent,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className={cn(
                    "text-[0.75rem] font-bold uppercase tracking-[0.12em]",
                    card.labelClass,
                  )}
                >
                  {card.label}
                </p>
                <span className="stat-accent-icon">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              </div>
              <p
                className={cn(
                  "stat-num mt-4 text-3xl font-bold leading-none",
                  card.valueClass,
                )}
              >
                {formatINR(card.value)}
              </p>
              <p className="mt-3 text-[0.75rem]">
                <Delta current={card.current} previous={card.previous} invert={card.invert} />
              </p>
              <p className={cn("mt-2 text-[0.75rem] font-medium", card.detailClass)}>
                {card.detail}
              </p>
            </div>
          );
        })}
      </section>

      <section aria-label="Business ratios" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={cn("emboss flex items-center gap-3 px-5 py-4", kpi.accent)}>
              <span className="stat-accent-icon !size-9 !rounded-full">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {kpi.label}
                </p>
                <p className="stat-num text-[1.25rem] leading-tight">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="emboss flex flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-4" aria-label="Order counts">
        <p className="text-[0.875rem]">
          <strong className="font-medium">{metrics.salesOrders}</strong> sales orders
          <span className="text-ink-muted"> ({metrics.completedSalesOrders} completed)</span>
        </p>
        <p className="text-[0.875rem]">
          <strong className="font-medium">{metrics.giftOrders}</strong> gift orders
        </p>
        <p className="text-[0.875rem]">
          <strong className="font-medium">{metrics.cancelledOrders}</strong> cancelled
        </p>
        <p className="text-[0.875rem]">
          <strong className="font-medium">{metrics.newEnquiries}</strong> new enquiries
        </p>
        <p className="ml-auto text-[0.75rem] text-ink-muted">
          Gift orders never count as revenue. Cancelled sales are excluded from revenue.
        </p>
      </section>

      <div id="trends" className="grid gap-6 lg:grid-cols-3">
        <section className="emboss lg:col-span-2" aria-labelledby="period-trend">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="period-trend" className="font-[family-name:var(--font-display)] text-xl">
              Period trend
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="meta">Daily up to 45 days, monthly beyond · {rangeLabel(range)}</span>
              <Link href="#report-range" className="btn btn-outline btn-sm">
                <CalendarRange aria-hidden="true" className="size-3.5" />
                Edit period
              </Link>
            </div>
          </div>
          <div className="px-3 py-5 sm:px-5">
            <TrendChart series={data.series} />
          </div>
        </section>

        <section className="emboss" aria-labelledby="payments-method">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="payments-method" className="font-[family-name:var(--font-display)] text-xl">
              Payments by method
            </h2>
            <span className="meta">{rangeLabel(range)}</span>
          </div>
          <div className="px-3 py-5 sm:px-5">
            <PaymentsChart data={data.paymentsByMethod} />
          </div>
        </section>
      </div>

      {data.monthly.length > 1 ? (
        <section className="emboss" aria-labelledby="monthly-trend">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="monthly-trend" className="font-[family-name:var(--font-display)] text-xl">
              Month by month
            </h2>
            <span className="meta">Revenue and estimated profit per month in range</span>
          </div>
          <div className="px-3 py-5 sm:px-5">
            <MonthlyTrendChart series={data.monthly} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section id="products" className="emboss" aria-labelledby="sales-by-product">
          <div className="border-b border-line px-5 py-4">
            <h2 id="sales-by-product" className="font-[family-name:var(--font-display)] text-xl">
              Sales by product
            </h2>
          </div>
          {data.salesByProduct.length > 0 ? (
            <>
              <div className="px-3 pt-4 sm:px-5">
                <ProductMixChart data={data.salesByProduct} />
              </div>
              <BreakdownTable
                rows={data.salesByProduct}
                empty="No sales in this period."
                amountHeader="Revenue"
                countHeader="Product"
                countLabel="Lines"
                totalPaise={metrics.grossRevenuePaise}
              />
            </>
          ) : (
            <p className="py-12 text-center text-[0.875rem] text-ink-muted">
              No sales in this period.
            </p>
          )}
        </section>

        <section id="expenses" className="emboss" aria-labelledby="expenses-by-category">
          <div className="border-b border-line px-5 py-4">
            <h2 id="expenses-by-category" className="font-[family-name:var(--font-display)] text-xl">
              Expenses by category
            </h2>
          </div>
          {data.expensesByCategory.length > 0 ? (
            <>
              <div className="px-3 pt-4 sm:px-5">
                <ExpenseDonut data={data.expensesByCategory} />
              </div>
              <BreakdownTable
                rows={data.expensesByCategory}
                empty="No expenses in this period."
                amountHeader="Amount"
                countHeader="Category"
                countLabel="Entries"
                totalPaise={metrics.expensesPaise}
              />
            </>
          ) : (
            <p className="py-12 text-center text-[0.875rem] text-ink-muted">
              No expenses were recorded in this period.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section id="customers" className="emboss" aria-labelledby="top-customers">
          <div className="border-b border-line px-5 py-4">
            <h2 id="top-customers" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
              <Users aria-hidden="true" className="size-4 text-brass" />
              Top customers
            </h2>
          </div>
          <BreakdownTable
            rows={data.topCustomers}
            empty="No customer sales in this period."
            amountHeader="Sales"
            countHeader="Customer"
            countLabel="Orders"
            totalPaise={metrics.grossRevenuePaise}
          />
        </section>

        <section id="outstanding" className="emboss" aria-labelledby="outstanding">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="outstanding" className="font-[family-name:var(--font-display)] text-xl">
              Outstanding balances
            </h2>
            <span className="meta">{formatINR(metrics.outstandingPaise)} in period</span>
          </div>
          {data.outstandingOrders.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
              {ageing.map((bucket) => (
                <span key={bucket.label} className="pill">
                  {bucket.label}: {bucket.count} · {formatINR(bucket.amountPaise)}
                </span>
              ))}
            </div>
          ) : null}
          {data.outstandingOrders.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
              Nothing outstanding for orders dated in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.9375rem]">
                <thead>
                  <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Order
                    </th>
                    <th scope="col" className="hidden px-5 py-3 font-semibold sm:table-cell">
                      Date
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.outstandingOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-paper-raised/60">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${order.orderId}`}
                          className="font-medium hover:underline"
                        >
                          {order.ref}
                        </Link>
                        <p className="text-[0.8125rem] text-ink-soft">{order.customerName}</p>
                      </td>
                      <td className="hidden px-5 py-3 whitespace-nowrap text-ink-soft sm:table-cell">
                        {formatDateDDMMYYYY(order.orderDate)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {formatINR(order.balancePaise)}
                        <p className="text-[0.75rem] text-ink-muted">of {formatINR(order.totalPaise)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section id="gifts" className="emboss" aria-labelledby="gift-records">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
          <h2 id="gift-records" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
            <Gift aria-hidden="true" className="size-4 text-brass" />
            Gift records
          </h2>
          <span className="meta">{formatINR(metrics.giftingCostPaise)} cost in period</span>
        </div>
        {data.giftOrdersList.length === 0 ? (
          <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
            No gift orders in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Gift
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold sm:table-cell">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.giftOrdersList.map((gift) => (
                  <tr key={gift.orderId} className="hover:bg-paper-raised/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${gift.orderId}`}
                        className="font-medium hover:underline"
                      >
                        {gift.ref}
                      </Link>
                      <p className="text-[0.8125rem] text-ink-soft">{gift.recipient}</p>
                    </td>
                    <td className="hidden px-5 py-3 whitespace-nowrap text-ink-soft sm:table-cell">
                      {formatDateDDMMYYYY(gift.orderDate)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {formatINR(gift.costPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="space-y-1 text-[0.75rem] text-ink-muted">
        <p>
          Net revenue is valid sales dated in the period minus refunds dated in the period.
          Estimated profit is net revenue minus recorded expenses, including gifting costs and
          stock purchases. It is not accounting profit and does not include tax.
        </p>
        <p>
          Payments received counts non-voided payments dated in the period, including advances for
          later-dated orders. Outstanding balances cover sales orders dated in the period that are
          not fully paid.
        </p>
      </div>
    </div>
  );
}