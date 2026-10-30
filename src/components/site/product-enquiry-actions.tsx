"use client";

import Link from "next/link";
import { useState } from "react";
import { waLink, whatsappMessageForProduct } from "@/lib/phone";

export interface PublicPackagingOption {
  id: string;
  label: string;
  grams: number;
}

export function ProductEnquiryActions({
  productName,
  slug,
  packaging,
  whatsappNumber,
}: {
  productName: string;
  slug: string;
  packaging: PublicPackagingOption[];
  whatsappNumber: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = packaging.find((option) => option.id === selectedId) ?? null;

  const formHref = selected
    ? `/contact?product=${encodeURIComponent(slug)}&packaging=${encodeURIComponent(selected.label)}#enquiry`
    : `/contact?product=${encodeURIComponent(slug)}#enquiry`;

  const whatsappHref = whatsappNumber
    ? waLink(
        whatsappNumber,
        whatsappMessageForProduct(productName, selected?.label ?? null),
      )
    : null;

  return (
    <div>
      {packaging.length > 0 ? (
        <div role="group" aria-labelledby="packaging-label" className="mt-8">
          <p id="packaging-label" className="label">
            Packaging
          </p>
          <div className="flex flex-wrap gap-2">
            {packaging.map((option) => {
              const active = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(active ? null : option.id)}
                  className={
                    active
                      ? "min-h-11 rounded-sm border border-olive bg-olive px-4 py-2 text-sm font-semibold text-paper"
                      : "min-h-11 rounded-sm border border-line-strong bg-transparent px-4 py-2 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="help">
            Choose a size to include it in your enquiry. Custom weights can be discussed.
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={formHref} className="btn btn-solid flex-1">
          Enquire about this variety
        </Link>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline flex-1"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
      <p className="meta mt-4">
        {selected
          ? `Enquiring about ${productName} — ${selected.label}. Prices are shared directly.`
          : "Prices are shared directly. No online checkout."}
      </p>
    </div>
  );
}
