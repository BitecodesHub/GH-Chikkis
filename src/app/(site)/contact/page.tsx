import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { PageHeader } from "@/components/site/page-header";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { contentText, getPublishedContent } from "@/lib/content";
import { env } from "@/lib/env";
import { getProductBySlug } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { pageMeta } from "@/lib/seo";
import {
  formatPhoneDisplay,
  waLink,
  WHATSAPP_GENERAL_MESSAGE,
} from "@/lib/phone";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "Send a chikki enquiry to GH Chikkis — variety and quantity, in three short fields. We confirm availability, packaging and price directly with you.",
  path: "/contact",
});

interface PageProps {
  searchParams: Promise<{ product?: string; packaging?: string }>;
}

export default async function ContactPage({ searchParams }: PageProps) {
  const [content, settings, params, requestHeaders] = await Promise.all([
    getPublishedContent("contact"),
    getSettings(),
    searchParams,
    headers(),
  ]);

  const business = settings.business;
  const whatsappHref = business.whatsappNumber
    ? waLink(business.whatsappNumber, WHATSAPP_GENERAL_MESSAGE)
    : null;

  const productSlug = typeof params.product === "string" ? params.product : "";
  const packagingLabel =
    typeof params.packaging === "string" ? params.packaging : "";
  const product = productSlug ? await getProductBySlug(productSlug) : null;
  const activeProduct = product && product.active ? product : null;
  const packaging =
    activeProduct?.packaging.find((option) => option.label === packagingLabel) ?? null;
  const productContext = activeProduct
    ? {
        slug: activeProduct.slug,
        packaging: packaging?.label ?? "",
        label: `${activeProduct.name}${packaging ? ` — ${packaging.label}` : ""}`,
      }
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={contentText(content, "title")}
        intro={contentText(content, "intro")}
      />

      <section id="enquiry" className="container-page scroll-mt-24 py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
          <div>
            <h2 className="display-m">Send an enquiry</h2>
            <p className="lede mt-3 max-w-xl">
              Three short fields. Tell us the variety and how much you need, and we will
              confirm availability, packaging and price directly.
            </p>
            <div className="mt-8">
              <EnquiryForm
                startedAt={new Date().toISOString()}
                whatsappHref={whatsappHref}
                productContext={productContext}
                formNote={contentText(content, "formNote")}
                turnstileSiteKey={env.turnstile.siteKey || undefined}
                turnstileNonce={requestHeaders.get("x-nonce") ?? undefined}
              />
            </div>
          </div>

          <aside className="space-y-6" aria-label="Other ways to reach us">
            {whatsappHref ? (
              <div className="bg-olive-deep p-6 text-paper md:p-7">
                <p className="eyebrow eyebrow-plain text-paper/60">WhatsApp</p>
                <h2 className="display-s mt-3 text-paper">The quickest way to reach the kitchen</h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-paper/75">
                  {contentText(content, "whatsappNote")}
                </p>
                <p className="mt-4 text-[0.9375rem] font-semibold">
                  {business.phoneDisplay || formatPhoneDisplay(business.whatsappNumber)}
                </p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline mt-5 w-full border-paper/40 text-paper hover:border-paper hover:bg-paper hover:text-ink"
                >
                  Message on WhatsApp
                </a>
              </div>
            ) : null}

            <div className="surface p-6">
              <h2 className="display-s text-[1.2rem]">What happens next</h2>
              <ol className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                <li className="flex gap-3">
                  <span className="meta mt-0.5">01</span>
                  <span>We receive your enquiry in our dashboard.</span>
                </li>
                <li className="flex gap-3">
                  <span className="meta mt-0.5">02</span>
                  <span>We reply on WhatsApp, or on the contact you leave in your details.</span>
                </li>
                <li className="flex gap-3">
                  <span className="meta mt-0.5">03</span>
                  <span>We confirm variety, price, packaging and collection or delivery.</span>
                </li>
              </ol>
              <p className="mt-5 border-t border-line pt-4 text-[0.875rem] leading-relaxed text-ink-muted">
                {contentText(content, "responseNote")}
              </p>
            </div>

            <div className="surface p-6">
              <h2 className="display-s text-[1.2rem]">Details</h2>
              <dl className="mt-4 space-y-3 text-[0.9375rem]">
                <div>
                  <dt className="meta">Location</dt>
                  <dd className="mt-0.5">{business.city}{business.state ? `, ${business.state}` : ""}</dd>
                </div>
                {business.addressLine ? (
                  <div>
                    <dt className="meta">Address</dt>
                    <dd className="mt-0.5">{business.addressLine}</dd>
                  </div>
                ) : null}
                {business.email ? (
                  <div>
                    <dt className="meta">Email</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${business.email}`} className="link-underline">
                        {business.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {business.phoneDisplay ? (
                  <div>
                    <dt className="meta">Phone</dt>
                    <dd className="mt-0.5">{business.phoneDisplay}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-5 border-t border-line pt-4 text-[0.875rem] leading-relaxed text-ink-muted">
                GH Chikkis operates from a family kitchen, not a public showroom. Please
                contact us before planning a visit.{" "}
                <Link href="/faqs" className="link-underline">
                  More in FAQs
                </Link>
              </p>
            </div>

            <div className="surface p-6">
              <h2 className="display-s text-[1.2rem]">Buying for a business?</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                See how we handle bulk, festive and corporate gifting orders.
              </p>
              <Link href="/gifting" className="btn btn-outline mt-4 w-full">
                Bulk & corporate gifting
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
