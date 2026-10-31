import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search, ShoppingBag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FilterNav } from "@/components/admin/filter-nav";
import { requirePermission } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDateDDMMYYYY } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { listOrders } from "@/lib/orders";
import { hasPermission } from "@/lib/permissions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type OrderType,
} from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 30;

const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "border-brass text-brass",
  CONFIRMED: "border-olive-soft text-olive",
  COMPLETED: "border-olive-deep text-olive-deep",
  CANCELLED: "border-terracotta text-terracotta",
};

function filterSummary(query: string, status: string, type: string): string {
  const parts: string[] = [];
  if (query) parts.push(`text “${query}”`);
  if (status) {
    const label = ORDER_STATUS_LABELS[status as OrderStatus];
    parts.push(`status ${label ? label.toLowerCase() : status}`);
  }
  if (type) parts.push(type === "SALES" ? "sales orders only" : "gifting orders only");
  return `Filtered by ${parts.join(", ")}. Try removing a filter to see more orders.`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("orders.view");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const rawType = typeof params.type === "string" ? params.type : "";
  const status = ORDER_STATUSES.includes(rawStatus as OrderStatus) ? rawStatus : "";
  const type = rawType === "SALES" || rawType === "GIFT" ? rawType : "";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);
  const { items, total } = await listOrders({
    query,
    status: status as OrderStatus | "",
    type: type as OrderType | "",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const canManage = hasPermission(user, "orders.manage");
  const filtersActive = Boolean(query || status || type);

  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (status) search.set("status", status);
    if (type) search.set("type", type);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return `/admin/orders${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales"
        title="Orders"
        description="Sales orders and gifting orders share one workflow. Sales orders get sequential invoice numbers; gifts never count as revenue."
        actions={
          canManage ? (
            <Link href="/admin/orders/new" className="btn btn-solid btn-sm">
              <Plus aria-hidden="true" className="size-4" />
              New order
            </Link>
          ) : null
        }
      />

      <section className="surface" aria-labelledby="order-list">
        <div className="border-b border-line px-5 py-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-52 flex-1">
              <label htmlFor="order-search" className="label">
                Search
              </label>
              <div className="flex">
                <span className="grid place-items-center border border-r-0 border-line bg-paper-raised px-3">
                  <Search aria-hidden="true" className="size-4 text-ink-muted" />
                </span>
                <input
                  id="order-search"
                  name="q"
                  defaultValue={query}
                  placeholder="Invoice number, name or phone"
                  className="field border-l-0"
                />
              </div>
            </div>
            <div>
              <label htmlFor="order-status" className="label">
                Status
              </label>
              <select id="order-status" name="status" defaultValue={status} className="field min-w-36">
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {ORDER_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="order-type" className="label">
                Type
              </label>
              <select id="order-type" name="type" defaultValue={type} className="field min-w-32">
                <option value="">All types</option>
                <option value="SALES">Sales</option>
                <option value="GIFT">Gifting</option>
              </select>
            </div>
            <FilterNav />
            <button type="submit" className="sr-only">
              Apply filters
            </button>
            {filtersActive ? (
              <Link href="/admin/orders" className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id="order-list" className="text-[1.0625rem] font-medium">
            {filtersActive ? "Matching orders" : "Orders"}
          </h2>
          <span className="meta">
            {total} {total === 1 ? "order" : "orders"}
          </span>
        </div>

        {items.length === 0 ? (
          filtersActive ? (
            <div className="px-5 py-14 text-center">
              <Search aria-hidden="true" className="mx-auto size-7 text-brass" />
              <p className="display-s mt-4">No orders match these filters.</p>
              <p className="mt-2 text-[0.9375rem] text-ink-soft">
                {filterSummary(query, status, type)}
              </p>
              <Link href="/admin/orders" className="btn btn-outline mt-6">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <ShoppingBag aria-hidden="true" className="mx-auto size-7 text-brass" />
              <p className="display-s mt-4">No orders yet.</p>
              <p className="mt-2 text-[0.9375rem] text-ink-soft">
                Create the first order from a customer profile or an enquiry.
              </p>
              {canManage ? (
                <Link href="/admin/orders/new" className="btn btn-solid mt-6">
                  Create an order
                </Link>
              ) : null}
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.9375rem] md:min-w-[56rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Order
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Customer
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Date
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Status
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Payment
                  </th>
                  <th
                    scope="col"
                    className="hidden px-5 py-3 text-right font-semibold md:table-cell"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((order) => (
                  <tr key={order.id} className="hover:bg-paper-raised/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.ref}
                      </Link>
                      <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                        {order.type === "SALES" ? "Sales" : "Gifting"}
                        {order.invoice ? ` · invoice v${order.invoice.version}` : ""}
                      </p>
                      <p className="mt-1 text-[0.8125rem] text-ink-soft md:hidden">
                        {order.customerSnapshot.name} · {formatDateDDMMYYYY(order.orderDate)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 md:hidden">
                        <span className={cn("pill", STATUS_STYLES[order.status])}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        {order.type === "GIFT" ? (
                          <span className="text-[0.75rem] text-ink-muted">
                            Gift · not invoiced
                          </span>
                        ) : (
                          <span className="text-[0.75rem] text-ink-soft">
                            {formatINR(order.totalPaise)} ·{" "}
                            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                            {order.balancePaise > 0 && order.status !== "CANCELLED"
                              ? ` · ${formatINR(order.balancePaise)} due`
                              : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <p className="font-medium">{order.customerSnapshot.name}</p>
                      <p className="text-[0.8125rem] text-ink-muted">
                        {order.customerSnapshot.phone}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3 whitespace-nowrap md:table-cell">
                      {formatDateDDMMYYYY(order.orderDate)}
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <span className={cn("pill", STATUS_STYLES[order.status])}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      {order.type === "GIFT" ? (
                        <span className="text-[0.8125rem] text-ink-muted">Not applicable</span>
                      ) : (
                        <div>
                          <span className="text-[0.8125rem]">
                            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                          </span>
                          {order.balancePaise > 0 && order.status !== "CANCELLED" ? (
                            <p className="text-[0.75rem] text-terracotta">
                              {formatINR(order.balancePaise)} due
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-5 py-3 text-right whitespace-nowrap md:table-cell">
                      {order.type === "GIFT" ? (
                        <span className="text-[0.8125rem] text-ink-muted">Gift</span>
                      ) : (
                        formatINR(order.totalPaise)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="meta">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn btn-outline btn-sm">
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="btn btn-outline btn-sm">
                  Next
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
