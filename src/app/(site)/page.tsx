import type { Metadata } from "next";
import Link from "next/link";
import { Diamond } from "@/components/ui/diamond";
import { ChikkiPlate } from "@/components/site/product-art";
import { ProductCard } from "@/components/site/product-card";
import { ArrowLink } from "@/components/site/page-header";
import { JsonLd } from "@/components/site/json-ld";
import {
  contentParagraphs,
  contentSteps,
  contentText,
  getPublishedContent,
} from "@/lib/content";
import { listActiveProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { waLink, WHATSAPP_GENERAL_MESSAGE } from "@/lib/phone";
import { env } from "@/lib/env";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURED_SLUGS = ["groundnut-chikki", "dry-fruit-chikki", "coconut-chikki"];

function pickFeatured(products: Product[]): Product[] {
  const featured = FEATURED_SLUGS.map((slug) =>
    products.find((product) => product.slug === slug),
  ).filter((product): product is Product => Boolean(product));
  if (featured.length === 3) return featured;
  return products.slice(0, 3);
}

export default async function HomePage() {
  const [content, processContent, products, settings] = await Promise.all([
    getPublishedContent("home"),
    getPublishedContent("process"),
    listActiveProducts(),
    getSettings(),
  ]);

  const business = settings.business;
  const whatsappHref = business.whatsappNumber
    ? waLink(business.whatsappNumber, WHATSAPP_GENERAL_MESSAGE)
    : null;
  const featured = pickFeatured(products);
  const storyParagraphs = contentParagraphs(content, "storyBody").slice(0, 2);
  const steps = contentSteps(processContent, "steps").slice(0, 5);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: business.name,
    url: env.appUrl,
    description:
      "A family-run, homemade chikki brand in Ahmedabad, Gujarat, run by sisters Gopi Shah and Himanisha since 2018.",
    foundingDate: "2018",
    founder: [
      { "@type": "Person", name: "Gopi Shah" },
      { "@type": "Person", name: "Himanisha" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: business.city,
      addressRegion: business.state,
      addressCountry: "IN",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: business.name,
    url: env.appUrl,
  };

  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={website} />

      <section className="border-b border-line">
        <div className="container-page grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <p className="eyebrow">{contentText(content, "heroEyebrow")}</p>
            <h1 className="display-xl mt-6">
              {contentText(content, "heroTitle")}
              <br />
              <em className="font-normal italic text-terracotta">
                {contentText(content, "heroTitleAccent")}
              </em>
            </h1>
            <p className="lede mt-7 max-w-lg">{contentText(content, "heroIntro")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/collection" className="btn btn-solid">
                Explore the collection
              </Link>
              <Link href="/our-story" className="btn btn-outline">
                Our story
              </Link>
            </div>
            <p className="meta mt-7 max-w-md border-l border-brass pl-4">
              {contentText(content, "heroNote")}
            </p>
          </div>
          <ChikkiPlate className="mx-auto w-full max-w-[32rem]" />
        </div>
      </section>

      <section className="container-page py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <p className="eyebrow">The collection</p>
            <h2 className="display-l mt-4">{contentText(content, "collectionHeading")}</h2>
            <p className="lede mt-5">{contentText(content, "collectionIntro")}</p>
          </div>
          <Link href="/collection" className="btn btn-outline hidden md:inline-flex">
            All varieties
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <Link href="/collection" className="btn btn-outline mt-8 w-full md:hidden">
          All varieties
        </Link>
      </section>

      <section className="bg-olive-deep text-paper">
        <div className="container-page grid gap-12 py-20 md:py-28 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="eyebrow eyebrow-plain text-paper/60">Since 2018</p>
            <p
              aria-hidden="true"
              className="display-xl mt-4 select-none text-paper/15"
            >
              2018
            </p>
            <div className="mt-6 flex items-center gap-3 text-paper/50">
              <Diamond className="bg-paper" />
              <span className="text-[0.75rem] uppercase tracking-[0.16em]">
                Ahmedabad, Gujarat
              </span>
            </div>
          </div>
          <div>
            <h2 className="display-l">{contentText(content, "storyHeading")}</h2>
            <div className="mt-6 space-y-5 text-[1.0625rem] leading-relaxed text-paper/80">
              {storyParagraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
            <ArrowLink href="/our-story" tone="paper" className="mt-8">
              Read our story
            </ArrowLink>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="container-page py-20 md:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">The handmade process</p>
            <h2 className="display-l mt-4">{contentText(content, "processHeading")}</h2>
            <p className="lede mt-5">{contentText(content, "processIntro")}</p>
          </div>

          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-line-strong pt-5">
                <span className="meta">0{index + 1}</span>
                <h3 className="display-s mt-2">{step.title}</h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <ArrowLink href="/process" className="mt-10">
            See the full process
          </ArrowLink>
        </div>
      </section>

      <section className="container-page py-20 md:py-28">
        <div className="surface grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-end md:p-12">
          <div className="max-w-2xl">
            <p className="eyebrow">Bulk & corporate</p>
            <h2 className="display-m mt-4">{contentText(content, "giftingHeading")}</h2>
            <p className="lede mt-4">{contentText(content, "giftingIntro")}</p>
          </div>
          <Link href="/gifting" className="btn btn-solid md:mb-1">
            Plan a gift
          </Link>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="container-narrow py-20 text-center md:py-28">
          <Diamond size="md" className="mx-auto" />
          <h2 className="display-l mt-6">{contentText(content, "finalCtaHeading")}</h2>
          <p className="lede mx-auto mt-5 max-w-xl">
            {contentText(content, "finalCtaBody")}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/contact#enquiry" className="btn btn-solid">
              {contentText(content, "finalCtaLabel")}
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                WhatsApp us
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
