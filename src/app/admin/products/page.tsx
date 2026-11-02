import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Package, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MediaLibrary } from "@/components/admin/media-library";
import { ProductPhoto } from "@/components/site/product-art";
import { requirePermission } from "@/lib/auth/session";
import { formatINR } from "@/lib/money";
import { listMediaAssets } from "@/lib/media";
import { listProducts } from "@/lib/products";
import type { Product } from "@/lib/types";

export const metadata: Metadata = { title: "Products" };

function priceHint(product: Product): string {
  const prices = product.packaging
    .map((option) => option.standardPricePaise)
    .filter((value): value is number => typeof value === "number");
  if (prices.length === 0) return "No standard price set";
  return `From ${formatINR(Math.min(...prices))} internal`;
}

export default async function AdminProductsPage() {
  await requirePermission("catalogue.manage");
  const [products, assets] = await Promise.all([listProducts(), listMediaAssets()]);

  const usage: Record<string, number> = {};
  for (const product of products) {
    for (const asset of product.media) {
      usage[asset.id] = (usage[asset.id] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Manage varieties, packaging and photographs. Public pages never show prices."
        actions={
          <Link href="/admin/products/new" className="btn btn-solid btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            New variety
          </Link>
        }
      />

      <section className="surface" aria-labelledby="product-list">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2
            id="product-list"
            className="font-[family-name:var(--font-display)] text-xl"
          >
            Varieties
          </h2>
          <span className="meta">
            {products.length} {products.length === 1 ? "variety" : "varieties"} ·{" "}
            {products.filter((product) => product.active).length} live
          </span>
        </div>

        {products.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Package aria-hidden="true" className="mx-auto size-7 text-brass" />
            <p className="display-s mt-4">No varieties yet.</p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              Add the first variety to build the public collection.
            </p>
            <Link href="/admin/products/new" className="btn btn-solid mt-6">
              Add a variety
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {products.map((product) => {
              const primary = product.media[0];
              return (
                <li
                  key={product.id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="relative size-20 shrink-0 overflow-hidden border border-line bg-paper-deep"
                      aria-label={`Edit ${product.name}`}
                    >
                      {primary ? (
                        <Image
                          src={primary.url}
                          alt={primary.alt}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <ProductPhoto slug={product.slug} sizes="80px" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-[1.0625rem] font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        <span
                          className={
                            product.active
                              ? "pill border-olive-soft text-olive"
                              : "pill border-line text-ink-muted"
                          }
                        >
                          {product.active ? "Live" : "Paused"}
                        </span>
                        {product.ingredientsVerified ? (
                          <span className="pill">Ingredients verified</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                        /collection/{product.slug}
                      </p>
                      <p className="mt-1 text-[0.8125rem] text-ink-soft">
                        {product.packaging.map((option) => option.label).join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="text-[0.8125rem] text-ink-muted sm:text-right">
                    <p>{priceHint(product)}</p>
                    <p className="mt-0.5">
                      #{product.displayOrder} in the collection ·{" "}
                      {product.media.length === 0
                        ? "Standard variety photo"
                        : `${product.media.length} uploaded photo${product.media.length === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {product.active ? (
                      <Link
                        href={`/collection/${product.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-quiet btn-sm"
                        aria-label={`View ${product.name} on the website`}
                      >
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                        View
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <MediaLibrary assets={assets} usage={usage} />
    </div>
  );
}
