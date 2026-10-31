"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import { PAYMENT_METHODS } from "@/lib/types";
import type { InventoryFormState } from "@/app/admin/inventory/actions";
import { formatStockQuantity } from "@/lib/quantity";

type InventoryAction = (
  previous: InventoryFormState,
  formData: FormData,
) => Promise<InventoryFormState>;

const EMPTY: InventoryFormState = { ok: false };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="error-text">
      {message}
    </p>
  );
}

function Result({ state }: { state: InventoryFormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "border px-4 py-3 text-[0.875rem]",
        state.ok ? "border-olive-soft bg-paper-raised" : "border-terracotta bg-paper-raised",
      )}
    >
      {state.message}
    </p>
  );
}

function PurchaseForm({
  itemId,
  today,
  categories,
  defaultCategory,
  action,
}: {
  itemId: string;
  today: string;
  categories: string[];
  defaultCategory: string;
  action: InventoryAction;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const errors = state.errors ?? {};
  const options = categories.length > 0 ? categories : ["Ingredients/raw materials", "Packaging", "Miscellaneous"];
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="itemId" value={itemId} />
      <Result state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="purchase-quantity" className="label">
            Quantity purchased
          </label>
          <input
            id="purchase-quantity"
            name="quantity"
            inputMode="decimal"
            required
            placeholder="e.g. 5"
            className={cn("field", errors.quantity && "field-error")}
          />
          <FieldError message={errors.quantity} />
        </div>
        <div>
          <label htmlFor="purchase-amount" className="label">
            Amount paid (₹)
          </label>
          <input
            id="purchase-amount"
            name="amount"
            inputMode="decimal"
            required
            placeholder="0.00"
            className={cn("field", errors.amount && "field-error")}
          />
          <FieldError message={errors.amount} />
        </div>
        <div>
          <label htmlFor="purchase-date" className="label">
            Purchase date
          </label>
          <input
            id="purchase-date"
            name="date"
            type="date"
            defaultValue={today}
            max={today}
            required
            className={cn("field", errors.date && "field-error")}
          />
          <FieldError message={errors.date} />
        </div>
        <div>
          <label htmlFor="purchase-category" className="label">
            Expense category
          </label>
          <select id="purchase-category" name="category" defaultValue={defaultCategory} className="field">
            {options.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <p className="help">The purchase is recorded as an expense in this category.</p>
        </div>
        <div>
          <label htmlFor="purchase-supplier" className="label">
            Supplier (optional)
          </label>
          <input id="purchase-supplier" name="supplier" maxLength={120} className="field" />
        </div>
        <div>
          <label htmlFor="purchase-method" className="label">
            Payment method (optional)
          </label>
          <select id="purchase-method" name="paymentMethod" defaultValue="" className="field">
            <option value="">Not recorded</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="purchase-receipt" className="label">
            Receipt reference (optional)
          </label>
          <input
            id="purchase-receipt"
            name="receiptRef"
            maxLength={200}
            className="field"
            placeholder="Bill number or note"
          />
        </div>
        <div>
          <label htmlFor="purchase-notes" className="label">
            Notes (optional)
          </label>
          <input id="purchase-notes" name="notes" maxLength={300} className="field" />
        </div>
      </div>
      <button type="submit" className="btn btn-solid btn-sm" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="size-4" />
        )}
        Record purchase
      </button>
    </form>
  );
}

function UsageForm({
  itemId,
  unit,
  currentQuantity,
  today,
  action,
}: {
  itemId: string;
  unit: string;
  currentQuantity: number;
  today: string;
  action: InventoryAction;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const errors = state.errors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="itemId" value={itemId} />
      <Result state={state} />
      <p className="text-[0.875rem] text-ink-soft">
        Available: <strong className="font-medium text-ink">{formatStockQuantity(currentQuantity)} {unit}</strong>.
        Usage reduces stock only; it does not create a second expense.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="usage-quantity" className="label">
            Quantity used
          </label>
          <input
            id="usage-quantity"
            name="quantity"
            inputMode="decimal"
            required
            placeholder="e.g. 0.5"
            className={cn("field", errors.quantity && "field-error")}
          />
          <FieldError message={errors.quantity} />
        </div>
        <div>
          <label htmlFor="usage-date" className="label">
            Usage date
          </label>
          <input
            id="usage-date"
            name="date"
            type="date"
            defaultValue={today}
            max={today}
            required
            className={cn("field", errors.date && "field-error")}
          />
          <FieldError message={errors.date} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="usage-notes" className="label">
            Notes (optional)
          </label>
          <input
            id="usage-notes"
            name="notes"
            maxLength={300}
            className="field"
            placeholder="What was made or why the stock was used"
          />
        </div>
      </div>
      <button type="submit" className="btn btn-solid btn-sm" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="size-4" />
        )}
        Record usage
      </button>
    </form>
  );
}

