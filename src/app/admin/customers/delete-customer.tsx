"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCustomerAction } from "./actions";

export function DeleteCustomer({
  id,
  name,
  orderCount,
  redirectTo,
}: {
  id: string;
  name: string;
  orderCount: number;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const remove = () => {
    if (
      !window.confirm(
        `Delete ${name}? The profile and its consent record are removed for good. This cannot be undone.`,
      )
    )
      return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteCustomerAction(id);
        if (result.ok) {
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        } else setMessage(result.message);
      } catch {
        setMessage("Could not delete the customer. Please retry.");
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={pending || orderCount > 0}
        title={
          orderCount > 0
            ? "This customer has orders. Archive the profile instead."
            : `Delete ${name}`
        }
        className="btn btn-quiet btn-sm text-terracotta disabled:opacity-40"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {pending ? "Deleting…" : "Delete"}
      </button>
      {message ? (
        <span role="alert" className="max-w-56 text-right text-[0.75rem] leading-snug text-terracotta">
          {message}
        </span>
      ) : null}
    </span>
  );
}
