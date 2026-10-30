import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductArt } from "./product-art";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/collection/${product.slug}`}
      className="group block border border-line bg-paper-raised transition-colors hover:border-line-strong"
    >
      <ProductArt slug={product.slug} />
      <div className="border-t border-line p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="display-s">{product.name}</h3>
          <span aria-hidden="true" className="text-brass">
            →
          </span>
        </div>
        {product.tastingNote ? (
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-muted">
            {product.tastingNote}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
