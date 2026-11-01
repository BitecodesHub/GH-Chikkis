import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  Inbox,
  Plus,
  ReceiptText,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission, canSeeMoney } from "@/lib/permissions";
import { getOutstandingTotalPaise, getReportMetricsForWindows } from "@/lib/reports";
import { listRecentOrders } from "@/lib/orders";
import { listRecentEnquiries } from "@/lib/enquiries";
import { listAlertsForUser } from "@/lib/alerts";
import { listInventoryItems } from "@/lib/inventory";
import {
  dateRangeForPreset,
  formatDateDDMMYYYY,
  relativeTime,
} from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { stockLabel } from "@/lib/quantity";
import {
  ORDER_STATUS_LABELS,
  PERMISSION_LABELS,
  type OrderStatus,
  type Permission,
} from "@/lib/types";
import { AdminPageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "border-brass text-brass",
  CONFIRMED: "border-olive-soft text-olive",
  COMPLETED: "border-olive-deep text-olive-deep",
  CANCELLED: "border-terracotta text-terracotta",
};

const SEVERITY_STYLES: Record<string, string> = {
  INFO: "bg-olive-soft",
  WARNING: "bg-brass",
  CRITICAL: "bg-terracotta",
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
  const canManageInventory = hasPermission(user, "inventory.manage");

  const now = new Date();
  const today = dateRangeForPreset("today", now);
  const month = dateRangeForPreset("month", now);

  const [reportMetrics, outstandingTotal, alerts, recentOrders, recentEnquiries, inventory] =
    await Promise.all([
      canMoney ? getReportMetricsForWindows([today, month]) : null,
      canMoney ? getOutstandingTotalPaise() : null,
      listAlertsForUser(user, { status: "OPEN", limit: 5 }),
      canViewOrders ? listRecentOrders(6) : Promise.resolve([]),
      canManageEnquiries ? listRecentEnquiries(5) : Promise.resolve([]),
      canManageInventory ? listInventoryItems({}) : Promise.resolve([]),
    ]);

  const todayMetrics = reportMetrics?.[0] ?? null;
  const monthMetrics = reportMetrics?.[1] ?? null;

  const firstName = user.name.split(/\s+/)[0] || user.name;
  const activeInventory = inventory.filter((item) => item.active);

  const headerActions =
    canManageOrders || canMoney ? (
      <div className="flex flex-wrap gap-2">
        {canManageOrders ? (
          <Link href="/admin/orders/new" className="btn btn-solid btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            New order
          </Link>
        ) : null}
        {hasPermission(user, "expenses.manage") ? (
          <Link href="/admin/expenses/new" className="btn btn-outline btn-sm">
            <ReceiptText aria-hidden="true" className="size-4" />
            Record expense
          </Link>
        ) : null}
      </div>
    ) : (
      <Link href="/" target="_blank" className="btn btn-outline btn-sm">
        View website
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>
    );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Dashboard"
        title={`${greeting()}, ${firstName}.`}
        description={longDate()}
        actions={headerActions}
      />

      {denied ? (
        <p
          role="alert"
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-ink"
        >
          You do not have access to{" "}
          {PERMISSION_LABELS[denied as Permission]
            ? PERMISSION_LABELS[denied as Permission].toLowerCase()
            : "that area"}
          . Ask the Owner if you need it.
        </p>
      ) : null}

      {canMoney && todayMetrics ? (
        <section aria-labelledby="today-numbers" className="space-y-4">
          <h2 id="today-numbers" className="font-[family-name:var(--font-display)] text-xl">
            Today
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Sales revenue",
                value: todayMetrics.netRevenuePaise,
                detail: `Gross ${formatINR(todayMetrics.grossRevenuePaise)} · Refunds ${formatINR(todayMetrics.refundsPaise)}`,
              },
              {
                label: "Payments received",
                value: todayMetrics.paymentsReceivedPaise,
                detail: `${todayMetrics.salesOrders} sales orders dated today`,
              },
              {
                label: "Expenses",
                value: todayMetrics.expensesPaise,
                detail: `Includes ${formatINR(todayMetrics.giftingCostPaise)} gifting costs`,
              },
              {
                label: "Estimated profit",
                value: todayMetrics.estimatedProfitPaise,
                detail: "Net revenue minus recorded expenses",
              },
            ].map((stat) => (
              <div key={stat.label} className="surface p-5">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {stat.label}
                </p>
                <p className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-none">
                  {formatINR(stat.value)}
                </p>
                <p className="mt-2 text-[0.75rem] text-ink-muted">{stat.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canMoney && monthMetrics ? (
        <section className="surface" aria-labelledby="month-numbers">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="month-numbers" className="font-[family-name:var(--font-display)] text-xl">
              This month so far
            </h2>
            <Link href="/admin/reports?preset=month" className="text-[0.8125rem] text-olive-deep hover:underline">
              Open full reports
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 py-5 md:grid-cols-5">
            {[
              { label: "Net revenue", value: formatINR(monthMetrics.netRevenuePaise) },
              { label: "Payments received", value: formatINR(monthMetrics.paymentsReceivedPaise) },
              { label: "Expenses", value: formatINR(monthMetrics.expensesPaise) },
              { label: "Estimated profit", value: formatINR(monthMetrics.estimatedProfitPaise) },
              { label: "Outstanding · all time", value: formatINR(outstandingTotal ?? 0) },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {stat.label}
                </p>
                <p className="mt-2 text-[1.125rem]">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {canViewOrders ? (
          <section className="surface lg:col-span-2" aria-labelledby="recent-orders">
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

        <section className="surface" aria-labelledby="open-alerts">
          <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
            <h2
              id="open-alerts"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
            >
              <TriangleAlert aria-hidden="true" className="size-4 text-brass" />
              Open alerts
            </h2>
            <Link href="/admin/alerts" className="text-[0.8125rem] text-olive-deep hover:underline">
              View all
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
              Nothing needs attention.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {alerts.map((alert) => (
                <li key={alert.id} className="px-5 py-4">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rotate-45",
                        SEVERITY_STYLES[alert.severity] ?? "bg-ink-muted",
                      )}
                    />
                    <div>
                      <p className="text-[0.875rem] font-medium">
                        {alert.link ? (
                          <Link href={alert.link} className="hover:underline">
                            {alert.title}
                          </Link>
                        ) : (
                          alert.title
                        )}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{alert.message}</p>
                      <p className="mt-1 text-[0.75rem] text-ink-muted">
                        {relativeTime(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {canManageEnquiries ? (
          <section className="surface" aria-labelledby="recent-enquiries">
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
                {recentEnquiries.map((enquiry) => (
                  <li key={enquiry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] font-medium">{enquiry.name}</p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                        {enquiry.phoneOriginal || enquiry.phone}
                        {enquiry.email ? ` · ${enquiry.email}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.875rem]">{enquiry.quantityKg} kg</p>
                      <p className="text-[0.75rem] text-ink-muted">
                        {enquiry.notSure
                          ? "Date not decided"
                          : `Expected ${formatDateDDMMYYYY(enquiry.expectedDate)}`}
                      </p>
                    </div>
                    <p className="w-full text-[0.75rem] text-ink-muted sm:w-auto">
                      {relativeTime(enquiry.submittedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {canManageInventory ? (
          <section className="surface" aria-labelledby="inventory-snapshot">
            <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
              <h2
                id="inventory-snapshot"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
              >
                <Boxes aria-hidden="true" className="size-4 text-brass" />
                Inventory on hand
              </h2>
              <Link href="/admin/inventory" className="text-[0.8125rem] text-olive-deep hover:underline">
                Manage
              </Link>
            </div>
            {activeInventory.length === 0 ? (
              <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
                No inventory items yet.{" "}
                <Link href="/admin/inventory/new" className="text-olive-deep hover:underline">
                  Add the first item
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {activeInventory.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-4 px-5 py-3">
                    <Link
                      href={`/admin/inventory/${item.id}`}
                      className="min-w-0 truncate text-[0.9375rem] hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="text-[0.875rem] whitespace-nowrap">
                      {stockLabel(item.currentQuantity, item.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <p className="text-[0.75rem] text-ink-muted">
        All times are shown in Asia/Kolkata. Dates are shown as DD/MM/YYYY. Estimated profit is net
        revenue minus recorded expenses; it is not accounting profit.
      </p>
    </div>
  );
}
