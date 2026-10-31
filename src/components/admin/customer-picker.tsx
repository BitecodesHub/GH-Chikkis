"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Search, UserPlus } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  phoneOriginal: string;
  email?: string;
  company?: string;
  archived: boolean;
}

export function CustomerPicker({
  createHref,
  orderQuery,
}: {
  createHref: string;
  orderQuery?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as { customers?: SearchResult[] };
        setResults(data.customers ?? []);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError("Search is unavailable. Try again.");
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const searching = query.trim().length >= 2;
  const visibleResults = searching ? results : [];

  const hrefFor = (customer: SearchResult) => {
    const search = new URLSearchParams();
    search.set("customerId", customer.id);
    if (orderQuery) {
      const extra = new URLSearchParams(orderQuery);
      extra.forEach((value, key) => search.set(key, value));
    }
    return `/admin/orders/new?${search.toString()}`;
  };

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="pick-customer">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="meta">Step 1 of 2</p>
          <h2
            id="pick-customer"
            className="mt-2 font-[family-name:var(--font-display)] text-xl"
          >
            Choose the customer
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            Pick who the order is for. The order form opens below as soon as you choose a name.
          </p>
        </div>
        <Link href={createHref} className="btn btn-outline btn-sm">
          <UserPlus aria-hidden="true" className="size-4" />
          New customer
        </Link>
      </div>

      <div className="mt-5">
        <label htmlFor="customer-picker-search" className="label">
          Search customers
        </label>
        <div className="flex">
          <span className="field-adorn">
            {loading && searching ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-ink-muted" />
            ) : (
              <Search aria-hidden="true" className="size-4 text-ink-muted" />
            )}
          </span>
          <input
            id="customer-picker-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field border-l-0"
            placeholder="Start typing a name or phone number"
            autoComplete="off"
            autoFocus
          />
        </div>
        <p className="help mt-2">
          Type two letters or more. Search by name, phone, email or company — one profile per
          phone number.
        </p>
      </div>

      {error && searching ? (
        <p role="alert" className="error-text mt-3">
          {error}
        </p>
      ) : null}

      {searching && !loading && visibleResults.length === 0 && !error ? (
        <p className="mt-4 text-[0.9375rem] text-ink-soft">
          No customer matches that search.{" "}
          <Link href={createHref} className="link-underline">
            Create a new profile
          </Link>
          .
        </p>
      ) : null}

      {visibleResults.length > 0 ? (
        <ul className="mt-4 divide-y divide-line border border-line">
          {visibleResults.map((customer) => (
            <li key={customer.id}>
              {customer.archived ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 opacity-60">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-[0.8125rem] text-ink-muted">
                      {customer.phoneOriginal} · Archived
                    </p>
                  </div>
                  <span className="meta">Restore to use</span>
                </div>
              ) : (
                <Link
                  href={hrefFor(customer)}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper-raised"
                >
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-[0.8125rem] text-ink-muted">
                      {customer.phoneOriginal}
                      {customer.company ? ` · ${customer.company}` : ""}
                    </p>
                  </div>
                  <span className="text-[0.8125rem] text-brass-ink">Select</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] text-ink-muted">
        Step 2 — add the products and weights, choose delivery or collection, and record any
        payment already taken.
      </p>
    </section>
  );
}
