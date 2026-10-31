"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";

type ExportFormat = "csv" | "excel" | "pdf";

const FORMATS: { value: ExportFormat; label: string; extension: string }[] = [
  { value: "csv", label: "CSV", extension: "csv" },
  { value: "excel", label: "Excel", extension: "xlsx" },
  { value: "pdf", label: "PDF", extension: "pdf" },
];

export function ExportReport({
  preset,
  from,
  to,
  rangeLabel,
}: {
  preset: string;
  from: string;
  to: string;
  rangeLabel: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<ExportFormat | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const selected = FORMATS.find((entry) => entry.value === format);

  function open(value: ExportFormat) {
    setError("");
    setDone("");
    setFormat(value);
    dialogRef.current?.showModal();
  }

  function close() {
    if (busy) return;
    dialogRef.current?.close();
    setFormat(null);
  }

  async function confirm() {
    if (!format) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, preset, from, to }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "The export could not be prepared. Try again.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/i.exec(disposition);
      const filename =
        match?.[1] ?? `GH-Chikkis-report.${selected?.extension ?? format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDone(`${selected?.label ?? format.toUpperCase()} report downloaded. The export was added to the audit log.`);
      dialogRef.current?.close();
      setFormat(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The export failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FORMATS.map((entry) => (
        <button
          key={entry.value}
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => open(entry.value)}
        >
          <Download aria-hidden="true" className="size-4" />
          {entry.label}
        </button>
      ))}

      <dialog
        ref={dialogRef}
        aria-labelledby="export-title"
        aria-describedby="export-description"
        className="w-[min(92vw,30rem)] border border-line bg-paper-raised p-0 text-ink shadow-2xl backdrop:bg-ink/40"
        onCancel={(event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          setFormat(null);
        }}
      >
        <div className="p-5 sm:p-6">
          <p className="eyebrow">Export report</p>
          <h2 id="export-title" className="display-s mt-2 text-2xl">
            Download {selected?.label ?? ""} report?
          </h2>
          <p id="export-description" className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            This file covers <strong className="font-medium text-ink">{rangeLabel}</strong> and
            contains customer names, sales, payments, expenses and outstanding balances.
            Download it only to a trusted device.
          </p>
          <p className="mt-2 text-[0.8125rem] text-ink-muted">
            The export is recorded in the audit log with your name, the format and the date range.
          </p>
          {error ? (
            <p role="alert" className="mt-4 border border-terracotta bg-paper px-3 py-2 text-[0.875rem]">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-quiet btn-sm" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-solid btn-sm"
              onClick={confirm}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Download aria-hidden="true" className="size-4" />
              )}
              {busy ? "Preparing…" : "Download"}
            </button>
          </div>
        </div>
      </dialog>

      {done ? (
        <p role="status" className="w-full text-[0.8125rem] text-olive-deep">
          {done}
        </p>
      ) : null}
    </div>
  );
}
