"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCustomerAction } from "./actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

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
  const [open, setOpen] = useState(false);

  const remove = () => {
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
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
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
      <ConfirmDialog
        open={open}
        title={`Delete ${name}?`}
        body="The profile and its consent record are removed for good. This cannot be undone."
        confirmLabel="Delete customer"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          remove();
        }}
      />
    </span>
  );
}