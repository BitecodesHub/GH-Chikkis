"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteOrderAction } from "@/app/admin/orders/actions";

export function OrderDeleteButton({ orderId, orderRef }: { orderId: string; orderRef: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-quiet btn-sm text-terracotta"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="btn btn-quiet btn-sm text-terracotta"
        aria-expanded="true"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </button>
      <div
        role="dialog"
        aria-label={`Delete order ${orderRef}`}
        className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-paper p-4 shadow-[0_18px_40px_-18px_rgba(20,16,10,0.45)]"
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
          <label className="label" htmlFor="delete-confirm-ref">
            Order number
          </label>
          <input
            id="delete-confirm-ref"
            name="confirmRef"
            defaultValue=""
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
              disabled={pending}
              className="btn btn-sm bg-terracotta text-paper hover:opacity-90"
            >
              {pending ? "Deleting…" : "Delete order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
