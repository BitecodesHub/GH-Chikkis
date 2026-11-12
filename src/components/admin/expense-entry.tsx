"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Banknote, LoaderCircle, Package } from "lucide-react";
import { cn } from "@/lib/cn";
import { PAYMENT_METHODS } from "@/lib/types";
import { formatStockQuantity } from "@/lib/quantity";
import { ingredientArt } from "@/lib/ingredients";
import { SALARY_EXPENSE_CATEGORY, SALARY_TILE_NAME } from "@/lib/expense-catalog";
import { ExpenseForm } from "@/components/admin/expense-form";
import { IngredientPhoto } from "@/components/admin/ingredient-photo";
import type { ExpenseFormState } from "@/app/admin/expenses/actions";

export interface StockTile {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentQuantity: number;
}

type EntryAction = (
  previous: ExpenseFormState,
  formData: FormData,
) => Promise<ExpenseFormState>;

const EMPTY: ExpenseFormState = { ok: false };

// Salary is the last tile but never a stock item: selecting it books a plain
// Labour expense through the ordinary expense action.
const SALARY_TILE_ID = "__salary__";

// Mirrors defaultExpenseCategoryForInventory on the server, which the client
// bundle cannot import.
function suggestedCategory(item: StockTile, categories: string[]): string {
  const wanted = /packag/i.test(item.category) ? "Packaging" : "Ingredients/raw materials";
  return categories.find((category) => category === wanted) ?? categories[0] ?? wanted;
}

function Message({ state }: { state: ExpenseFormState }) {
  if (!state.message) return null;
  return (
    <p
      role="alert"
      className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]"
    >
      {state.message}
    </p>
  );
}

function StockPurchaseForm({
  item,
  categories,
  today,
  action,
}: {
  item: StockTile;
  categories: string[];
  today: string;
  action: EntryAction;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="border-t border-line px-5 py-5">
      <input type="hidden" name="itemId" value={item.id} />
      <Message state={state} />
      <div className="grid max-w-4xl gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="stock-quantity" className="label">
            Quantity bought ({item.unit})
          </label>
          <input
            id="stock-quantity"
            name="quantity"
            inputMode="decimal"
            required
            autoFocus
            placeholder="e.g. 5"
            className={cn("field", errors.quantity && "field-error")}
          />
          <p className="help mt-1">
            {formatStockQuantity(item.currentQuantity)} {item.unit} in stock now.
          </p>
        </div>
        <div>
          <label htmlFor="stock-amount" className="label">
            Amount paid (₹)
          </label>
          <input
            id="stock-amount"
            name="amount"
            inputMode="decimal"
            required
            placeholder="0.00"
            className={cn("field", errors.amount && "field-error")}
          />
        </div>
        <div>
          <label htmlFor="stock-date" className="label">
            Date
          </label>
          <input
            id="stock-date"
            name="date"
            type="date"
            defaultValue={today}
            max={today}
            required
            className={cn("field", errors.date && "field-error")}
          />
        </div>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-[0.875rem] font-medium text-ink-soft">
          Supplier, payment and category
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="stock-category" className="label">
              Expense category
            </label>
            <select id="stock-category" name="category" defaultValue={suggestedCategory(item, categories)} className="field">
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stock-supplier" className="label">
              Supplier (optional)
            </label>
            <input id="stock-supplier" name="supplier" maxLength={120} className="field" />
          </div>
          <div>
            <label htmlFor="stock-method" className="label">
              Payment method (optional)
            </label>
            <select id="stock-method" name="paymentMethod" defaultValue="" className="field">
              <option value="">Not recorded</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stock-receipt" className="label">
              Receipt reference (optional)
            </label>
            <input
              id="stock-receipt"
              name="receiptRef"
              maxLength={200}
              className="field"
              placeholder="Bill number or note"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="stock-notes" className="label">
              Note (optional)
            </label>
            <input
              id="stock-notes"
              name="notes"
              maxLength={300}
              className="field"
              placeholder="Left blank, the description reads as a purchase of this item"
            />
          </div>
        </div>
      </details>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-solid btn-sm" disabled={pending}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Package aria-hidden="true" className="size-4" />
          )}
          Record purchase
        </button>
        <p className="text-[0.8125rem] text-ink-muted">
          Adds to stock and books the expense in one step.
        </p>
      </div>
    </form>
  );
}

