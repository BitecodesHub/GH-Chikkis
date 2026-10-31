import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { ProductArt } from "@/components/site/product-art";
import { ProductCard } from "@/components/site/product-card";
import { ProductEnquiryActions } from "@/components/site/product-enquiry-actions";
import { ArrowLink } from "@/components/site/page-header";
import { getProductBySlug, listActiveProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.active) {
    return { title: "Variety not found" };
  }
  return {
    title: product.name,
    description: product.description.slice(0, 155),
    alternates: { canonical: `/collection/${product.slug}` },
    openGraph: {
      title: `${product.name} — GH Chikkis`,
      description: product.description.slice(0, 155),
      url: `/collection/${product.slug}`,
      images: product.media[0] ? [{ url: product.media[0].url, alt: product.media[0].alt }] : undefined,
    },
  };
}

const ORDER_STEPS = [
  {
    title: "Choose a variety and size",
    body: "Pick a chikki and a packaging size on this page. If you need a custom weight, tell us.",
  },
  {
    title: "Send an enquiry",
    body: "Use the form or WhatsApp. Mention the quantity and the date you have in mind.",
  },
  {
    title: "We confirm the details",
    body: "We reply with availability, current price, packaging and collection or delivery options.",
  },
];

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, products, settings] = await Promise.all([
    getProductBySlug(slug),
    listActiveProducts(),
    getSettings(),
  ]);

  if (!product || !product.active) notFound();

  const related = products.filter((item) => item.slug !== product.slug).slice(0, 3);
  const primary = product.media[0];
  const hasVerifiedIngredients =
    product.ingredientsVerified && Boolean(product.ingredients || product.allergens);
  const packaging = product.packaging.map((option) => ({
    id: option.id,
    label: option.label,
    grams: option.grams,
  }));

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: "GH Chikkis" },
    category: "Chikki",
    countryOfOrigin: "IN",
    ...(product.media.length > 0
      ? { image: product.media.map((asset) => asset.url) }
      : {}),
  };

  return (
    <>
      <JsonLd data={productSchema} />

      <section className="container-page py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="meta">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/collection" className="link-underline">
                Collection
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <div className="relative aspect-square overflow-hidden border border-line bg-paper-deep">
              {primary ? (
                <Image
                  src={primary.url}
                  alt={primary.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <ProductArt slug={product.slug} />
              )}
            </div>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-y border-line text-center">
              <div className="px-3 py-4">
                <dt className="meta">Made</dt>
                <dd className="mt-1 text-sm font-semibold">By hand</dd>
              </div>
              <div className="px-3 py-4">
                <dt className="meta">Since</dt>
                <dd className="mt-1 text-sm font-semibold">2018</dd>
              </div>
              <div className="px-3 py-4">
                <dt className="meta">Kitchen</dt>
                <dd className="mt-1 text-sm font-semibold">Ahmedabad</dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="eyebrow">Chikki variety</p>
            <h1 className="display-l mt-4">{product.name}</h1>
            <p className="lede mt-5">{product.description}</p>
            {product.tastingNote ? (
              <p className="mt-4 text-[0.9375rem] text-ink-soft">
                <span className="font-semibold text-ink">Tasting note.</span>{" "}
                {product.tastingNote}
              </p>
            ) : null}

            <ProductEnquiryActions
              productName={product.name}
              slug={product.slug}
              packaging={packaging}
              whatsappNumber={settings.business.whatsappNumber || null}
            />

            <div className="surface mt-9 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[0.9375rem] font-semibold">Ingredients & allergens</h2>
                {hasVerifiedIngredients ? (
                  <span className="pill border-olive-soft text-olive">
                    Checked by the kitchen
                  </span>
                ) : null}
              </div>
              {hasVerifiedIngredients ? (
                <>
                  {product.ingredients ? (
                    <div className="mt-4">
                      <h3 className="meta">Ingredients</h3>
                      <p className="mt-1 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-soft">
                        {product.ingredients}
                      </p>
                    </div>
                  ) : null}
                  {product.allergens ? (
                    <div className="mt-4">
                      <h3 className="meta">Allergens</h3>
                      <p className="mt-1 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-soft">
                        {product.allergens}
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-muted">
                    Storage guidance is confirmed with your order. Ask us if you need
                    details for a specific batch.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
                    We share the current ingredients and allergen information for each
                    variety directly, so you have verified details before you order. Ask
                    us and we will confirm for the batch you are considering.
                  </p>
                  <Link
                    href="/faqs"
                    className="link-underline mt-3 inline-block text-[0.875rem] font-semibold"
                  >
                    Read common questions
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line">
        <div className="container-page py-16 md:py-20">
          <h2 className="display-m">How ordering works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {ORDER_STEPS.map((step, index) => (
              <li key={step.title} className="border-t border-line-strong pt-5">
                <span className="meta">0{index + 1}</span>
                <h3 className="display-s mt-2">{step.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="container-page py-16 md:py-20">
          <div className="flex items-end justify-between gap-6">
            <h2 className="display-m">More varieties</h2>
            <ArrowLink href="/collection">View all</ArrowLink>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
