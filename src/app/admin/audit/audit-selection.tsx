"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAuditEntriesAction } from "./actions";

export function AuditSelection({ total, children }: { total: number; children: ReactNode }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const boxes = () =>
    [...(formRef.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? [])];
  const recount = () => setSelected(boxes().filter((box) => box.checked).length);
  const allOnPage = total > 0 && selected === total;

  const toggleAll = (checked: boolean) => {
    for (const box of boxes()) box.checked = checked;
    recount();
  };

  const remove = () => {
    const ids = boxes().filter((box) => box.checked).map((box) => box.value);
    if (ids.length === 0) return;
    const noun = ids.length === 1 ? "entry" : "entries";
    if (!window.confirm(`Delete ${ids.length} audit ${noun}? This cannot be undone.`)) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteAuditEntriesAction(ids);
        setMessage(result.message);
        if (result.ok) {
          toggleAll(false);
          router.refresh();
        }
      } catch {
        setMessage("Could not delete these entries. Please retry.");
      }
    });
  };

  return (
    <form ref={formRef} onChange={recount} onSubmit={(event) => event.preventDefault()}>
      <div className="flex min-h-12 flex-wrap items-center gap-3 border-t border-line bg-paper-deep/40 px-5 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-ink-soft">
          <input
            type="checkbox"
            checked={allOnPage}
            ref={(element) => {
              if (element) element.indeterminate = selected > 0 && !allOnPage;
            }}
            onChange={(event) => {
              event.stopPropagation();
              toggleAll(event.target.checked);
            }}
            className="size-4 accent-olive"
          />
          {selected > 0 ? `${selected} selected` : "Select all on this page"}
        </label>
        {selected > 0 ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="btn btn-sm bg-terracotta text-paper hover:opacity-90 disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {pending ? "Deleting…" : "Delete selected"}
          </button>
        ) : null}
        {message ? (
          <p role="status" className="text-[0.8125rem] text-ink-muted">
            {message}
          </p>
        ) : null}
      </div>
      {children}
    </form>
  );
}
