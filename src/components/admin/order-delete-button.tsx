"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteOrderAction } from "@/app/admin/orders/actions";

export function OrderDeleteButton({ orderId, orderRef }: { orderId: string; orderRef: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toUpperCase() === orderRef.trim().toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-quiet btn-sm text-terracotta"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cancel delete"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Delete order ${orderRef}`}
            className="relative w-full max-w-[24rem] rounded-2xl border border-line bg-paper p-5 shadow-[0_24px_60px_-24px_rgba(20,16,10,0.55)]"
          >
            <p className="text-[0.9375rem] font-medium">Delete order {orderRef}?</p>
            <p className="mt-1 text-[0.8125rem] text-ink-soft">
              It leaves orders, reports and exports for good. Type the number to confirm.
            </p>
            <form
              action={(formData) => startTransition(() => deleteOrderAction(formData))}
              className="mt-3"
            >
              <input type="hidden" name="orderId" value={orderId} />
              <label className="label" htmlFor={`delete-confirm-${orderId}`}>
                Order number
              </label>
              <input
                id={`delete-confirm-${orderId}`}
                name="confirmRef"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                placeholder={orderRef}
                className="field mt-1"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-quiet btn-sm">
                  Keep it
                </button>
                <button
                  type="submit"
                  disabled={pending || !matches}
                  className="btn btn-sm bg-terracotta text-paper hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Delete order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
