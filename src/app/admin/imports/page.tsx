import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  FileSpreadsheet,
  History,
  ShoppingBag,
  Upload,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteImportBatch } from "@/components/admin/delete-import-batch";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { listImportBatches, MAX_IMPORT_MB, MAX_IMPORT_ROWS } from "@/lib/imports";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { ImportBatch, ImportStatus } from "@/lib/types";
import { uploadImportAction } from "./actions";

export const metadata: Metadata = { title: "Imports" };

const STATUS_STYLES: Record<ImportStatus, string> = {
  UPLOADED: "border-brass text-brass",
  READY: "border-olive-soft text-olive",
  PROCESSING: "border-brass text-brass",
  IMPORTED: "border-olive-deep text-olive-deep",
  FAILED: "border-terracotta text-terracotta",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function summaryLine(batch: ImportBatch): string {
  if (!batch.summary) {
    return `${batch.rows.length} row${batch.rows.length === 1 ? "" : "s"} uploaded`;
  }
  return `${batch.summary.imported} imported · ${batch.summary.skipped} skipped · ${batch.summary.failed} failed`;
}

export default async function AdminImportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("orders.manage");
  const canImportOrders = hasPermission(user, "orders.manage");
  const params = await searchParams;
  const error = first(params.error);
  const batches = await listImportBatches();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Data"
        title="Imports"
        description="Bring historical sales and expense data into GH Chikkis. Every row is checked before anything is saved, and imported records never trigger WhatsApp messages or emails."
        actions={
          <Link href="/admin/audit?entityType=import" className="btn btn-quiet btn-sm">
            <History aria-hidden="true" className="size-4" />
            Import audit log
          </Link>
        }
      />

      {error ? (
        <p
          role="alert"
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-1">
        <section className="surface p-5" aria-labelledby="order-import">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-paper-raised">
              <ShoppingBag aria-hidden="true" className="size-4 text-brass" />
            </span>
            <div>
              <h2 id="order-import" className="font-[family-name:var(--font-display)] text-xl">
                Historical data
              </h2>
              <p className="mt-1 text-[0.875rem] text-ink-soft">
                Annual sales revenue, purchase expenses and flavour distribution by financial year.
                Each row creates a completed historical order and an expense record so reports
                reflect the full picture.
              </p>
            </div>
          </div>
          {canImportOrders ? (
            <form action={uploadImportAction} className="mt-5 space-y-3">
              <input type="hidden" name="kind" value="HISTORICAL_DATA" />
              <label className="block text-[0.8125rem] font-medium" htmlFor="order-file">
                CSV or Excel file
              </label>
              <input
                id="order-file"
                name="file"
                type="file"
                accept=".csv,.xlsx"
                required
                className="block w-full border border-line bg-paper-raised px-3 py-2 text-[0.875rem] file:mr-3 file:border-0 file:bg-transparent file:text-[0.8125rem] file:font-medium file:text-olive-deep"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                  href="/templates/import-historical-data.csv"
                  download
                  className="inline-flex items-center gap-1.5 text-[0.8125rem] text-olive-deep hover:underline"
                >
                  <Download aria-hidden="true" className="size-3.5" />
                  Historical data template
                </a>
                <button type="submit" className="btn btn-solid btn-sm">
                  <Upload aria-hidden="true" className="size-3.5" />
                  Upload historical data
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-5 border border-line bg-paper-raised px-3 py-3 text-[0.8125rem] text-ink-muted">
              Historical data imports need the “Create and edit orders” permission.
            </p>
          )}
        </section>
      </div>

      <div className="flex items-start gap-3 border border-line bg-paper-raised px-4 py-3 text-[0.8125rem] text-ink-soft">
        <FileSpreadsheet aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brass" />
        <p>
          Up to {MAX_IMPORT_MB} MB and {MAX_IMPORT_ROWS.toLocaleString("en-IN")} rows per file.
          Dates use DD/MM/YYYY, amounts are in rupees, and the first row must contain column names.
          Nothing is saved until you map the columns, review the checked rows and confirm the
          import.
        </p>
      </div>

      <section className="surface" aria-labelledby="recent-imports">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2
            id="recent-imports"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
          >
            <FileSpreadsheet aria-hidden="true" className="size-4 text-brass" />
            Import batches
          </h2>
          <span className="meta">{batches.length} shown</span>
        </div>
        {batches.length === 0 ? (
          <p className="px-5 py-12 text-center text-[0.875rem] text-ink-muted">
            No files uploaded yet. Start with a template above.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {batches.map((batch) => (
              <li key={batch.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/imports/${batch.id}`}
                    className="text-[0.9375rem] font-medium hover:underline"
                  >
                    {batch.filename}
                  </Link>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                    {batch.kind === "CUSTOMERS" ? "Customers" : batch.kind === "HISTORICAL_DATA" ? "Historical data" : "Historical orders"} ·{" "}
                    {summaryLine(batch)}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                    {formatDateTime(batch.createdAt)}
                    {batch.createdByName ? ` · ${batch.createdByName}` : ""}
                  </p>
                </div>
                <span className={cn("pill", STATUS_STYLES[batch.status])}>
                  {batch.status === "IMPORTED"
                    ? "Imported"
                    : batch.status === "PROCESSING"
                      ? "Importing"
                      : batch.status.toLowerCase()}
                </span>
                <div className="inline-flex items-center gap-3">
                  <Link
                    href={`/admin/imports/${batch.id}`}
                    className="text-[0.8125rem] text-olive-deep hover:underline"
                  >
                    {batch.status === "UPLOADED" || batch.status === "READY" ? "Review" : "Open"}
                  </Link>
                  <DeleteImportBatch
                    batchId={batch.id}
                    filename={batch.filename}
                    status={batch.status}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
