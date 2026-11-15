"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpenseAction } from "./actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export function DeleteExpense({ id, description, purchase }: {
  id: string;
  description: string;
  purchase: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const remove = () => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteExpenseAction(id);
        if (result.ok) router.refresh();
        else setMessage(result.message || "Could not delete the expense.");
      } catch {
        setMessage("Could not delete the expense. Please retry.");
      }
    });
  };

  return (
    <div className="max-w-64">
      <button
        type="button"
        className="btn btn-quiet btn-sm text-terracotta"
        disabled={pending}
        aria-label={`Delete expense: ${description}`}
        onClick={() => setOpen(true)}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {message ? <p role="alert" className="mt-1 text-xs text-terracotta">{message}</p> : null}
      <ConfirmDialog
        open={open}
        title={`Delete ${description}?`}
        body={`This removes the expense from reports.${purchase ? " The original purchased quantity will also be removed from stock; deletion is blocked if insufficient stock remains." : ""} The audit history is retained. This cannot be undone.`}
        confirmLabel="Delete expense"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          remove();
        }}
      />
    </div>
  );
}