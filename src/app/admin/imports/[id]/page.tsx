import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ShoppingBag,
  Upload,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  IMPORT_FIELDS,
  autoMapColumns,
  buildImportPreview,
  getImportBatch,
  type ImportPreview,
} from "@/lib/imports";
import { formatDateTime } from "@/lib/dates";
import { formatINR, parseRupeesToPaise } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { ImportBatch, ImportStatus } from "@/lib/types";
import {
  confirmImportAction,
  correctImportRowAction,
  saveImportMappingAction,
} from "../actions";

export const metadata: Metadata = { title: "Import batch" };

const STATUS_STYLES: Record<ImportStatus, string> = {
  UPLOADED: "border-brass text-brass",
  READY: "border-olive-soft text-olive",
  PROCESSING: "border-brass text-brass",
  IMPORTED: "border-olive-deep text-olive-deep",
  FAILED: "border-terracotta text-terracotta",
};

const STATUS_LABELS: Record<ImportStatus, string> = {
  UPLOADED: "Awaiting mapping",
  READY: "Ready to review",
  PROCESSING: "Importing",
  IMPORTED: "Imported",
  FAILED: "Needs attention",
};

const ROW_STATUS_STYLES = {
  VALID: "border-olive-soft text-olive",
  SKIPPED: "border-brass text-brass",
  INVALID: "border-terracotta text-terracotta",
} as const;

const ROW_STATUS_LABELS = {
  VALID: "Ready",
  SKIPPED: "Will skip",
  INVALID: "Needs correction",
} as const;

const PAGE_SIZE = 25;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function kindLabel(kind: ImportBatch["kind"]): string {
  return kind === "CUSTOMERS" ? "Customer import" : "Historical order import";
}

