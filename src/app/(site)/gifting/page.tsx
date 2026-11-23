import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GiftingShowcase } from "@/components/site/gifting-showcase";
import {
  contentSections,
  contentText,
  getPublishedContent,
} from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { pageMeta } from "@/lib/seo";
import { waLink, WHATSAPP_BULK_MESSAGE } from "@/lib/phone";

export const metadata: Metadata = pageMeta({
  title: "Bulk & Corporate Gifting",
  description:
    "Bulk, festive and corporate chikki gifting from Ahmedabad. Hand-carved wooden chests, gold-embossed keepsake boxes and custom tins, made to order.",
  path: "/gifting",
});

/* ------------------------------------------------------------------ */
/*  Static content                                                     */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    num: "01",
    title: "Tell us the brief",
    body: "Occasion, quantity, date and any packaging ideas. A rough number is fine to start.",
    icon: "✉️",
  },
  {
    num: "02",
    title: "We confirm what's possible",
    body: "Varieties, packaging, pricing and lead time — confirmed before you commit.",
    icon: "✓",
  },
  {
    num: "03",
    title: "Handmade & packed",
    body: "Planned into our kitchen, packed by hand, ready for collection or delivery.",
    icon: "📦",
  },
];

const CUSTOMISE_ITEMS = [
  { icon: "🍬", title: "Chikki varieties", detail: "7 signature varieties or curated samplers" },
  { icon: "⚖️", title: "Pack size / weight", detail: "Pocket boxes to 2 kg family assortments" },
  { icon: "🎁", title: "Gift packaging", detail: "Wooden chests, keepsake tins, foil paper boxes" },
  { icon: "📐", title: "Quantity", detail: "Intimate family gatherings to 500+ corporate orders" },
  { icon: "✨", title: "Presentation", detail: "Satin ribbons, logo bands, brass diyas, custom tags" },
  { icon: "🚚", title: "Delivery / collection", detail: "Ahmedabad pickup, door-to-door, multi-city dispatch" },
];

