"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

const TEXTUAL_INPUT_TYPES = new Set(["text", "search", "email", "tel", "url", ""]);

function fieldOf(target: EventTarget | null) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target;
  }
  return null;
}

/**
 * Keeps a server-rendered `method="get"` filter form working (no-JS submit still
 * navigates) while applying changes in place: selects and checkboxes apply at
 * once, typed searches after a pause, and DD/MM/YYYY fields marked
 * `data-autosubmit="blur"` on blur.
 */
export function FilterNav({ debounceMs = 500 }: { debounceMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const anchor = useRef<HTMLSpanElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!(form instanceof HTMLFormElement)) return;

    let timer = 0;

    const apply = () => {
      window.clearTimeout(timer);
      timer = 0;
      const search = new URLSearchParams();
      for (const [key, value] of new FormData(form)) {
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (trimmed) search.set(key, trimmed);
      }
      const suffix = search.toString();
      startTransition(() => {
        router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, { scroll: false });
      });
    };

    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      apply();
    };

    const onInput = (event: Event) => {
      const target = fieldOf(event.target);
      if (!target || target.closest("form") !== form) return;
      if (target.dataset.autosubmit === "blur") return;
      const type = target instanceof HTMLInputElement ? target.type : "text";
      if (TEXTUAL_INPUT_TYPES.has(type)) {
        window.clearTimeout(timer);
        timer = window.setTimeout(apply, debounceMs);
        return;
      }
      apply();
    };

    const onChange = (event: Event) => {
      const target = fieldOf(event.target);
      if (!target || target.closest("form") !== form) return;
      if (target.dataset.autosubmit === "blur") apply();
    };

    form.addEventListener("submit", onSubmit);
    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange);
    };
  }, [debounceMs, pathname, router]);

  return (
    <span
      ref={anchor}
      role="status"
      aria-live="polite"
      className="self-center text-[0.75rem] text-ink-muted"
    >
      {pending ? "Updating results…" : null}
    </span>
  );
}