function rowSummary(batch: ImportBatch, values: Record<string, string>): string {
  if (batch.kind === "CUSTOMERS") {
    return [values.name, values.phone, values.email].filter(Boolean).join(" · ") || "No values";
  }
  const total = parseRupeesToPaise(values.total);
  return [
    values.orderDate,
    values.customerName,
    values.phone,
    total !== null ? formatINR(total) : "",
    values.reference,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Notice({
  params,
  status,
  failed,
}: {
  params: Record<string, string | string[] | undefined>;
  status: ImportStatus;
  failed: number;
}) {
  const error = first(params.error);
  const notice = first(params.notice);
  if (error) {
    return (
      <p
        role="alert"
        className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta"
      >
        {error}
      </p>
    );
  }
  const messages: Record<string, string> = {
    uploaded: "File uploaded. Map the columns, then review every checked row before importing.",
    duplicate: "This file was already uploaded. Continue with this existing batch instead.",
    mapped: "Column mapping saved. Review the checked rows below before importing.",
    corrected: "Row saved. Its checks have been re-run.",
    imported:
      status === "FAILED"
        ? "Import finished with errors. Review the messages below; valid rows that were not saved can be retried."
        : failed > 0
          ? "Import finished. Some rows were not imported; review the messages below."
          : "Import finished. See the summary below.",
  };
  if (!notice || !messages[notice]) return null;
  return (
    <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
      {messages[notice]}
    </p>
  );
}

export default async function ImportBatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("customers.manage");
  const { id } = await params;
  const query = await searchParams;
  const batch = await getImportBatch(id);
  if (!batch) notFound();
  if (batch.kind === "ORDERS" && !hasPermission(user, "orders.manage")) {
    redirect("/admin?denied=orders.manage");
  }

  const fields = IMPORT_FIELDS[batch.kind];
  const mapping = batch.mapping ?? autoMapColumns(batch.kind, batch.headers);
  let preview: ImportPreview | null = null;
  let previewError = "";
  if (batch.mapping && batch.status !== "IMPORTED") {
    try {
      preview = await buildImportPreview(batch);
    } catch (error) {
      previewError = error instanceof Error ? error.message : "Rows could not be checked.";
    }
  }

  const filter = first(query.filter) === "problems" ? "problems" : "all";
  const pageValue = Number(first(query.page));
  const rows = preview
    ? filter === "problems"
      ? preview.rows.filter((row) => row.status === "INVALID")
      : preview.rows
    : [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(
    Math.max(Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1, 1),
    totalPages,
  );
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    next.set("page", String(page));
    if (filter === "problems") next.set("filter", "problems");
    return `/admin/imports/${batch.id}?${next.toString()}`;
  };

  const canConfirm = batch.status === "READY" || batch.status === "FAILED";
  const canMap = batch.status !== "IMPORTED" && batch.status !== "PROCESSING";
  const summary = batch.summary;
  const failedCount = summary?.failed ?? 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={kindLabel(batch.kind)}
        title={batch.filename}
        description={[
          `${batch.rows.length} row${batch.rows.length === 1 ? "" : "s"}`,
          `uploaded ${formatDateTime(batch.createdAt)}`,
          batch.createdByName ?? "",
          STATUS_LABELS[batch.status],
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <Link href="/admin/imports" className="btn btn-quiet btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Imports
          </Link>
        }
      />

      <Notice params={query} status={batch.status} failed={failedCount} />
      {previewError ? (
        <p
          role="alert"
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta"
        >
          {previewError}
        </p>
      ) : null}

      {batch.status === "IMPORTED" && summary ? (
        <section className="surface p-5" aria-labelledby="import-summary">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("pill", STATUS_STYLES[batch.status])}>
              {STATUS_LABELS[batch.status]}
            </span>
            <h2 id="import-summary" className="font-[family-name:var(--font-display)] text-xl">
              Import summary
            </h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Imported", value: summary.imported },
              { label: "Skipped", value: summary.skipped },
              { label: "Failed", value: summary.failed },
              {
                label: batch.kind === "CUSTOMERS" ? "Customers created" : "Orders created",
                value:
                  batch.kind === "CUSTOMERS"
                    ? (summary.customersCreated ?? summary.imported)
                    : (summary.ordersCreated ?? summary.imported),
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl">{item.value}</p>
              </div>
            ))}
          </div>
          {summary.errors.length > 0 ? (
            <div className="mt-5 border border-line bg-paper-raised px-4 py-3">
              <p className="text-[0.8125rem] font-medium">Rows not imported after retries</p>
              <ul className="mt-2 space-y-1 text-[0.8125rem] text-ink-soft">
                {summary.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-[0.8125rem]">
            <Link
              href={batch.kind === "CUSTOMERS" ? "/admin/customers" : "/admin/orders"}
              className="text-olive-deep hover:underline"
            >
              Open {batch.kind === "CUSTOMERS" ? "customers" : "orders"}
            </Link>
            <Link
              href={`/admin/audit?entityType=import&entityId=${batch.id}`}
              className="text-olive-deep hover:underline"
            >
              View audit entry
            </Link>
            {summary.failed > 0 ? (
              <span className="text-ink-muted">
                Correct or skip the failed rows, then run the import again. Already imported rows
                are never duplicated.
              </span>
            ) : null}
          </div>
          <p className="mt-4 flex items-start gap-2 text-[0.75rem] text-ink-muted">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-olive" />
            Imported records did not send WhatsApp messages or emails.
          </p>
        </section>
      ) : null}

      {batch.status !== "IMPORTED" ? (
        <section className="surface p-5" aria-labelledby="column-mapping">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="column-mapping"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
            >
              <FileSpreadsheet aria-hidden="true" className="size-4 text-brass" />
              Map columns
            </h2>
            <span className="meta">{batch.headers.length} columns in file</span>
          </div>
          <p className="mt-2 text-[0.8125rem] text-ink-soft">
            Matching names are preselected. Adjust anything that looks wrong. Required fields are
            marked with an asterisk.
          </p>
          {canMap ? (
            <form action={saveImportMappingAction} className="mt-4 space-y-4">
              <input type="hidden" name="batchId" value={batch.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <label key={field.key} className="block text-[0.8125rem]">
                    <span className="font-medium">
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                    <select
                      name={`field:${field.key}`}
                      defaultValue={mapping[field.key] ?? ""}
                      className="mt-1.5 w-full border border-line bg-paper-raised px-3 py-2 text-[0.875rem]"
                    >
                      <option value="">Not imported</option>
                      {batch.headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={String(index)}>
                          {header}
                        </option>
                      ))}
                    </select>
                    {field.hint ? (
                      <span className="mt-1 block text-[0.75rem] text-ink-muted">{field.hint}</span>
                    ) : null}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                  href={
                    batch.kind === "CUSTOMERS"
                      ? "/templates/import-customers.csv"
                      : "/templates/import-orders.csv"
                  }
                  download
                  className="inline-flex items-center gap-1.5 text-[0.8125rem] text-olive-deep hover:underline"
                >
                  <Download aria-hidden="true" className="size-3.5" />
                  Download a fresh template
                </a>
                <button type="submit" className="btn btn-solid btn-sm">
                  <Upload aria-hidden="true" className="size-3.5" />
                  Save mapping
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-4 border border-line bg-paper-raised px-3 py-3 text-[0.8125rem] text-ink-muted">
              The import is running. This page can be refreshed in a moment.
            </p>
          )}
        </section>
      ) : null}

      {batch.mapping && preview ? (
        <>
          <section aria-labelledby="row-checks" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id="row-checks"
                className="font-[family-name:var(--font-display)] text-2xl"
              >
                Row checks
              </h2>
              <span className={cn("pill", STATUS_STYLES[batch.status])}>
                {STATUS_LABELS[batch.status]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Rows", value: preview.counts.total },
                { label: "Ready", value: preview.counts.valid },
                { label: "Duplicates skipped", value: preview.counts.skipped },
                { label: "Needs correction", value: preview.counts.invalid },
              ].map((item) => (
                <div key={item.label} className="surface p-4">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Link
                  href={`/admin/imports/${batch.id}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[0.75rem]",
                    filter === "all"
                      ? "border-olive-deep bg-olive-deep text-paper"
                      : "border-line text-ink-soft hover:border-line-strong",
                  )}
                >
                  All rows
                </Link>
                <Link
                  href={`/admin/imports/${batch.id}?filter=problems`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[0.75rem]",
                    filter === "problems"
                      ? "border-olive-deep bg-olive-deep text-paper"
                      : "border-line text-ink-soft hover:border-line-strong",
                  )}
                >
                  Needs correction only
                </Link>
              </div>
              <p className="text-[0.75rem] text-ink-muted">
                Showing {visibleRows.length} of {rows.length} row{rows.length === 1 ? "" : "s"} ·
                header is row 1
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="surface px-5 py-10 text-center text-[0.875rem] text-ink-muted">
                {filter === "problems"
                  ? "No rows need correction."
                  : "No rows to show."}
              </p>
            ) : (
              <ul className="surface divide-y divide-line">
                {visibleRows.map((row) => (
                  <li key={row.rowIndex} className="px-5 py-4">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                      <span className="text-[0.75rem] font-semibold text-ink-muted">
                        Row {row.rowNumber}
                      </span>
                      <span className={cn("pill", ROW_STATUS_STYLES[row.status])}>
                        {ROW_STATUS_LABELS[row.status]}
                      </span>
                      <p className="min-w-0 flex-1 text-[0.875rem]">
                        {rowSummary(batch, row.values)}
                      </p>
                    </div>
                    {batch.kind === "ORDERS" ? (
                      <p className="mt-1 text-[0.75rem] text-ink-muted">
                        {[
                          row.values.product,
                          row.values.quantityKg ? `${row.values.quantityKg} kg` : "",
                          row.values.amountPaid
                            ? `Paid ${formatINR(parseRupeesToPaise(row.values.amountPaid) ?? 0)}`
                            : "Nothing paid",
                          row.values.status || "COMPLETED by default",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {row.errors.length > 0 ? (
                      <ul
                        className={cn(
                          "mt-1.5 space-y-0.5 text-[0.8125rem]",
                          row.status === "INVALID" ? "text-terracotta" : "text-ink-muted",
                        )}
                      >
                        {row.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    ) : null}
                    {row.status === "INVALID" && canMap ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[0.8125rem] text-olive-deep">
                          Correct this row
                        </summary>
                        <form
                          action={correctImportRowAction}
                          className="mt-3 grid gap-3 border border-line bg-paper-raised p-3 sm:grid-cols-2"
                        >
                          <input type="hidden" name="batchId" value={batch.id} />
                          <input type="hidden" name="rowIndex" value={String(row.rowIndex)} />
                          {fields
                            .filter((field) => mapping[field.key] !== undefined)
                            .map((field) => (
                              <label key={field.key} className="block text-[0.75rem]">
                                <span className="font-medium">{field.label}</span>
                                <input
                                  name={`field:${field.key}`}
                                  defaultValue={row.values[field.key] ?? ""}
                                  maxLength={2000}
                                  className="mt-1 w-full border border-line bg-paper px-2.5 py-1.5 text-[0.8125rem]"
                                />
                              </label>
                            ))}
                          <div className="sm:col-span-2">
                            <button type="submit" className="btn btn-outline btn-sm">
                              Save row
                            </button>
                          </div>
                        </form>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
                {currentPage > 1 ? (
                  <Link href={pageHref(currentPage - 1)} className="text-olive-deep hover:underline">
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-ink-muted">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link href={pageHref(currentPage + 1)} className="text-olive-deep hover:underline">
                    Next
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            ) : null}
          </section>

          {canConfirm ? (
            <section className="surface p-5" aria-labelledby="confirm-import">
              <h2
                id="confirm-import"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
              >
                <AlertTriangle aria-hidden="true" className="size-4 text-brass" />
                Confirm import
              </h2>
              <div className="mt-3 space-y-2 text-[0.875rem] text-ink-soft">
                <p>
                  {preview.counts.valid} row{preview.counts.valid === 1 ? "" : "s"} will be saved.
                  {preview.counts.skipped > 0
                    ? ` ${preview.counts.skipped} duplicate row${
                        preview.counts.skipped === 1 ? " is" : "s are"
                      } skipped automatically.`
                    : ""}
                  {preview.counts.invalid > 0
                    ? ` ${preview.counts.invalid} row${
                        preview.counts.invalid === 1 ? " is" : "s are"
                      } not valid and will not be imported.`
                    : ""}
                </p>
                {batch.kind === "ORDERS" ? (
                  <p>
                    Historical orders keep their original dates and are marked as imported. Missing
                    invoice references receive the next safe GH- number. Nothing is sent to
                    customers.
                  </p>
                ) : (
                  <p>
                    Customers are matched by phone. Existing profiles are never duplicated or
                    overwritten.
                  </p>
                )}
              </div>
              <form action={confirmImportAction} className="mt-4 space-y-4">
                <input type="hidden" name="batchId" value={batch.id} />
                <label className="block max-w-md text-[0.8125rem]">
                  <span className="font-medium">Rows to skip (optional)</span>
                  <input
                    name="skipRows"
                    placeholder="For example: 4, 9, 12"
                    className="mt-1.5 w-full border border-line bg-paper-raised px-3 py-2 text-[0.875rem]"
                  />
                  <span className="mt-1 block text-[0.75rem] text-ink-muted">
                    Use the row numbers shown above. Invalid rows are never imported.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[0.8125rem]">
                  <input type="checkbox" name="confirmed" required className="mt-0.5" />
                  <span>
                    I have reviewed these rows and understand that imported historical records
                    cannot be edited afterwards.
                  </span>
                </label>
                <button
                  type="submit"
                  className="btn btn-solid"
                  disabled={preview.counts.valid === 0}
                >
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  {batch.status === "FAILED" ? "Retry import" : "Import"}{" "}
                  {preview.counts.valid} row{preview.counts.valid === 1 ? "" : "s"}
                </button>
              </form>
            </section>
          ) : batch.status === "PROCESSING" ? (
            <div className="flex items-start gap-3 border border-brass bg-paper-raised px-4 py-3 text-[0.875rem]">
              <RefreshCw aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brass" />
              <p>
                This import is running. Refresh this page to see the result. If the server stopped
                mid-import, the batch can be retried after five minutes without duplicating saved
                rows.
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {!batch.mapping ? (
        <section className="surface" aria-labelledby="raw-preview">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
            <h2
              id="raw-preview"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
            >
              <FileSpreadsheet aria-hidden="true" className="size-4 text-brass" />
              File preview
            </h2>
            <span className="meta">First 8 rows</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-[0.8125rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.12em] text-ink-muted">
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Row
                  </th>
                  {batch.headers.map((header) => (
                    <th key={header} scope="col" className="px-4 py-2 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {batch.rows.slice(0, 8).map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-ink-muted">{index + 2}</td>
                    {batch.headers.map((header, columnIndex) => (
                      <td key={`${header}-${columnIndex}`} className="max-w-[14rem] truncate px-4 py-2">
                        {row[columnIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-[0.75rem] text-ink-muted">
            Save the column mapping to run row checks. Order dates must use DD/MM/YYYY,
            DD-MM-YYYY or YYYY-MM-DD.
          </p>
        </section>
      ) : null}

      <p className="flex items-start gap-2 text-[0.75rem] text-ink-muted">
        {batch.kind === "ORDERS" ? (
          <>
            <ShoppingBag aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brass" />
            <span>
              Imported orders are sales records. Gifting costs are not imported, and no invoice PDF
              is attached to a message. Open an imported order to download its invoice from the
              dashboard.
            </span>
          </>
        ) : (
          <>
            <Users aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brass" />
            <span>
              Imported customers start with WhatsApp consent set to none. Consent must be recorded
              from a real customer request before any template message can be sent.
            </span>
          </>
        )}
      </p>
    </div>
  );
}
