import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Inbox,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission, canSeeMoney } from "@/lib/permissions";
import {
  getDashboardTrend,
  getOutstandingTotalPaise,
  getReportMetricsForWindows,
} from "@/lib/reports";
import { listRecentOrders } from "@/lib/orders";
import { listRecentEnquiries } from "@/lib/enquiries";
import {
  addDays,
  dateRangeForPreset,
  formatDateDDMMYYYY,
  relativeTime,
} from "@/lib/dates";
import { formatINR } from "@/lib/money";
import {
  ORDER_STATUS_LABELS,
  PERMISSION_LABELS,
  type OrderStatus,
  type Permission,
} from "@/lib/types";
import { DashboardTrend } from "@/components/admin/report-charts";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "border-brass text-brass",
  COMPLETED: "border-olive-deep text-olive-deep",
  CANCELLED: "border-terracotta text-terracotta",
};

function greeting(): string {
  const hour =
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    ) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function longDate(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ChangeChip({
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
        No activity yet
      </span>
    );
  }
  if (previous === 0) {
    return <span className="delta-chip delta-up">New today</span>;
  }
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (percent === 0) {
    return (
      <span className="delta-chip delta-flat">
        <Minus aria-hidden="true" className="size-3" />
        Same as yesterday
      </span>
    );
  }
  const rising = percent > 0;
  const good = invert ? !rising : rising;
  const Icon = rising ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("delta-chip", good ? "delta-up" : "delta-down")}>
      <Icon aria-hidden="true" className="size-3" />
      {Math.abs(percent)}% vs yesterday
    </span>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUser();
  const params = await searchParams;
  const denied = typeof params.denied === "string" ? params.denied : "";

  const canMoney = canSeeMoney(user);
  const canViewOrders = hasPermission(user, "orders.view");
  const canManageOrders = hasPermission(user, "orders.manage");
  const canManageEnquiries = hasPermission(user, "enquiries.manage");
  const canViewReports = hasPermission(user, "reports.view");

  const now = new Date();
  const today = dateRangeForPreset("today", now);
  const month = dateRangeForPreset("month", now);
  const yesterdayDate = addDays(today.from, -1);
  const yesterday = { preset: "custom" as const, from: yesterdayDate, to: yesterdayDate };

  const [reportMetrics, outstandingTotal, recentOrders, recentEnquiries, trend] =
    await Promise.all([
      canMoney ? getReportMetricsForWindows([today, month, yesterday]) : null,
      canMoney ? getOutstandingTotalPaise() : null,
      canViewOrders ? listRecentOrders(6) : Promise.resolve([]),
      canManageEnquiries ? listRecentEnquiries(5) : Promise.resolve([]),
      canMoney ? getDashboardTrend(14) : Promise.resolve([]),
    ]);

  const todayMetrics = reportMetrics?.[0] ?? null;
  const monthMetrics = reportMetrics?.[1] ?? null;
  const yesterdayMetrics = reportMetrics?.[2] ?? null;

  const firstName = user.name.split(/\s+/)[0] || user.name;

  const todayCards: {
    label: string;
    value: number;
    previous: number;
    invert?: boolean;
    detail: string;
    cardClass: string;
    labelClass: string;
    valueClass: string;
    detailClass: string;
    accent: string;
    icon: LucideIcon;
  }[] = todayMetrics
    ? [
        {
          label: "Sales revenue",
          value: todayMetrics.netRevenuePaise,
          previous: yesterdayMetrics?.netRevenuePaise ?? 0,
          detail: `Gross ${formatINR(todayMetrics.grossRevenuePaise)} · Refunds ${formatINR(todayMetrics.refundsPaise)}`,
          cardClass: "stat-card-olive",
          labelClass: "text-[#c2d6a4]",
          valueClass: "text-paper",
          detailClass: "text-[#c2d6a4]/75",
          accent: "accent-olive",
          icon: BarChart3,
        },
        {
          label: "Payments received",
          value: todayMetrics.paymentsReceivedPaise,
          previous: yesterdayMetrics?.paymentsReceivedPaise ?? 0,
          detail: `${todayMetrics.salesOrders} sales orders dated today`,
          cardClass: "stat-card-brass",
          labelClass: "text-[#e8cca0]",
          valueClass: "text-paper",
          detailClass: "text-[#e8cca0]/75",
          accent: "accent-brass",
          icon: Wallet,
        },
        {
          label: "Expenses",
          value: todayMetrics.expensesPaise,
          previous: yesterdayMetrics?.expensesPaise ?? 0,
          invert: true,
          detail: `Includes ${formatINR(todayMetrics.giftingCostPaise)} gifting costs`,
          cardClass: "stat-card-terracotta",
          labelClass: "text-[#f5b3a3]",
          valueClass: "text-paper",
          detailClass: "text-[#f5b3a3]/75",
          accent: "accent-terracotta",
          icon: ReceiptText,
        },
        {
          label: "Estimated profit",
          value: todayMetrics.estimatedProfitPaise,
          previous: yesterdayMetrics?.estimatedProfitPaise ?? 0,
          detail: "Net revenue minus recorded expenses",
          cardClass: "stat-card-profit",
          labelClass: "text-[#a8e8bd]",
          valueClass: "text-paper",
          detailClass: "text-[#a8e8bd]/75",
          accent: "accent-olive-deep",
          icon: TrendingUp,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Espresso top pill: greeting + date on the left, quick actions on the right corner. */}
      <header className="espresso flex flex-wrap items-center gap-3 rounded-2xl p-3 sm:rounded-full sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-paper/25 bg-paper/10 text-[0.8125rem] font-semibold text-paper shadow-[inset_0_1px_0_0_rgba(246,241,230,0.2)]">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-[1.0625rem] leading-tight text-paper">
              {greeting()}, {firstName}.
            </p>
            <p className="truncate text-[0.75rem] text-paper/55">{longDate()}</p>
          </div>
        </div>

        <nav
          aria-label="Quick actions"
          className="espresso-inset order-last flex w-full items-center gap-1 rounded-full px-1.5 py-1.5 sm:order-none sm:ml-auto sm:w-auto"
        >
          {canManageOrders ? (
            <Link
              href="/admin/orders/new"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              New order
            </Link>
          ) : null}
          {hasPermission(user, "expenses.manage") ? (
            <Link
              href="/admin/expenses/new"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <ReceiptText aria-hidden="true" className="size-3.5" />
              Expense
            </Link>
          ) : null}
          {canViewReports ? (
            <Link
              href="/admin/reports"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <BarChart3 aria-hidden="true" className="size-3.5" />
              Reports
            </Link>
          ) : null}
        </nav>
      </header>

      {denied ? (
        <p
          role="alert"
          className="emboss border-terracotta px-4 py-3 text-[0.875rem] text-ink"
        >
          You do not have access to{" "}
          {PERMISSION_LABELS[denied as Permission]
            ? PERMISSION_LABELS[denied as Permission].toLowerCase()
            : "that area"}
          . Ask the Owner if you need it.
        </p>
      ) : null}

      {canMoney && todayMetrics ? (
        <section aria-labelledby="today-numbers" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="today-numbers" className="font-[family-name:var(--font-display)] text-xl">
              Today
            </h2>
            {canViewReports ? (
              <Link
                href="/admin/reports?preset=today"
                className="text-[0.8125rem] text-olive-deep hover:underline"
              >
                Open today in reports
              </Link>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {todayCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "emboss emboss-lift p-5",
                    stat.cardClass,
                    stat.accent,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        "text-[0.75rem] font-bold uppercase tracking-[0.12em]",
                        stat.labelClass,
                      )}
                    >
                      {stat.label}
                    </p>
                    <span className="stat-accent-icon">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                  <p
                    className={cn(
                      "stat-num mt-3 text-3xl font-bold leading-none",
                      stat.valueClass,
                    )}
                  >
                    {formatINR(stat.value)}
                  </p>
                  <p className="mt-3">
                    <ChangeChip
                      current={stat.value}
                      previous={stat.previous}
                      invert={stat.invert}
                    />
                  </p>
                  <p className={cn("mt-2 text-[0.75rem] font-medium", stat.detailClass)}>
                    {stat.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {canMoney && trend.length > 0 ? (
        <section className="emboss p-5" aria-labelledby="dashboard-trend">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="dashboard-trend" className="font-[family-name:var(--font-display)] text-xl">
              Last 14 days
            </h2>
            <span className="meta">Daily sales revenue and estimated profit</span>
          </div>
          <div className="mt-3">
            <DashboardTrend series={trend} />
          </div>
        </section>
      ) : null}

      {canMoney && monthMetrics ? (
        <section className="emboss-inset px-5 py-5" aria-labelledby="month-numbers">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="month-numbers" className="font-[family-name:var(--font-display)] text-xl">
              This month so far
            </h2>
            {canViewReports ? (
              <Link
                href="/admin/reports?preset=month"
                className="text-[0.8125rem] text-olive-deep hover:underline"
              >
                Open full reports
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-5">
            {[
              { label: "Net revenue", value: formatINR(monthMetrics.netRevenuePaise), dot: "bg-olive" },
              { label: "Payments received", value: formatINR(monthMetrics.paymentsReceivedPaise), dot: "bg-brass" },
              { label: "Expenses", value: formatINR(monthMetrics.expensesPaise), dot: "bg-terracotta" },
              { label: "Estimated profit", value: formatINR(monthMetrics.estimatedProfitPaise), dot: "bg-olive-deep" },
              { label: "Outstanding · all time", value: formatINR(outstandingTotal ?? 0), dot: "bg-brass" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  <span className={cn("stat-dot", stat.dot)} aria-hidden="true" />
                  {stat.label}
                </p>
                <p className="stat-num mt-2 text-[1.125rem]">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid items-start gap-6">
        {canViewOrders ? (
          <section className="emboss" aria-labelledby="recent-orders">
            <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
              <h2
                id="recent-orders"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
              >
                <ShoppingBag aria-hidden="true" className="size-4 text-brass" />
                Recent orders
              </h2>
              <Link href="/admin/orders" className="text-[0.8125rem] text-olive-deep hover:underline">
                View all
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[0.875rem] text-ink-muted">Orders you record will appear here.</p>
                {canManageOrders ? (
                  <Link href="/admin/orders/new" className="btn btn-outline btn-sm mt-4">
                    <Plus aria-hidden="true" className="size-4" />
                    New order
                  </Link>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {recentOrders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[0.9375rem] font-medium hover:underline"
                      >
                        {order.ref}
                      </Link>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                        {order.customerSnapshot.name} · {order.customerSnapshot.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("pill", STATUS_STYLES[order.status])}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      {order.type === "GIFT" ? (
                        <span className="text-[0.75rem] text-ink-muted">Gift</span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      {canMoney && order.type === "SALES" ? (
                        <p className="text-[0.875rem]">{formatINR(order.totalPaise)}</p>
                      ) : null}
                      <p className="text-[0.75rem] text-ink-muted">
                        {formatDateDDMMYYYY(order.orderDate)}
                        {canMoney && order.balancePaise > 0 && order.status !== "CANCELLED"
                          ? ` · ${formatINR(order.balancePaise)} due`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <div className="grid items-start gap-6">
        {canManageEnquiries ? (
          <section className="emboss" aria-labelledby="recent-enquiries">
            <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
              <h2
                id="recent-enquiries"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
              >
                <Inbox aria-hidden="true" className="size-4 text-brass" />
                New enquiries
              </h2>
              <Link href="/admin/enquiries" className="text-[0.8125rem] text-olive-deep hover:underline">
                View all
              </Link>
            </div>
            {recentEnquiries.length === 0 ? (
              <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
                Enquiries from the website will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recentEnquiries.map((enquiry) => {
                  const contact = [enquiry.phoneOriginal || enquiry.phone, enquiry.email]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={enquiry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.9375rem] font-medium">{enquiry.name}</p>
                        <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                          {contact || "No contact left on the form"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.875rem]">{enquiry.quantityKg} kg</p>
                        <p className="text-[0.75rem] text-ink-muted">
                          {enquiry.notSure
                            ? "Date not decided"
                            : enquiry.expectedDate
                              ? `Expected ${formatDateDDMMYYYY(enquiry.expectedDate)}`
                              : ""}
                        </p>
                      </div>
                      <p className="w-full text-[0.75rem] text-ink-muted sm:w-auto">
                        {relativeTime(enquiry.submittedAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      {/* Bottom espresso rail, echoing the top pill. */}
      <footer className="espresso flex flex-wrap items-center gap-x-4 gap-y-2 rounded-full px-5 py-3">
        <p className="text-[0.75rem] text-paper/60">
          All times in Asia/Kolkata · dates DD/MM/YYYY. Estimated profit is net revenue minus
          recorded expenses, not accounting profit.
        </p>
        {canViewReports ? (
          <Link
            href="/admin/reports"
            className="ml-auto flex items-center gap-1.5 text-[0.8125rem] text-paper/80 transition-colors hover:text-paper"
          >
            Reports
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}
      </footer>
    </div>
  );
}