"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { saveCustomerAction, type CustomerFormState } from "@/app/admin/customers/actions";
import { cn } from "@/lib/cn";
import type { Customer } from "@/lib/types";

const EMPTY_STATE: CustomerFormState = { ok: false };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="error-text">
      {message}
    </p>
  );
}

export function CustomerForm({
  mode,
  customer,
  defaults,
  next,
}: {
  mode: "create" | "edit";
  customer?: Customer;
  defaults?: { name?: string; phone?: string; email?: string };
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(saveCustomerAction, EMPTY_STATE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="intent" value={mode} />
      {customer ? <input type="hidden" name="customerId" value={customer.id} /> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.message && (!state.errors || state.existingId) ? (
        <p
          role={state.ok ? "status" : "alert"}
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]"
        >
          {state.message}
          {state.existingId ? (
            <>
              {" "}
              <Link href={`/admin/customers/${state.existingId}`} className="link-underline">
                Open the existing profile
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : null}

      <section className="surface p-5 sm:p-6" aria-labelledby="customer-contact">
        <h2 id="customer-contact" className="font-[family-name:var(--font-display)] text-xl">
          Contact
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="customer-name" className="label">
              Full name
            </label>
            <input
              id="customer-name"
              name="name"
              defaultValue={customer?.name ?? defaults?.name ?? ""}
              maxLength={120}
              required
              className={cn("field", errors.name && "field-error")}
            />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label htmlFor="customer-phone" className="label">
              Phone number
            </label>
            <input
              id="customer-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={customer?.phoneOriginal ?? defaults?.phone ?? ""}
              maxLength={20}
              required
              className={cn("field", errors.phone && "field-error")}
            />
            <p className="help">One profile per phone number. Include +91 for Indian numbers.</p>
            <FieldError message={state.existingId ? undefined : errors.phone} />
          </div>
          <div>
            <label htmlFor="customer-email" className="label">
              Email (optional)
            </label>
            <input
              id="customer-email"
              name="email"
              type="email"
              defaultValue={customer?.email ?? defaults?.email ?? ""}
              maxLength={200}
              className={cn("field", errors.email && "field-error")}
            />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label htmlFor="customer-company" className="label">
              Company (optional)
            </label>
            <input
              id="customer-company"
              name="company"
              defaultValue={customer?.company ?? ""}
              maxLength={160}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="customer-gstin" className="label">
              GSTIN (optional)
            </label>
            <input
              id="customer-gstin"
              name="gstin"
              defaultValue={customer?.gstin ?? ""}
              maxLength={20}
              className="field"
            />
            <p className="help">Entered manually only when the customer provides it.</p>
          </div>
        </div>
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="customer-notes">
        <h2 id="customer-notes" className="font-[family-name:var(--font-display)] text-xl">
          Internal notes
        </h2>
        <p className="mt-1 text-[0.875rem] text-ink-soft">
          Only visible to people with customer or enquiry access. Never shown publicly.
        </p>
        <div className="mt-5">
          <label htmlFor="customer-notes-field" className="label">
            Notes and special instructions
          </label>
          <textarea
            id="customer-notes-field"
            name="notes"
            defaultValue={customer?.notes ?? ""}
            maxLength={4000}
            rows={4}
            className="field"
          />
        </div>
        {mode === "edit" ? (
          <div className="mt-5 flex items-start gap-3">
            <input
              id="customer-archived"
              name="archived"
              type="checkbox"
              defaultChecked={customer?.archived}
              className="mt-1 size-4 accent-olive"
            />
            <div>
              <label htmlFor="customer-archived" className="text-[0.9375rem] font-medium">
                Archive this customer
              </label>
              <p className="help">
                Archived profiles are hidden from pickers, but their orders and history stay
                intact.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur">
        <p aria-live="polite" className="text-[0.8125rem] text-ink-muted">
          {pending
            ? "Saving…"
            : state.ok
              ? state.message
              : mode === "create"
                ? "Check for an existing profile before saving."
                : "Changes are recorded in the audit log."}
        </p>
        <div className="flex gap-2">
          <Link
            href={customer ? `/admin/customers/${customer.id}` : "/admin/customers"}
            className="btn btn-quiet btn-sm"
          >
            Cancel
          </Link>
          <button type="submit" disabled={pending} className="btn btn-solid btn-sm">
            {pending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-4" />
            )}
            {mode === "create" ? "Create customer" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
