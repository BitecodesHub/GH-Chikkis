import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { ProductCard } from "@/components/site/product-card";
import { contentText, getPublishedContent } from "@/lib/content";
import { listActiveProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Chikki Collection",
  description:
    "Seven handmade chikki varieties from GH Chikkis in Ahmedabad — groundnut, white and black til, dry fruit, coconut, mawa and daliya. Prices are shared directly.",
  alternates: { canonical: "/collection" },
};

export default async function CollectionPage() {
  const [content, products] = await Promise.all([
    getPublishedContent("collection"),
    listActiveProducts(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={contentText(content, "eyebrow")}
        title={contentText(content, "title")}
        intro={contentText(content, "intro")}
      />

      <section className="container-page py-14 md:py-20">
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="surface p-8 text-center">
            <p className="display-s">The collection is being updated.</p>
            <p className="mt-2 text-ink-soft">
              Please check back shortly, or ask us directly about what is available this week.
            </p>
            <Link href="/contact#enquiry" className="btn btn-solid mt-6">
              Ask what is available
            </Link>
          </div>
        )}

        <div className="surface mt-12 grid gap-6 p-7 md:grid-cols-[1fr_auto] md:items-center md:p-9">
          <div>
            <h2 className="display-s">Prices, packaging and custom weights</h2>
            <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
              {contentText(content, "note")}
            </p>
          </div>
          <Link href="/contact#enquiry" className="btn btn-solid">
            Start an enquiry
          </Link>
        </div>
      </section>
    </>
  );
}
