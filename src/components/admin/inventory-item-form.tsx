"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InventoryFormState } from "@/app/admin/inventory/actions";
import type { InventoryItem } from "@/lib/types";

const EMPTY: InventoryFormState = { ok: false };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="error-text">
      {message}
    </p>
  );
}

export function InventoryItemForm({
  mode,
  item,
  categories,
  units,
  action,
}: {
  mode: "create" | "edit";
  item?: InventoryItem;
  categories: string[];
  units: readonly string[];
  action: (
    previous: InventoryFormState,
    formData: FormData,
  ) => Promise<InventoryFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn(
            "border px-4 py-3 text-[0.875rem]",
            state.ok ? "border-olive-soft bg-paper-raised" : "border-terracotta bg-paper-raised",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="inventory-name" className="label">
            Item name
          </label>
          <input
            id="inventory-name"
            name="name"
            defaultValue={item?.name ?? ""}
            maxLength={120}
            required
            className={cn("field", errors.name && "field-error")}
            placeholder="Ghee, sesame seeds, 250 g boxes…"
          />
          <FieldError message={errors.name} />
        </div>
        <div>
          <label htmlFor="inventory-category" className="label">
            Category
          </label>
          <input
            id="inventory-category"
            name="category"
            defaultValue={item?.category ?? categories[0] ?? "Ingredients/raw materials"}
            list="inventory-category-options"
            maxLength={80}
            className={cn("field", errors.category && "field-error")}
          />
          <datalist id="inventory-category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <FieldError message={errors.category} />
        </div>
        <div>
          <label htmlFor="inventory-unit" className="label">
            Unit of measurement
          </label>
          <input
            id="inventory-unit"
            name="unit"
            defaultValue={item?.unit ?? "kg"}
            list="inventory-unit-options"
            maxLength={30}
            required
            className={cn("field", errors.unit && "field-error")}
          />
          <datalist id="inventory-unit-options">
            {units.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <FieldError message={errors.unit} />
        </div>
        {mode === "create" ? (
          <div>
            <label htmlFor="inventory-opening" className="label">
              Opening stock (optional)
            </label>
            <input
              id="inventory-opening"
              name="openingQuantity"
              inputMode="decimal"
              defaultValue=""
              placeholder="0"
              className={cn("field", errors.openingQuantity && "field-error")}
            />
            <p className="help">
              Recorded as an adjustment named “Opening stock” in the movement history.
            </p>
            <FieldError message={errors.openingQuantity} />
          </div>
        ) : (
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 text-[0.9375rem]">
              <input
                type="checkbox"
                name="active"
                defaultChecked={item?.active ?? true}
                className="size-4 accent-olive"
              />
              Active — available for purchases and usage
            </label>
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-solid btn-sm" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="size-4" />
        )}
        {mode === "create" ? "Create item" : "Save item details"}
      </button>
    </form>
  );
}