const OCCASION_ICONS = ["🪔", "🏢", "💍", "🎉"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function GiftingPage() {
  const [content, settings] = await Promise.all([
    getPublishedContent("gifting"),
    getSettings(),
  ]);
  const sections = contentSections(content, "sections");
  const whatsappHref = settings.business.whatsappNumber
    ? waLink(settings.business.whatsappNumber, WHATSAPP_BULK_MESSAGE)
    : null;

  return (
    <>
      {/* ============================================================ */}
      {/*  HERO — cinematic split with immersive image                  */}
      {/* ============================================================ */}
      <header className="relative overflow-hidden bg-ink">
        {/* Background hero image — blurred & dimmed */}
        <div className="absolute inset-0">
          <Image
            src="/gifting/peacock-teal-round-box.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30 blur-2xl scale-110"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/60 to-ink" />
        </div>

        <div className="container-page relative z-10 pb-14 pt-16 md:pb-20 md:pt-24 lg:pb-24 lg:pt-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1 text-[0.8125rem] font-semibold text-white/80 backdrop-blur-sm">
              <span className="size-2 rounded-full bg-terracotta animate-pulse" />
              {contentText(content, "eyebrow")}
            </div>

            <h1 className="font-display mt-6 text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
              {contentText(content, "title")}
            </h1>

            <p className="mt-5 text-[1.0625rem] leading-relaxed text-white/70 max-w-xl">
              Every gifting order is planned around the occasion — from the chikki varieties and quantity to the packaging and delivery. Because every order is different, we quote it individually.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/contact#enquiry" className="gifting-cta-primary">
                Start a gifting enquiry
              </Link>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gifting-cta-secondary"
                >
                  WhatsApp us
                </a>
              ) : null}
            </div>

            {/* Trust markers */}
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-white/50">
              <span>✦ Handcrafted in Ahmedabad</span>
              <span>✦ Bespoke keepsake packaging</span>
              <span>✦ Pan-India & global courier</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  GIFT EXPLORER — immersive tabbed visual showcase             */}
      {/* ============================================================ */}
      <section className="bg-paper-deep border-b border-line">
        <div className="container-page py-14 md:py-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="eyebrow">Our Gift Boxes</p>
              <h2 className="display-m mt-3">
                Four ways to present your gift.
              </h2>
            </div>
            <Link
              href="/contact#enquiry"
              className="btn btn-outline hidden sm:inline-flex text-[0.8125rem] py-2 px-3.5"
            >
              Enquire about any box
            </Link>
          </div>

          <GiftingShowcase />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  WHAT CAN BE CUSTOMISED — icon grid with hover reveals       */}
      {/* ============================================================ */}
      <section className="container-page py-16 md:py-24">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="eyebrow">Tailored to you</p>
          <h2 className="display-m mt-3">What can be customised</h2>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            Every element is adaptable — tell us what you need and we&apos;ll make it happen.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CUSTOMISE_ITEMS.map((item) => (
            <div
              key={item.title}
              className="gifting-customise-card"
            >
              <span className="text-2xl" aria-hidden="true">
                {item.icon}
              </span>
              <div>
                <h3 className="text-[0.9375rem] font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-[0.8125rem] text-ink-soft leading-snug">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Custom branding banner */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-brass/25 bg-paper-deep/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">🏷️</span>
            <p className="text-[0.875rem] text-ink-soft">
              <strong className="font-semibold text-ink">Custom branding available</strong> — logo sleeves, greeting inserts, and wax seal ribbons for corporate or wedding orders.
            </p>
          </div>
          <Link
            href="/contact#enquiry"
            className="btn btn-outline shrink-0 text-[0.8125rem] py-2 px-3.5 self-start sm:self-center"
          >
            Discuss your brief
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  OCCASIONS — compact visual cards                            */}
      {/* ============================================================ */}
      <section className="border-y border-line bg-paper-raised">
        <div className="container-page py-16 md:py-24">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="eyebrow">Perfect for every occasion</p>
            <h2 className="display-m mt-3">
              A handmade gift says something a catalogue cannot.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((section, idx) => (
              <Link
                key={section.heading}
                href="/contact#enquiry"
                className="gifting-occasion-card group"
              >
                <span className="text-3xl mb-3 block" aria-hidden="true">
                  {OCCASION_ICONS[idx] ?? "🎁"}
                </span>
                <h3 className="text-[1rem] font-semibold text-ink group-hover:text-terracotta transition-colors">
                  {section.heading}
                </h3>
                <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-terracotta opacity-0 group-hover:opacity-100 transition-opacity">
                  Enquire &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS — connected timeline                           */}
      {/* ============================================================ */}
      <section className="container-page py-16 md:py-24">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="eyebrow">How it works</p>
          <h2 className="display-m mt-3">From brief to box.</h2>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            Transparent and personal, from first message to final delivery.
          </p>
        </div>

        <div className="gifting-timeline">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="gifting-timeline__step">
              {/* Connector line (not on last) */}
              {idx < STEPS.length - 1 ? (
                <div className="gifting-timeline__connector" aria-hidden="true" />
              ) : null}

              <div className="gifting-timeline__number">
                {step.num}
              </div>

              <div className="gifting-timeline__content">
                <h3 className="text-[1rem] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CLOSING CTA — full-width immersive                          */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute inset-0">
          <Image
            src="/gifting/lotus-blush-box-open.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20 blur-xl scale-105"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/70 to-ink/80" />
        </div>

        <div className="container-narrow relative z-10 py-16 md:py-24 text-center">
          <p className="text-[0.75rem] font-bold uppercase tracking-widest text-terracotta-soft">
            Ready to start?
          </p>
          <h2 className="font-display mt-4 text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Planning an order? Tell us what you need.
          </h2>
          <p className="mt-4 text-[1rem] leading-relaxed text-white/60 max-w-lg mx-auto">
            {contentText(content, "closing")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/contact#enquiry" className="gifting-cta-primary">
              Start a gifting enquiry
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="gifting-cta-secondary"
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
