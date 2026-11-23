"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, LoaderCircle, X } from "lucide-react";
import { deleteImportBatchAction } from "@/app/admin/imports/actions";

export function DeleteImportBatch({
  batchId,
  filename,
  status,
  redirectTo,
}: {
  batchId: string;
  filename: string;
  status: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [understood, setUnderstood] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [error, setError] = useState("");

  const isImported = status === "IMPORTED";
  const canConfirm = isImported
    ? understood && confirmWord.trim() === "DELETE"
    : confirmWord.trim() === "DELETE" || understood;

  const handleOpen = () => {
    setUnderstood(false);
    setConfirmWord("");
    setError("");
    setOpen(true);
  };

  const handleClose = () => {
    if (pending) return;
    setOpen(false);
  };

  const handleDelete = () => {
    if (!canConfirm) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteImportBatchAction(batchId);
        if (result.ok) {
          setOpen(false);
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            router.refresh();
          }
        } else {
          setError(result.message ?? "Could not delete this batch.");
        }
      } catch {
        setError("An unexpected error occurred while deleting.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={pending}
        className="inline-flex items-center gap-1 text-[0.8125rem] text-terracotta hover:underline disabled:opacity-50 cursor-pointer"
        title={`Delete ${filename}`}
      >
        <Trash2 className="size-3.5" />
        <span>Delete</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line-strong bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-terracotta">
                <AlertTriangle className="size-5 shrink-0" />
                <h3 className="font-display text-lg font-semibold text-ink">
                  Delete Import Batch?
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="rounded-full p-1 text-ink-muted hover:bg-paper-deep transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Warning Body */}
            <div className="mt-4 space-y-3 text-[0.875rem] text-ink-soft leading-relaxed">
              <p>
                You are deleting <strong className="text-ink">{filename}</strong>.
              </p>
              {isImported ? (
                <div className="rounded-xl border border-terracotta/40 bg-paper-deep p-3 text-[0.8125rem] text-terracotta leading-snug">
                  <strong>Warning:</strong> All orders, expenses, and records created from this file will be permanently removed, and order reference numbers will be resequenced so you can cleanly upload an updated sheet.
                </div>
              ) : (
                <p className="text-[0.8125rem]">
                  This uploaded batch will be permanently removed.
                </p>
              )}
            </div>

            {/* Accidental Protection Step 1 */}
            <div className="mt-5 space-y-3">
              <label className="flex items-start gap-2.5 text-[0.8125rem] text-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  disabled={pending}
                  className="mt-0.5 size-4 rounded border-line text-terracotta focus:ring-terracotta"
                />
                <span>
                  I understand this cannot be undone and will clear this sheet data so I can upload an updated version.
                </span>
              </label>

              {/* Accidental Protection Step 2 */}
              <div>
                <label
                  htmlFor="confirm-delete-input"
                  className="block text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted"
                >
                  Type <strong className="text-terracotta font-mono font-bold">DELETE</strong> to confirm:
                </label>
                <input
                  id="confirm-delete-input"
                  type="text"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  disabled={pending}
                  placeholder="DELETE"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-xl border border-line bg-paper-raised px-3 py-2 font-mono text-[0.875rem] text-ink placeholder:text-ink-muted/50 focus:border-terracotta focus:outline-none"
                />
              </div>
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-[0.8125rem] text-terracotta">
                {error}
              </p>
            ) : null}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-[0.8125rem] font-semibold text-paper shadow-2xs hover:bg-terracotta-soft transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {pending ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
