"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { submitEnquiry, type EnquiryFormState } from "@/app/(site)/contact/actions";

const INITIAL: EnquiryFormState = { ok: false };

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      size: "flexible";
      theme: "light";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

function turnstileApi(): TurnstileApi | null {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile ?? null;
}

export function EnquiryForm({
  startedAt,
  whatsappHref,
  productContext,
  formNote,
  turnstileSiteKey,
  turnstileNonce,
}: {
  startedAt: string;
  whatsappHref: string | null;
  productContext: { slug: string; packaging: string; label: string } | null;
  formNote: string;
  turnstileSiteKey?: string;
  turnstileNonce?: string;
}) {
  const [state, formAction, pending] = useActionState(submitEnquiry, INITIAL);
  const statusRef = useRef<HTMLDivElement>(null);
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileInput = useRef<HTMLInputElement>(null);
  const turnstileWidget = useRef<string | null>(null);

  useEffect(() => {
    if (state.message || state.errors) {
      statusRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    const container = turnstileContainer.current;
    if (!container) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || turnstileWidget.current) return;
      const api = turnstileApi();
      if (!api) return;
      turnstileWidget.current = api.render(container, {
        sitekey: turnstileSiteKey,
        size: "flexible",
        theme: "light",
        callback: (token) => {
          if (turnstileInput.current) turnstileInput.current.value = token;
        },
        "expired-callback": () => {
          if (turnstileInput.current) turnstileInput.current.value = "";
        },
        "error-callback": () => {
          if (turnstileInput.current) turnstileInput.current.value = "";
        },
      });
    };

    let script: HTMLScriptElement | null = null;
    if (turnstileApi()) {
      render();
    } else {
      script = document.querySelector<HTMLScriptElement>("script[data-gh-turnstile]");
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.ghTurnstile = "true";
        if (turnstileNonce) script.nonce = turnstileNonce;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      const api = turnstileApi();
      if (turnstileWidget.current && api) api.remove(turnstileWidget.current);
      turnstileWidget.current = null;
    };
  }, [turnstileSiteKey, turnstileNonce]);

  useEffect(() => {
    if (!turnstileSiteKey || state.ok) return;
    if (!state.message && !state.errors) return;
    const api = turnstileApi();
    if (api && turnstileWidget.current) api.reset(turnstileWidget.current);
    if (turnstileInput.current) turnstileInput.current.value = "";
  }, [state, turnstileSiteKey]);

  if (state.ok) {
    const handoff = state.whatsappHref ?? whatsappHref;
    return (
      <div className="surface p-7 md:p-9" role="status" aria-live="polite">
        <p className="eyebrow">Enquiry received</p>
        <h2 className="display-m mt-4">Thank you.</h2>
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">
          {state.message}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {handoff ? (
            <a
              href={handoff}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-solid"
            >
              Continue on WhatsApp
            </a>
          ) : null}
          <Link href="/contact#enquiry" className="btn btn-outline">
            Send another enquiry
          </Link>
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

        <div className="sm:col-span-2">
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

        <div className="sm:col-span-2">
          <label className="label" htmlFor="details">
            Details <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className={errors.details ? "field field-error" : "field"}
            id="details"
            name="details"
            rows={4}
            maxLength={1500}
            placeholder="Varieties you like, the occasion, packaging, your city…"
            aria-invalid={errors.details ? true : undefined}
            aria-describedby={errors.details ? "details-error" : "details-help"}
          />
          {errors.details ? (
            <p className="error-text" id="details-error">
              {errors.details}
            </p>
          ) : (
            <p className="help" id="details-help">
              Want a call back? Put your number here. Otherwise we reply on WhatsApp.
            </p>
          )}
        </div>
      </div>

      {turnstileSiteKey ? (
        <div className="mt-6">
          <p className="meta">Quick verification</p>
          <div ref={turnstileContainer} className="mt-2 min-h-[65px]" />
          <input ref={turnstileInput} type="hidden" name="turnstileToken" defaultValue="" />
        </div>
      ) : null}

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
