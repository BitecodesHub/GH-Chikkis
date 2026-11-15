"use client";

import { useEffect, useRef } from "react";

/**
 * Embossed confirmation modal shared by the destructive admin actions.
 * Escape and the backdrop cancel; focus starts on the safe choice.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="emboss relative w-full max-w-[24rem] p-5"
      >
        <p className="text-[0.9375rem] font-medium">{title}</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn btn-quiet btn-sm"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="btn btn-sm bg-terracotta text-paper hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}