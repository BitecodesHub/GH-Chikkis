import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FilterNav } from "@/components/admin/filter-nav";
import { requirePermission } from "@/lib/auth/session";
import { countAudit, listAudit } from "@/lib/audit";
import {
  businessDateEndUtc,
  businessDateStartUtc,
  formatDateDDMMYYYY,
  formatDateTime,
  parseBusinessDate,
} from "@/lib/dates";
import { hasPermission } from "@/lib/permissions";
import type { User } from "@/lib/types";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

const ENTITY_TYPES = [
  ["order", "Orders"],
  ["customer", "Customers"],
  ["enquiry", "Enquiries"],
  ["product", "Products"],
  ["content", "Website content"],
  ["expense", "Expenses"],
  ["inventory_item", "Inventory"],
  ["notification_job", "WhatsApp jobs"],
  ["email", "Emails"],
  ["settings", "Settings"],
  ["user", "Users & access"],
  ["session", "Sessions"],
  ["import", "Imports"],
  ["backup", "Backups"],
  ["report", "Reports"],
] as const;

const ENTITY_LABELS = new Map<string, string>(ENTITY_TYPES);

function entityHref(user: User, entityType: string, entityId?: string): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "order":
      return hasPermission(user, "orders.view") ? `/admin/orders/${entityId}` : null;
    case "customer":
      return hasPermission(user, "customers.view") ? `/admin/customers/${entityId}` : null;
    case "enquiry":
      return hasPermission(user, "enquiries.manage") ? `/admin/enquiries/${entityId}` : null;
    case "product":
      return hasPermission(user, "catalogue.manage") ? `/admin/products/${entityId}` : null;
    case "inventory_item":
      return hasPermission(user, "inventory.manage") ? `/admin/inventory/${entityId}` : null;
    case "notification_job":
      return hasPermission(user, "messaging.manage") ? "/admin/whatsapp" : null;
    case "email":
      return hasPermission(user, "messaging.manage") ? "/admin/emails" : null;
    case "settings":
      return hasPermission(user, "settings.manage") ? "/admin/settings" : null;
    case "user":
      return hasPermission(user, "users.manage") ? `/admin/users/${entityId}` : null;
    case "import":
      return hasPermission(user, "customers.manage") ? `/admin/imports/${entityId}` : null;
    case "backup":
      return hasPermission(user, "backups.manage") ? "/admin/backups" : null;
    case "report":
      return hasPermission(user, "reports.view") ? "/admin/reports" : null;
    default:
      return null;
  }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("audit.view");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const action = typeof params.action === "string" ? params.action.trim() : "";
  const actor = typeof params.actor === "string" ? params.actor.trim() : "";
  const entityType = typeof params.entityType === "string" ? params.entityType : "";
  const fromInput = typeof params.from === "string" ? params.from : "";
  const toInput = typeof params.to === "string" ? params.to : "";
  const from = fromInput ? parseBusinessDate(fromInput) : null;
  const to = toInput ? parseBusinessDate(toInput) : null;
  const page = Math.max(Number(params.page ?? 1) || 1, 1);

  const filter = {
    query: query || undefined,
    action: action || undefined,
    actor: actor || undefined,
    entityType: entityType || undefined,
    from: from ? businessDateStartUtc(from).toISOString() : undefined,
    to: to ? businessDateEndUtc(to).toISOString() : undefined,
  };

  const [entries, total] = await Promise.all([
    listAudit({ ...filter, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countAudit(filter),
  ]);
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const filtersActive = Boolean(query || action || actor || entityType || fromInput || toInput);

  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (action) search.set("action", action);
    if (actor) search.set("actor", actor);
    if (entityType) search.set("entityType", entityType);
    if (fromInput) search.set("from", fromInput);
    if (toInput) search.set("to", toInput);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return suffix ? `/admin/audit?${suffix}` : "/admin/audit";
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin"
        title="Audit log"
        description="Who changed what, and when. Entries are append-only and remain after orders or customers are archived or cancelled."
      />

      <section className="surface" aria-labelledby="audit-filters">
        <form className="border-b border-line px-5 py-4" method="get" aria-label="Audit filters">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="audit-q" className="label">
                Search
              </label>
              <input
                id="audit-q"
                name="q"
                defaultValue={query}
                placeholder="Summary, action or record id"
                className="field w-56"
              />
            </div>
            <div>
              <label htmlFor="audit-action" className="label">
                Action contains
              </label>
              <input
                id="audit-action"
                name="action"
                defaultValue={action}
                placeholder="e.g. order.update"
                className="field w-40"
              />
            </div>
            <div>
              <label htmlFor="audit-actor" className="label">
                Actor email
              </label>
              <input
                id="audit-actor"
                name="actor"
                defaultValue={actor}
                placeholder="name@example.com"
                className="field w-48"
              />
            </div>
            <div>
              <label htmlFor="audit-entity" className="label">
                Area
              </label>
              <select id="audit-entity" name="entityType" defaultValue={entityType} className="field min-w-40">
                <option value="">All areas</option>
                {ENTITY_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="audit-from" className="label">
                From
              </label>
              <input
                id="audit-from"
                name="from"
                defaultValue={fromInput}
                placeholder="DD/MM/YYYY"
                data-autosubmit="blur"
                className="field w-32"
              />
            </div>
            <div>
              <label htmlFor="audit-to" className="label">
                To
              </label>
              <input
                id="audit-to"
                name="to"
                defaultValue={toInput}
                placeholder="DD/MM/YYYY"
                data-autosubmit="blur"
                className="field w-32"
              />
            </div>
            <FilterNav />
            <button type="submit" className="sr-only">
              Apply filters
            </button>
            {filtersActive ? (
              <Link href="/admin/audit" className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </div>
          {fromInput && !from ? (
            <p className="mt-2 text-[0.75rem] text-terracotta">The From date is not valid.</p>
          ) : null}
          {toInput && !to ? (
            <p className="mt-2 text-[0.75rem] text-terracotta">The To date is not valid.</p>
          ) : null}
        </form>

        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
          <h2 id="audit-filters" className="flex items-center gap-2 text-[0.9375rem] font-medium">
            <ScrollText aria-hidden="true" className="size-4 text-brass" />
            {total.toLocaleString("en-IN")} entries
          </h2>
          {from || to ? (
            <p className="meta">
              {from ? formatDateDDMMYYYY(from) : "Start"} – {to ? formatDateDDMMYYYY(to) : "Today"}
            </p>
          ) : (
            <p className="meta">Newest first</p>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="border-t border-line px-5 py-12 text-center">
            <p className="text-[0.9375rem] font-medium">
              {filtersActive ? "No entries match these filters." : "Nothing recorded yet."}
            </p>
            <p className="mt-2 text-[0.875rem] text-ink-muted">
              {filtersActive
                ? "Widen the date range or clear the filters to see more."
                : "Sign-ins and workspace changes are recorded here as they happen."}
            </p>
            {filtersActive ? (
              <Link href="/admin/audit" className="btn btn-outline mt-6">
                Clear filters
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {entries.map((entry) => {
              const href = entityHref(user, entry.entityType, entry.entityId);
              return (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="pill border-line font-mono text-[0.6875rem] text-ink-muted">
                      {entry.action}
                    </span>
                    <p className="min-w-0 flex-1 text-[0.875rem]">{entry.summary}</p>
                    <p className="text-[0.75rem] text-ink-muted">{formatDateTime(entry.at)}</p>
                  </div>
                  <p className="mt-1 text-[0.75rem] text-ink-muted">
                    {entry.actorEmail}
                    {" · "}
                    {ENTITY_LABELS.get(entry.entityType) ?? "Workspace"}
                    {entry.entityId ? (
                      <>
                        {" "}
                        {href ? (
                          <Link href={href} className="text-olive-deep hover:underline">
                            {entry.entityId}
                          </Link>
                        ) : (
                          <span className="font-mono">{entry.entityId}</span>
                        )}
                      </>
                    ) : null}
                    {entry.requestId ? ` · request ${entry.requestId}` : ""}
                  </p>
                  {entry.diff && entry.diff.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[0.75rem] text-olive-deep">
                        View changes ({entry.diff.length})
                      </summary>
                      <dl className="mt-2 grid gap-1 border border-line bg-paper-raised px-3 py-2 text-[0.75rem]">
                        {entry.diff.map((change) => (
                          <div key={change.field} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                            <dt className="font-mono text-ink-muted">{change.field}</dt>
                            <dd>
                              <span className="text-terracotta line-through">{change.from || "—"}</span>
                              {" → "}
                              <span>{change.to || "—"}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="btn btn-quiet btn-sm">
                <ChevronLeft aria-hidden="true" className="size-4" />
                Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="meta">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className="btn btn-quiet btn-sm">
                Older
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
