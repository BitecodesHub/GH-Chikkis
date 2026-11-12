"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpenseAction } from "./actions";

export function DeleteExpense({ id, description, purchase }: {
  id: string;
  description: string;
  purchase: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="max-w-64">
      <button
        type="button"
        className="btn btn-quiet btn-sm text-red-700"
        disabled={pending}
        aria-label={`Delete expense: ${description}`}
        onClick={() => {
          if (!window.confirm(`Delete ${description}? This removes the expense from reports.${purchase ? " The original purchased quantity will also be removed from stock; deletion is blocked if insufficient stock remains." : ""} The audit history is retained. This cannot be undone.`)) return;
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
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {message ? <p role="alert" className="mt-1 text-xs text-red-700">{message}</p> : null}
    </div>
  );
}