export function ExpenseEntry({
  items,
  categories,
  today,
  canRecordStock,
  purchaseAction,
  otherAction,
}: {
  items: StockTile[];
  categories: string[];
  today: string;
  canRecordStock: boolean;
  purchaseAction: EntryAction;
  otherAction: EntryAction;
}) {
  const [selected, setSelected] = useState<string>(items[0]?.id ?? "");
  const item = items.find((entry) => entry.id === selected);
  const salarySelected = selected === SALARY_TILE_ID;
  const showStock = canRecordStock && items.length > 0;
  const [mode, setMode] = useState<"stock" | "other">(showStock ? "stock" : "other");

  const tiles: StockTile[] = [
    ...items,
    {
      id: SALARY_TILE_ID,
      name: SALARY_TILE_NAME,
      unit: "expense",
      category: SALARY_EXPENSE_CATEGORY,
      currentQuantity: 0,
    },
  ];

  if (!showStock) {
    return <ExpenseForm categories={categories} today={today} action={otherAction} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="What kind of expense"
          className="flex gap-1 rounded-full bg-paper-deep p-1"
        >
          {(
            [
              { value: "stock", label: "Raw material or packaging" },
              { value: "other", label: "Other expense" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                mode === option.value ? "bg-olive text-paper" : "text-ink-soft hover:bg-white/60",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[0.8125rem] text-ink-muted">
          {mode === "stock"
            ? "Tap what came into the kitchen. Stock and expense are linked."
            : "Labour, transport, utilities — anything that is not stock."}
        </p>
      </div>

      {mode === "stock" ? (
        <section className="surface" aria-labelledby="expense-items">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 id="expense-items" className="font-[family-name:var(--font-display)] text-xl">
                What was bought?
              </h2>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                Tap the item.{" "}
                <Link href="/admin/inventory" className="link-underline">
                  Add more items
                </Link>{" "}
                from Inventory.
              </p>
            </div>
            {salarySelected ? (
              <p className="text-[0.875rem] font-medium">{SALARY_TILE_NAME}</p>
            ) : item ? (
              <p className="text-[0.875rem] font-medium">{item.name}</p>
            ) : null}
          </div>
          <ul className="flex flex-wrap gap-2 p-4">
            {tiles.map((entry) => {
              const art = ingredientArt(entry.name, entry.category);
              const isSalary = entry.id === SALARY_TILE_ID;
              return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSelected(entry.id)}
                  aria-pressed={entry.id === selected}
                  title={`${entry.name} · ${entry.category}`}
                  className={cn(
                    "w-[5.5rem] rounded-xl border p-1.5 text-left transition-colors",
                    entry.id === selected
                      ? "border-brass bg-paper-deep"
                      : "border-line bg-paper-raised hover:border-brass hover:bg-paper-deep",
                  )}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-lg bg-paper-deep">
                    {art ? (
                      <IngredientPhoto art={art} sizes="88px" />
                    ) : (
                      <span className="grid size-full place-items-center text-ink-muted">
                        {isSalary ? (
                          <Banknote aria-hidden="true" className="size-6" />
                        ) : (
                          <Package aria-hidden="true" className="size-6" />
                        )}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 block min-h-[2.1em] text-[0.75rem] font-medium leading-tight">
                    {entry.name}
                  </span>
                  <span className="block text-[0.6875rem] text-ink-muted">{entry.unit}</span>
                </button>
              </li>
              );
            })}
          </ul>
          {salarySelected ? (
            <ExpenseForm
              key={SALARY_TILE_ID}
              categories={categories}
              today={today}
              action={otherAction}
              embedded
              title={SALARY_TILE_NAME}
              hint="Salary is not stock — this books a plain expense under Labour."
              defaults={{ description: SALARY_TILE_NAME, category: SALARY_EXPENSE_CATEGORY }}
            />
          ) : item ? (
            <StockPurchaseForm
              key={item.id}
              item={item}
              categories={categories}
              today={today}
              action={purchaseAction}
            />
          ) : null}
        </section>
      ) : (
        <ExpenseForm categories={categories} today={today} action={otherAction} />
      )}
    </div>
  );
}
