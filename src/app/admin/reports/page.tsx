import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Gift,
  Minus,
  ReceiptText,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ExportReport } from "@/components/admin/export-report";
import { FilterNav } from "@/components/admin/filter-nav";
import { PaymentsChart, TrendChart } from "@/components/admin/report-charts";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getReportData } from "@/lib/reports";
import { dateRangeFromParams, formatDateDDMMYYYY, rangeLabel } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { ReportBreakdown } from "@/lib/types";

export const metadata: Metadata = { title: "Reports" };

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
      <span className="inline-flex items-center gap-1 text-ink-muted">
        <Minus aria-hidden="true" className="size-3.5" />
        No activity in either period
      </span>
    );
  }
  if (previous === 0) {
    return <span className="text-olive-deep">New activity this period</span>;
  }
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (percent === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-ink-muted">
        <Minus aria-hidden="true" className="size-3.5" />
        Same as previous period
      </span>
    );
  }
  const rising = percent > 0;
  const good = invert ? !rising : rising;
  const Icon = rising ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={good ? "inline-flex items-center gap-1 text-olive-deep" : "inline-flex items-center gap-1 text-terracotta"}>
      <Icon aria-hidden="true" className="size-3.5" />
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
}: {
  rows: ReportBreakdown[];
  empty: string;
  amountHeader: string;
  countHeader?: string;
  countLabel?: string;
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
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-paper-raised/60">
              <td className="px-5 py-3">{row.label}</td>
              {countLabel ? (
                <td className="px-5 py-3 text-right text-ink-soft">{row.count ?? 0}</td>
              ) : null}
              <td className="px-5 py-3 text-right whitespace-nowrap">
                {formatINR(row.amountPaise)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("reports.view");
  const params = await searchParams;
  const range = dateRangeFromParams(params);
  const data = await getReportData(range);
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
    },
    {
      label: "Payments received",
      value: metrics.paymentsReceivedPaise,
      current: metrics.paymentsReceivedPaise,
      previous: previous.metrics.paymentsReceivedPaise,
      detail: `Outstanding in period ${formatINR(metrics.outstandingPaise)}`,
      icon: ReceiptText,
    },
    {
      label: "Expenses",
      value: metrics.expensesPaise,
      current: metrics.expensesPaise,
      previous: previous.metrics.expensesPaise,
      detail: `Includes ${formatINR(metrics.giftingCostPaise)} gifting costs`,
      icon: ReceiptText,
      invert: true,
    },
    {
      label: "Estimated profit",
      value: metrics.estimatedProfitPaise,
      current: metrics.estimatedProfitPaise,
      previous: previous.metrics.estimatedProfitPaise,
      detail: "Net revenue minus recorded expenses",
      icon: BarChart3,
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

      <section className="surface px-5 py-4" aria-labelledby="report-range">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label htmlFor="report-preset" className="label">
              Date range
            </label>
            <select
              id="report-preset"
              name="preset"
              defaultValue={range.preset}
              className="field min-w-36"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
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
        <p id="report-range" className="mt-3 text-[0.8125rem] text-ink-muted">
          Showing <strong className="font-medium text-ink">{rangeLabel(range)}</strong> ·{" "}
          {formatDateDDMMYYYY(range.from)} – {formatDateDDMMYYYY(range.to)}. Compared with{" "}
          {previousLabel}.
        </p>
      </section>

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {card.label}
                </p>
                <Icon aria-hidden="true" className="size-4 text-brass" />
              </div>
              <p className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-none">
                {formatINR(card.value)}
              </p>
              <p className="mt-3 text-[0.75rem]">
                <Delta current={card.current} previous={card.previous} invert={card.invert} />
              </p>
              <p className="mt-1 text-[0.75rem] text-ink-muted">{card.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="surface flex flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-4" aria-label="Order counts">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface lg:col-span-2" aria-labelledby="period-trend">
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

        <section className="surface" aria-labelledby="payments-method">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface" aria-labelledby="sales-by-product">
          <div className="border-b border-line px-5 py-4">
            <h2 id="sales-by-product" className="font-[family-name:var(--font-display)] text-xl">
              Sales by product
            </h2>
          </div>
          <BreakdownTable
            rows={data.salesByProduct}
            empty="No sales in this period."
            amountHeader="Revenue"
            countHeader="Product"
            countLabel="Lines"
          />
        </section>

        <section className="surface" aria-labelledby="expenses-by-category">
          <div className="border-b border-line px-5 py-4">
            <h2 id="expenses-by-category" className="font-[family-name:var(--font-display)] text-xl">
              Expenses by category
            </h2>
          </div>
          <BreakdownTable
            rows={data.expensesByCategory}
            empty="No expenses in this period."
            amountHeader="Amount"
            countHeader="Category"
            countLabel="Entries"
          />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface" aria-labelledby="top-customers">
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
          />
        </section>

        <section className="surface" aria-labelledby="outstanding">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="outstanding" className="font-[family-name:var(--font-display)] text-xl">
              Outstanding balances
            </h2>
            <span className="meta">{formatINR(metrics.outstandingPaise)} in period</span>
          </div>
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

      <section className="surface" aria-labelledby="gift-records">
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
