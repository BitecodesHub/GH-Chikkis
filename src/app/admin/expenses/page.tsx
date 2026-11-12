import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, ReceiptText, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FilterNav } from "@/components/admin/filter-nav";
import { IngredientPhoto } from "@/components/admin/ingredient-photo";
import { requirePermission } from "@/lib/auth/session";
import { expenseCategories, listExpenses } from "@/lib/expenses";
import { ingredientArt } from "@/lib/ingredients";
import { dateRangeFromParams, formatDateDDMMYYYY, rangeLabel } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { Expense } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";
import { DeleteExpense } from "./delete-expense";

export const metadata: Metadata = { title: "Expenses" };

const PAGE_SIZE = 30;

const SOURCE_LABELS: Record<Expense["source"], string> = {
  MANUAL: "Manual",
  PURCHASE: "Stock purchase",
  GIFT: "Gifting",
};

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("expenses.manage");
  const canManageInventory = hasPermission(user, "inventory.manage");
  const params = await searchParams;
  const range = dateRangeFromParams(params);
  const category = typeof params.category === "string" ? params.category : "";
  const sourceValue = typeof params.source === "string" ? params.source : "";
  const source = ["MANUAL", "PURCHASE", "GIFT"].includes(sourceValue)
    ? (sourceValue as Expense["source"])
    : "";
  const query = typeof params.q === "string" ? params.q : "";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);
  const [categories, result] = await Promise.all([
    expenseCategories(),
    listExpenses({
      from: range.from,
      to: range.to,
      category,
      source,
      query,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(Math.ceil(result.total / PAGE_SIZE), 1);
  const created = params.created === "1";
  const filtersActive =
    Boolean(query || category || source) || range.preset !== "month";

  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    search.set("preset", range.preset);
    if (range.preset === "custom") {
      search.set("from", formatDateDDMMYYYY(range.from));
      search.set("to", formatDateDDMMYYYY(range.to));
    }
    if (category) search.set("category", category);
    if (source) search.set("source", source);
    if (query) search.set("q", query);
    if (nextPage > 1) search.set("page", String(nextPage));
    return `/admin/expenses?${search.toString()}`;
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Money"
        title="Expenses"
        description="Every recorded cost in one place. Stock purchases come from Inventory with their expense linked; gifting costs are created with gift orders."
        actions={
          <Link href="/admin/expenses/new" className="btn btn-solid btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            Record expense
          </Link>
        }
      />

      {created ? (
        <p role="status" className="border border-olive-soft bg-paper-raised px-4 py-3 text-[0.875rem]">
          Expense recorded. Reports update automatically.
        </p>
      ) : null}

      <section className="surface" aria-labelledby="expense-list">
        <div className="border-b border-line px-5 py-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <label htmlFor="expense-preset" className="label">
                Date range
              </label>
              <select
                id="expense-preset"
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
              <label htmlFor="expense-from" className="label">
                From
              </label>
              <input
                id="expense-from"
                name="from"
                defaultValue={formatDateDDMMYYYY(range.from)}
                placeholder="DD/MM/YYYY"
                data-autosubmit="blur"
                className="field w-32"
              />
            </div>
            <div>
              <label htmlFor="expense-to" className="label">
                To
              </label>
              <input
                id="expense-to"
                name="to"
                defaultValue={formatDateDDMMYYYY(range.to)}
                placeholder="DD/MM/YYYY"
                data-autosubmit="blur"
                className="field w-32"
              />
            </div>
            <div>
              <label htmlFor="expense-filter-category" className="label">
                Category
              </label>
              <select
                id="expense-filter-category"
                name="category"
                defaultValue={category}
                className="field min-w-40"
              >
                <option value="">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-source" className="label">
                Source
              </label>
              <select id="expense-source" name="source" defaultValue={source} className="field min-w-36">
                <option value="">All sources</option>
                <option value="MANUAL">Manual</option>
                <option value="PURCHASE">Stock purchase</option>
                <option value="GIFT">Gifting</option>
              </select>
            </div>
            <div className="min-w-52 flex-1">
              <label htmlFor="expense-search" className="label">
                Search
              </label>
              <div className="flex">
                <span className="field-adorn">
                  <Search aria-hidden="true" className="size-4 text-ink-muted" />
                </span>
                <input
                  id="expense-search"
                  name="q"
                  defaultValue={query}
                  placeholder="Description, supplier or receipt"
                  className="field border-l-0"
                />
              </div>
            </div>
            <FilterNav />
            <button type="submit" className="sr-only">
              Apply filters
            </button>
            {filtersActive ? (
              <Link href="/admin/expenses" className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </form>
          <p className="mt-2 text-[0.75rem] text-ink-muted">
            From and To apply only to a custom range. Showing {rangeLabel(range)}.
          </p>
        </div>

        <div className="grid gap-4 border-b border-line px-5 py-4 sm:grid-cols-3">
          <div>
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Filtered total
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none">
              {formatINR(result.totalPaise)}
            </p>
          </div>
          <div>
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Entries
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none">
              {result.total}
            </p>
          </div>
          <div>
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Period
            </p>
            <p className="mt-2 text-[0.9375rem]">{rangeLabel(range)}</p>
            <p className="text-[0.75rem] text-ink-muted">
              {formatDateDDMMYYYY(range.from)} – {formatDateDDMMYYYY(range.to)}
            </p>
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <ReceiptText aria-hidden="true" className="mx-auto size-7 text-brass" />
            <p className="display-s mt-4">
              {filtersActive ? "No expenses match these filters." : "No expenses yet."}
            </p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              {filtersActive
                ? `Nothing recorded for ${rangeLabel(range)} with these filters. Try a wider date range.`
                : "Record a manual expense, or buy stock from Inventory so the expense is linked."}
            </p>
            {filtersActive ? (
              <Link href="/admin/expenses" className="btn btn-outline mt-6">
                Clear filters
              </Link>
            ) : (
              <Link href="/admin/expenses/new" className="btn btn-solid mt-6">
                Record an expense
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Expense
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Supplier
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Source
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Amount
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((expense) => {
                  const art = ingredientArt(expense.description, expense.category);
                  return (
                  <tr key={expense.id} className="hover:bg-paper-raised/60">
                    <td className="px-5 py-3 whitespace-nowrap">
                      {formatDateDDMMYYYY(expense.date)}
                      <p className="mt-0.5 text-[0.75rem] text-ink-muted md:hidden">
                        {expense.source === "PURCHASE" ? "Stock purchase" : SOURCE_LABELS[expense.source]}
                        {expense.supplier ? ` · ${expense.supplier}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        {art ? (
                          <span className="relative block size-10 shrink-0 overflow-hidden rounded-md bg-paper-deep">
                            <IngredientPhoto art={art} sizes="40px" />
                          </span>
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-medium">{expense.category}</p>
                          <p className="text-[0.8125rem] text-ink-soft">{expense.description}</p>
                          {expense.receiptRef ? (
                            <p className="text-[0.75rem] text-ink-muted">Receipt {expense.receiptRef}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">{expense.supplier || "—"}</td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <span
                        className={cn(
                          "pill",
                          expense.source === "PURCHASE"
                            ? "border-olive-soft text-olive"
                            : expense.source === "GIFT"
                              ? "border-brass text-brass"
                              : "border-line text-ink-muted",
                        )}
                      >
                        {SOURCE_LABELS[expense.source]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {formatINR(expense.amountPaise)}
                    </td>
                    <td className="px-5 py-3">
                      {expense.source === "GIFT" || expense.giftOrderId ? (
                        expense.giftOrderId ? (
                          <Link href={`/admin/orders/${encodeURIComponent(expense.giftOrderId)}`} className="text-xs underline">
                            Use order deletion
                          </Link>
                        ) : <span className="text-xs text-ink-muted">Use order deletion</span>
                      ) : (expense.source === "PURCHASE" || expense.inventoryItemId) && !canManageInventory ? (
                        <span className="text-xs text-ink-muted">Inventory permission required</span>
                      ) : (
                        <DeleteExpense
                          id={expense.id}
                          description={`${expense.description || expense.category} (${formatINR(expense.amountPaise)})`}
                          purchase={expense.source === "PURCHASE" || Boolean(expense.inventoryItemId)}
                        />
                      )}
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

      <p className="text-[0.75rem] text-ink-muted">
        Raw-material usage updates stock only and never creates a second expense. Gifting costs are
        included in expenses and excluded from revenue.
      </p>
    </div>
  );
}
