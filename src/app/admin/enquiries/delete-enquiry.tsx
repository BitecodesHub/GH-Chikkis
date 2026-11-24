"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteEnquiryAction } from "./actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export function DeleteEnquiry({
  id,
  name,
  linkedOrderId,
  redirectTo,
}: {
  id: string;
  name: string;
  linkedOrderId?: string | null;
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
        const result = await deleteEnquiryAction(id);
        if (result.ok) {
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        } else {
          setMessage(result.message || "Could not delete the enquiry.");
        }
      } catch {
        setMessage("Could not delete the enquiry. Please retry.");
      }
    });
  };

  const isLinked = Boolean(linkedOrderId);

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending || isLinked}
        title={
          isLinked
            ? "This enquiry is linked to an order. Delete or unlink the order first."
            : `Delete enquiry from ${name}`
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
        title={`Delete enquiry from ${name}?`}
        body="This enquiry and its contact details are permanently removed. This cannot be undone."
        confirmLabel="Delete enquiry"
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
