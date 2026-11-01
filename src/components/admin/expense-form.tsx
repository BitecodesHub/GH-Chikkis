"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle, ReceiptText } from "lucide-react";
import { cn } from "@/lib/cn";
import { PAYMENT_METHODS } from "@/lib/types";
import type { ExpenseFormState } from "@/app/admin/expenses/actions";

const EMPTY: ExpenseFormState = { ok: false };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="error-text">
      {message}
    </p>
  );
}

export function ExpenseForm({
  categories,
  today,
  action,
}: {
  categories: string[];
  today: string;
  action: (previous: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const errors = state.errors ?? {};
  const options = categories.length > 0 ? categories : ["Miscellaneous"];

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <p
          role="alert"
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]"
        >
          {state.message}
        </p>
      ) : null}

      <section className="surface p-5 sm:p-6" aria-labelledby="expense-details">
        <h2 id="expense-details" className="font-[family-name:var(--font-display)] text-xl">
          Other expense
        </h2>
        <p className="mt-1 text-[0.875rem] text-ink-soft">
          Labour, transport, utilities, marketing — anything that is not stock you count.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="expense-date" className="label">
              Date
            </label>
            <input
              id="expense-date"
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
            <label htmlFor="expense-amount" className="label">
              Amount (₹)
            </label>
            <input
              id="expense-amount"
              name="amount"
              inputMode="decimal"
              required
              placeholder="0.00"
              className={cn("field", errors.amount && "field-error")}
            />
            <FieldError message={errors.amount} />
          </div>
          <div>
            <label htmlFor="expense-category" className="label">
              Category
            </label>
            <select
              id="expense-category"
              name="category"
              defaultValue={options[0]}
              className={cn("field", errors.category && "field-error")}
            >
              {options.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <FieldError message={errors.category} />
          </div>
          <div>
            <label htmlFor="expense-method" className="label">
              Payment method (optional)
            </label>
            <select
              id="expense-method"
              name="paymentMethod"
              defaultValue=""
              className="field"
            >
              <option value="">Not recorded</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="expense-description" className="label">
              Description
            </label>
            <input
              id="expense-description"
              name="description"
              maxLength={500}
              required
              className={cn("field", errors.description && "field-error")}
              placeholder="What was this expense for?"
            />
            <FieldError message={errors.description} />
          </div>
          <div>
            <label htmlFor="expense-supplier" className="label">
              Supplier or payee (optional)
            </label>
            <input
              id="expense-supplier"
              name="supplier"
              maxLength={120}
              className={cn("field", errors.supplier && "field-error")}
            />
            <FieldError message={errors.supplier} />
          </div>
          <div>
            <label htmlFor="expense-receipt" className="label">
              Receipt reference (optional)
            </label>
            <input
              id="expense-receipt"
              name="receiptRef"
              maxLength={200}
              className={cn("field", errors.receiptRef && "field-error")}
              placeholder="Bill number or note"
            />
            <FieldError message={errors.receiptRef} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-solid" disabled={pending}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ReceiptText aria-hidden="true" className="size-4" />
          )}
          Record expense
        </button>
        <Link href="/admin/expenses" className="btn btn-outline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
