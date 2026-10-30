"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitEnquiry, type EnquiryFormState } from "@/app/(site)/contact/actions";

const INITIAL: EnquiryFormState = { ok: false };

export function EnquiryForm({
  startedAt,
  today,
  whatsappHref,
  productContext,
  formNote,
}: {
  startedAt: string;
  today: string;
  whatsappHref: string | null;
  productContext: { slug: string; packaging: string; label: string } | null;
  formNote: string;
}) {
  const [state, formAction, pending] = useActionState(submitEnquiry, INITIAL);
  const [notSure, setNotSure] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.message || state.errors) {
      statusRef.current?.focus();
    }
  }, [state]);

  if (state.ok) {
    return (
      <div className="surface p-7 md:p-9" role="status" aria-live="polite">
        <p className="eyebrow">Enquiry received</p>
        <h2 className="display-m mt-4">Thank you.</h2>
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">
          {state.message}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/contact#enquiry" className="btn btn-outline">
            Send another enquiry
          </Link>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-solid"
            >
              Continue on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  const errors = state.errors ?? {};
  const hasFieldErrors = Object.keys(errors).length > 0;

  return (
    <form action={formAction} className="surface p-6 md:p-8" aria-busy={pending}>
      <div
        ref={statusRef}
        tabIndex={-1}
        aria-live="polite"
        className="empty:hidden"
      >
        {state.message ? (
          <div role="alert" className="mb-6 border border-terracotta bg-paper p-4 text-[0.9375rem] text-ink">
            {state.message}
          </div>
        ) : null}
        {hasFieldErrors ? (
          <div role="alert" className="mb-6 border border-terracotta bg-paper p-4 text-[0.9375rem] text-ink">
            Please check the highlighted fields.
          </div>
        ) : null}
      </div>

      {productContext ? (
        <div className="mb-6 border-l-2 border-brass bg-paper px-4 py-3">
          <p className="meta">Enquiring about</p>
          <p className="mt-1 text-[0.9375rem] font-semibold">{productContext.label}</p>
          <p className="meta mt-1">
            Not quite right?{" "}
            <Link href="/contact#enquiry" className="link-underline">
              Start a general enquiry
            </Link>
          </p>
        </div>
      ) : null}

      <input type="hidden" name="startedAt" value={startedAt} />
      {productContext ? (
        <>
          <input type="hidden" name="product" value={productContext.slug} />
          <input type="hidden" name="packaging" value={productContext.packaging} />
        </>
      ) : null}

      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="mb-6 text-[0.9375rem] leading-relaxed text-ink-soft">{formNote}</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            className={errors.name ? "field field-error" : "field"}
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name ? (
            <p className="error-text" id="name-error">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            className={errors.phone ? "field field-error" : "field"}
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "phone-error" : "phone-help"}
          />
          {errors.phone ? (
            <p className="error-text" id="phone-error">
              {errors.phone}
            </p>
          ) : (
            <p className="help" id="phone-help">
              We reply on this number by phone or WhatsApp.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            className={errors.email ? "field field-error" : "field"}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <p className="error-text" id="email-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="quantityKg">
            Quantity in kilograms
          </label>
          <input
            className={errors.quantityKg ? "field field-error" : "field"}
            id="quantityKg"
            name="quantityKg"
            type="number"
            inputMode="decimal"
            min="0.25"
            step="0.25"
            required
            placeholder="e.g. 5"
            aria-invalid={errors.quantityKg ? true : undefined}
            aria-describedby={errors.quantityKg ? "quantity-error" : "quantity-help"}
          />
          {errors.quantityKg ? (
            <p className="error-text" id="quantity-error">
              {errors.quantityKg}
            </p>
          ) : (
            <p className="help" id="quantity-help">
              An approximate quantity is fine.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="expectedDate">
            Expected date
          </label>
          <input
            className={errors.expectedDate ? "field field-error" : "field"}
            id="expectedDate"
            name="expectedDate"
            type="date"
            min={today}
            disabled={notSure}
            required={!notSure}
            aria-invalid={errors.expectedDate ? true : undefined}
            aria-describedby={errors.expectedDate ? "date-error" : undefined}
          />
          {errors.expectedDate ? (
            <p className="error-text" id="date-error">
              {errors.expectedDate}
            </p>
          ) : null}
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.875rem] text-ink-soft">
            <input
              type="checkbox"
              name="notSure"
              value="1"
              checked={notSure}
              onChange={(event) => setNotSure(event.target.checked)}
              className="size-4 accent-olive"
            />
            Not sure yet
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="meta max-w-xs">
          Your details are used to respond to this enquiry. See our{" "}
          <Link href="/privacy" className="link-underline">
            privacy policy
          </Link>
          .
        </p>
        <button type="submit" className="btn btn-solid" disabled={pending}>
          {pending ? "Sending…" : "Send enquiry"}
        </button>
      </div>
    </form>
  );
}
