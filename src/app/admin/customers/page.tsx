import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FilterNav } from "@/components/admin/filter-nav";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { listCustomers } from "@/lib/customers";
import { formatDateDDMMYYYY } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { customerOrderStats } from "@/lib/orders";
import { DeleteCustomer } from "./delete-customer";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 30;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("customers.view");
  const canManage = hasPermission(user, "customers.manage");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const includeArchived = params.archived === "1";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);
  const { items, total } = await listCustomers({
    query,
    includeArchived,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const stats = await customerOrderStats(items.map((customer) => customer.id));
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (includeArchived) search.set("archived", "1");
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return `/admin/customers${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales"
        title="Customers"
        description="One profile per phone number. Order history stays linked even when a profile is archived."
        actions={
          <Link href="/admin/customers/new" className="btn btn-solid btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            New customer
          </Link>
        }
      />

      <section className="surface" aria-labelledby="customer-list">
        <div className="border-b border-line px-5 py-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-56 flex-1">
              <label htmlFor="customer-search" className="label">
                Search
              </label>
              <div className="flex">
                <span className="field-adorn">
                  <Search aria-hidden="true" className="size-4 text-ink-muted" />
                </span>
                <input
                  id="customer-search"
                  name="q"
                  defaultValue={query}
                  placeholder="Name, phone, email or company"
                  className="field border-l-0"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 pb-3 text-[0.875rem] text-ink-soft">
              <input
                type="checkbox"
                name="archived"
                value="1"
                defaultChecked={includeArchived}
                className="size-4 accent-olive"
              />
              Include archived
            </label>
            <FilterNav />
            <button type="submit" className="sr-only">
              Search customers
            </button>
            {query || includeArchived ? (
              <Link href="/admin/customers" className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id="customer-list" className="text-[1.0625rem] font-medium">
            {query ? "Search results" : "All customers"}
          </h2>
          <span className="meta">
            {total} {total === 1 ? "customer" : "customers"}
            {includeArchived ? " including archived" : ""}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Users aria-hidden="true" className="mx-auto size-7 text-brass" />
            <p className="display-s mt-4">{query ? "No profiles match that search." : "No customers yet."}</p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              {query
                ? `Nothing found for “${query}”. Phone numbers are searched as typed.`
                : "Create a profile when the first order or enquiry needs one."}
              {query && !includeArchived ? " Archived profiles are hidden — tick “Include archived” to search them too." : ""}
            </p>
            {query ? (
              <Link href="/admin/customers" className="btn btn-outline mt-6">
                Clear search
              </Link>
            ) : (
              <Link href="/admin/customers/new" className="btn btn-solid mt-6">
                Add a customer
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.9375rem] md:min-w-[46rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Customer
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Phone
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Orders
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Sales
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Last order
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right font-semibold"
                  >
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((customer) => {
                  const stat = stats.get(customer.id);
                  return (
                    <tr key={customer.id} className="hover:bg-paper-raised/60">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                          {customer.company ?? customer.email ?? "—"}
                        </p>
                        <p className="mt-1 text-[0.8125rem] text-ink-soft md:hidden">
                          {customer.phoneOriginal}
                        </p>
                        <p className="mt-0.5 text-[0.75rem] text-ink-muted md:hidden">
                          {stat?.count ?? 0} {stat?.count === 1 ? "order" : "orders"} ·{" "}
                          {formatINR(stat?.totalPaise ?? 0)}
                          {stat?.lastOrderDate
                            ? ` · last ${formatDateDDMMYYYY(stat.lastOrderDate)}`
                            : ""}
                        </p>
                        {customer.archived ? (
                          <span className="pill mt-2 border-line text-ink-muted">Archived</span>
                        ) : null}
                      </td>
                      <td className="hidden px-5 py-3 whitespace-nowrap md:table-cell">
                        {customer.phoneOriginal}
                      </td>
                      <td className="hidden px-5 py-3 md:table-cell">{stat?.count ?? 0}</td>
                      <td className="hidden px-5 py-3 whitespace-nowrap md:table-cell">
                        {formatINR(stat?.totalPaise ?? 0)}
                      </td>
                      <td className="hidden px-5 py-3 whitespace-nowrap md:table-cell">
                        {stat?.lastOrderDate ? formatDateDDMMYYYY(stat.lastOrderDate) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right align-top">
                        <div className="flex flex-col items-end gap-1">
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="text-[0.8125rem] text-brass-ink hover:underline"
                          >
                            Open
                          </Link>
                          {canManage ? (
                            <DeleteCustomer
                              id={customer.id}
                              name={customer.name}
                              orderCount={stat?.count ?? 0}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
