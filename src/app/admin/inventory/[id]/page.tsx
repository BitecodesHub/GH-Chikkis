import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, History } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { InventoryItemForm } from "@/components/admin/inventory-item-form";
import { InventoryMovementForms } from "@/components/admin/inventory-movement-forms";
import { requirePermission } from "@/lib/auth/session";
import { expenseCategories } from "@/lib/expenses";
import {
  INVENTORY_MOVEMENT_LABELS,
  INVENTORY_UNITS,
  defaultExpenseCategoryForInventory,
  getInventoryDetail,
  inventoryCategories,
} from "@/lib/inventory";
import { formatStockQuantity } from "@/lib/quantity";
import { formatDateDDMMYYYY, formatDateTime, businessToday } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/cn";
import {
  recordAdjustmentAction,
  recordPurchaseAction,
  recordUsageAction,
  updateInventoryItemAction,
} from "../actions";

export const metadata: Metadata = { title: "Inventory item" };

export default async function InventoryItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("inventory.manage");
  const { id } = await params;
  const query = await searchParams;
  const detail = await getInventoryDetail(id);
  if (!detail) notFound();
  const { item, movements } = detail;
  const [categories, settingsCategories] = await Promise.all([
    inventoryCategories(),
    expenseCategories(),
  ]);
  const defaultCategory = defaultExpenseCategoryForInventory(item.category);
  const purchaseCategories = settingsCategories.includes(defaultCategory)
    ? settingsCategories
    : [defaultCategory, ...settingsCategories];
  const created = query.created === "1";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Inventory"
        title={item.name}
        description={`${item.category} · measured in ${item.unit}. Stock is calculated from the movement history below.`}
        actions={
          <Link href="/admin/inventory" className="btn btn-outline btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to inventory
          </Link>
        }
      />

      {created ? (
        <p role="status" className="border border-olive-soft bg-paper-raised px-4 py-3 text-[0.875rem]">
          Item created. Record a purchase or usage below as stock moves.
        </p>
      ) : null}

      {!item.active ? (
        <p role="alert" className="border border-brass bg-paper-raised px-4 py-3 text-[0.875rem]">
          This item is archived. Its history stays available; reactivate it in Item details to
          record new movements.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Stock summary">
        <div className="surface p-5 sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              In stock now
            </p>
            <Boxes aria-hidden="true" className="size-4 text-brass" />
          </div>
          <p className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none">
            {formatStockQuantity(item.currentQuantity)}
            <span className="ml-2 text-2xl text-ink-muted">{item.unit}</span>
          </p>
          <p className="mt-3 text-[0.8125rem] text-ink-muted">
            {movements.length} {movements.length === 1 ? "movement" : "movements"} recorded
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Status
          </p>
          <p className="mt-4">
            <span
              className={cn(
                "pill",
                item.active ? "border-olive-soft text-olive" : "border-line text-ink-muted",
              )}
            >
              {item.active ? "Active" : "Archived"}
            </span>
          </p>
          <p className="mt-3 text-[0.8125rem] text-ink-soft">{item.category}</p>
          <p className="mt-1 text-[0.75rem] text-ink-muted">
            Updated {formatDateTime(item.updatedAt)}
          </p>
        </div>
      </section>

      {item.active ? (
        <section className="surface p-5 sm:p-6" aria-labelledby="record-movement">
          <div className="flex items-center gap-2.5">
            <History aria-hidden="true" className="size-4 text-brass" />
            <h2 id="record-movement" className="font-[family-name:var(--font-display)] text-xl">
              Record a movement
            </h2>
          </div>
          <p className="mt-2 text-[0.875rem] text-ink-soft">
            A purchase creates an expense and adds stock. Usage removes stock without a second
            expense. An adjustment reconciles a manual count.
          </p>
          <InventoryMovementForms
            itemId={item.id}
            unit={item.unit}
            currentQuantity={item.currentQuantity}
            today={businessToday()}
            categories={purchaseCategories}
            defaultCategory={defaultCategory}
            purchaseAction={recordPurchaseAction}
            usageAction={recordUsageAction}
            adjustmentAction={recordAdjustmentAction}
          />
        </section>
      ) : null}

      <section className="surface" aria-labelledby="movement-history">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="movement-history" className="font-[family-name:var(--font-display)] text-xl">
            Movement history
          </h2>
          <span className="meta">{movements.length} recorded</span>
        </div>
        {movements.length === 0 ? (
          <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
            Purchases, usage and adjustments will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Movement
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Change
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                    Notes
                  </th>
                  <th scope="col" className="hidden px-5 py-3 text-right font-semibold md:table-cell">
                    Expense
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold lg:table-cell">
                    Recorded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {movements.map((movement) => {
                  const negative = movement.type === "USAGE" || movement.quantity < 0;
                  const sign = negative ? "-" : "+";
                  const amount = Math.abs(movement.quantity);
                  return (
                    <tr key={movement.id} className="hover:bg-paper-raised/60">
                      <td className="px-5 py-3 whitespace-nowrap">
                        {formatDateDDMMYYYY(movement.date)}
                        <p className="mt-0.5 text-[0.75rem] text-ink-muted md:hidden">
                          {INVENTORY_MOVEMENT_LABELS[movement.type]}
                          {movement.notes ? ` · ${movement.notes}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "pill",
                            movement.type === "PURCHASE"
                              ? "border-olive-soft text-olive"
                              : movement.type === "USAGE"
                                ? "border-terracotta text-terracotta"
                                : "border-brass text-brass",
                          )}
                        >
                          {INVENTORY_MOVEMENT_LABELS[movement.type]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className={negative ? "text-terracotta" : "text-olive"}>
                          {sign}
                          {formatStockQuantity(amount)} {item.unit}
                        </span>
                      </td>
                      <td className="hidden px-5 py-3 text-[0.875rem] text-ink-soft md:table-cell">
                        {movement.notes || "—"}
                      </td>
                      <td className="hidden px-5 py-3 text-right whitespace-nowrap md:table-cell">
                        {movement.expense ? (
                          <span>
                            {formatINR(movement.expense.amountPaise)}
                            {movement.expense.supplier ? (
                              <span className="block text-[0.75rem] text-ink-muted">
                                {movement.expense.supplier}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="hidden px-5 py-3 text-[0.8125rem] text-ink-muted lg:table-cell">
                        {movement.createdByName ?? "Team member"}
                        <span className="block text-[0.75rem]">
                          {formatDateTime(movement.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-5 py-3 text-[0.75rem] text-ink-muted">
          Movements are permanent. To correct a mistake, record a new adjustment with a reason.
        </p>
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="item-details">
        <h2 id="item-details" className="font-[family-name:var(--font-display)] text-xl">
          Item details
        </h2>
        <p className="mt-2 text-[0.875rem] text-ink-soft">
          Rename, change the category or unit, or archive the item. Archiving keeps all history.
        </p>
        <div className="mt-5">
          <InventoryItemForm
            mode="edit"
            item={item}
            categories={categories}
            units={INVENTORY_UNITS}
            action={updateInventoryItemAction}
          />
        </div>
      </section>
    </div>
  );
}
