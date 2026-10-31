import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Plus, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FilterNav } from "@/components/admin/filter-nav";
import { requirePermission } from "@/lib/auth/session";
import { inventoryCategories, listInventoryItems } from "@/lib/inventory";
import { formatStockQuantity } from "@/lib/quantity";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Inventory" };

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("inventory.manage");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const includeArchived = params.archived === "1";
  const [items, categories] = await Promise.all([
    listInventoryItems({ query, category, includeInactive: includeArchived }),
    inventoryCategories(),
  ]);
  const activeCount = items.filter((item) => item.active).length;
  const filtersActive = Boolean(query || category || includeArchived);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Raw materials and packaging, tracked by hand. Purchases create expenses; usage only moves stock. No automatic deductions from sales."
        actions={
          <Link href="/admin/inventory/new" className="btn btn-solid btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            Add item
          </Link>
        }
      />

      <section className="surface" aria-labelledby="inventory-list">
        <div className="border-b border-line px-5 py-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-52 flex-1">
              <label htmlFor="inventory-search" className="label">
                Search
              </label>
              <div className="flex">
                <span className="grid place-items-center border border-r-0 border-line bg-paper-raised px-3">
                  <Search aria-hidden="true" className="size-4 text-ink-muted" />
                </span>
                <input
                  id="inventory-search"
                  name="q"
                  defaultValue={query}
                  placeholder="Item name or category"
                  className="field border-l-0"
                />
              </div>
            </div>
            <div>
              <label htmlFor="inventory-filter-category" className="label">
                Category
              </label>
              <select
                id="inventory-filter-category"
                name="category"
                defaultValue={category}
                className="field min-w-44"
              >
                <option value="">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-[0.875rem]">
              <input
                type="checkbox"
                name="archived"
                value="1"
                defaultChecked={includeArchived}
                className="size-4 accent-olive"
              />
              Show archived
            </label>
            <FilterNav />
            <button type="submit" className="sr-only">
              Apply filters
            </button>
            {filtersActive ? (
              <Link href="/admin/inventory" className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id="inventory-list" className="text-[1.0625rem] font-medium">
            {filtersActive ? "Matching items" : "Stock on hand"}
          </h2>
          <span className="meta">
            {items.length} {items.length === 1 ? "item" : "items"}
            {includeArchived ? ` · ${activeCount} active` : ""}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Boxes aria-hidden="true" className="mx-auto size-7 text-brass" />
            <p className="display-s mt-4">
              {filtersActive ? "No items match these filters." : "No inventory items yet."}
            </p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              {filtersActive
                ? "Try another category, or tick “Show archived” to include paused items."
                : "Add ghee, seeds, boxes and anything else you count by hand."}
            </p>
            {filtersActive ? (
              <Link href="/admin/inventory" className="btn btn-outline mt-6">
                Clear filters
              </Link>
            ) : (
              <Link href="/admin/inventory/new" className="btn btn-solid mt-6">
                Add the first item
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Item
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    In stock
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-paper-raised/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-[0.8125rem] text-ink-soft md:hidden">
                        {item.category}
                        {item.active ? "" : " · Archived"}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3 text-ink-soft md:table-cell">
                      {item.category}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {formatStockQuantity(item.currentQuantity)}{" "}
                      <span className="text-ink-muted">{item.unit}</span>
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <span
                        className={cn(
                          "pill",
                          item.active ? "border-olive-soft text-olive" : "border-line text-ink-muted",
                        )}
                      >
                        {item.active ? "Active" : "Archived"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[0.75rem] text-ink-muted">
        Quantities are calculated from recorded purchases, usage and adjustments. There are no
        low-stock alerts; check stock manually.
      </p>
    </div>
  );
}
