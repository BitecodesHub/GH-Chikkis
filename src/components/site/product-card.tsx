import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductArt } from "./product-art";

export function ProductCard({ product }: { product: Product }) {
  const primary = product.media[0];
  return (
    <Link
      href={`/collection/${product.slug}`}
      className="group block border border-line bg-paper-raised transition-colors hover:border-line-strong"
    >
      <div className="relative aspect-square overflow-hidden bg-paper-deep">
        {primary ? (
          <Image
            src={primary.url}
            alt={primary.alt}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <ProductArt slug={product.slug} />
        )}
      </div>
      <div className="border-t border-line p-3 sm:p-5">
        <div className="flex items-baseline justify-between gap-2 sm:gap-4">
          <h3 className="text-[1.0625rem] leading-tight font-medium sm:text-2xl sm:font-normal sm:[font-family:var(--font-display)]">
            {product.name}
          </h3>
          <span aria-hidden="true" className="text-brass">
            →
          </span>
        </div>
        {product.tastingNote ? (
          <p className="mt-1.5 hidden text-[0.875rem] leading-relaxed text-ink-muted sm:block">
            {product.tastingNote}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
