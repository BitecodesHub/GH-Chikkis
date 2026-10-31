import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FilterNav } from "@/components/admin/filter-nav";
import { requirePermission } from "@/lib/auth/session";
import { formatDateDDMMYYYY, formatDateTime } from "@/lib/dates";
import { listEnquiries } from "@/lib/enquiries";

export const metadata: Metadata = { title: "Enquiries" };

const PAGE_SIZE = 30;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("enquiries.manage");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);
  const { items, total } = await listEnquiries({
    query,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return `/admin/enquiries${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales"
        title="Enquiries"
        description="Website enquiries arrive here. Start a customer profile and order when the conversation is ready."
      />

      <section className="surface" aria-labelledby="enquiry-list">
        <div className="border-b border-line px-5 py-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-56 flex-1">
              <label htmlFor="enquiry-search" className="label">
                Search
              </label>
              <div className="flex">
                <span className="grid place-items-center border border-r-0 border-line bg-paper-raised px-3">
                  <Search aria-hidden="true" className="size-4 text-ink-muted" />
                </span>
                <input
                  id="enquiry-search"
                  name="q"
                  defaultValue={query}
                  placeholder="Name, phone or email"
                  className="field border-l-0"
                />
              </div>
            </div>
            <FilterNav />
            <button type="submit" className="sr-only">
              Search enquiries
            </button>
            {query ? (
              <Link href="/admin/enquiries" className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id="enquiry-list" className="text-[1.0625rem] font-medium">
            {query ? "Search results" : "Latest enquiries"}
          </h2>
          <span className="meta">
            {total} {total === 1 ? "enquiry" : "enquiries"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Inbox aria-hidden="true" className="mx-auto size-7 text-brass" />
            <p className="display-s mt-4">
              {query ? "No enquiries match that search." : "No enquiries yet."}
            </p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              {query
                ? `Nothing found for “${query}”. Try part of a phone number, or clear the search.`
                : "New website enquiries will appear here with the details the customer shared."}
            </p>
            {query ? (
              <Link href="/admin/enquiries" className="btn btn-outline mt-6">
                Clear search
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((enquiry) => (
              <li key={enquiry.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/enquiries/${enquiry.id}`}
                        className="text-[1.0625rem] font-medium hover:underline"
                      >
                        {enquiry.name}
                      </Link>
                      {enquiry.linkedOrderId ? (
                        <span className="pill border-olive-soft text-olive">Order created</span>
                      ) : (
                        <span className="pill border-brass text-brass">Needs a reply</span>
                      )}
                      {enquiry.whatsappConsent ? (
                        <span className="pill">WhatsApp consent</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[0.9375rem] text-ink-soft">
                      {enquiry.phoneOriginal}
                      {enquiry.email ? ` · ${enquiry.email}` : ""}
                    </p>
                    <p className="mt-1 text-[0.875rem] text-ink-muted">
                      {enquiry.quantityKg} kg ·{" "}
                      {enquiry.notSure
                        ? "Date not decided"
                        : enquiry.expectedDate
                          ? `Expected ${formatDateDDMMYYYY(enquiry.expectedDate)}`
                          : "No date given"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span className="meta">{formatDateTime(enquiry.submittedAt)}</span>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/enquiries/${enquiry.id}`}
                        className="btn btn-outline btn-sm"
                      >
                        Open enquiry
                      </Link>
                      {enquiry.linkedOrderId ? (
                        <Link
                          href={`/admin/orders/${enquiry.linkedOrderId}`}
                          className="btn btn-quiet btn-sm"
                        >
                          View order
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="meta">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn btn-outline btn-sm">
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="btn btn-outline btn-sm">
                  Next
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