function AdjustmentForm({
  itemId,
  unit,
  currentQuantity,
  today,
  action,
}: {
  itemId: string;
  unit: string;
  currentQuantity: number;
  today: string;
  action: InventoryAction;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const errors = state.errors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="itemId" value={itemId} />
      <Result state={state} />
      <p className="text-[0.875rem] text-ink-soft">
        Recorded stock: <strong className="font-medium text-ink">{formatStockQuantity(currentQuantity)} {unit}</strong>.
        Enter the quantity you actually counted; the difference becomes an adjustment.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="adjustment-counted" className="label">
            Counted quantity
          </label>
          <input
            id="adjustment-counted"
            name="countedQuantity"
            inputMode="decimal"
            required
            defaultValue={String(currentQuantity)}
            className={cn("field", errors.countedQuantity && "field-error")}
          />
          <FieldError message={errors.countedQuantity} />
        </div>
        <div>
          <label htmlFor="adjustment-date" className="label">
            Count date
          </label>
          <input
            id="adjustment-date"
            name="date"
            type="date"
            defaultValue={today}
            max={today}
            required
            className={cn("field", errors.date && "field-error")}
          />
          <FieldError message={errors.date} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="adjustment-reason" className="label">
            Reason
          </label>
          <input
            id="adjustment-reason"
            name="reason"
            maxLength={300}
            required
            className={cn("field", errors.reason && "field-error")}
            placeholder="Stock check, spillage, correction after a count"
          />
          <FieldError message={errors.reason} />
        </div>
      </div>
      <button type="submit" className="btn btn-solid btn-sm" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="size-4" />
        )}
        Save adjustment
      </button>
    </form>
  );
}

export function InventoryMovementForms({
  itemId,
  unit,
  currentQuantity,
  today,
  categories,
  defaultCategory,
  purchaseAction,
  usageAction,
  adjustmentAction,
}: {
  itemId: string;
  unit: string;
  currentQuantity: number;
  today: string;
  categories: string[];
  defaultCategory: string;
  purchaseAction: InventoryAction;
  usageAction: InventoryAction;
  adjustmentAction: InventoryAction;
}) {
  const [tab, setTab] = useState<"purchase" | "usage" | "adjustment">("purchase");
  const tabs = [
    { value: "purchase", label: "Purchase" },
    { value: "usage", label: "Usage" },
    { value: "adjustment", label: "Adjustment" },
  ] as const;

  return (
    <div className="mt-5">
      <div role="tablist" aria-label="Stock movements" className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            id={`movement-tab-${entry.value}`}
            aria-selected={tab === entry.value}
            aria-controls={`movement-panel-${entry.value}`}
            onClick={() => setTab(entry.value)}
            className={cn("btn btn-sm", tab === entry.value ? "btn-solid" : "btn-outline")}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`movement-panel-${tab}`}
        aria-labelledby={`movement-tab-${tab}`}
        className="mt-5"
      >
        {tab === "purchase" ? (
          <PurchaseForm
            itemId={itemId}
            today={today}
            categories={categories}
            defaultCategory={defaultCategory}
            action={purchaseAction}
          />
        ) : null}
        {tab === "usage" ? (
          <UsageForm
            itemId={itemId}
            unit={unit}
            currentQuantity={currentQuantity}
            today={today}
            action={usageAction}
          />
        ) : null}
        {tab === "adjustment" ? (
          <AdjustmentForm
            itemId={itemId}
            unit={unit}
            currentQuantity={currentQuantity}
            today={today}
            action={adjustmentAction}
          />
        ) : null}
      </div>
    </div>
  );
}
