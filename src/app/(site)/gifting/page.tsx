import type { Metadata } from "next";
import Link from "next/link";
import { GiftingAtelier } from "@/components/site/gifting-atelier";
import {
  contentSections,
  getPublishedContent,
} from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { pageMeta } from "@/lib/seo";
import { waLink, WHATSAPP_BULK_MESSAGE } from "@/lib/phone";
import {
  Award,
  Package,
  Sparkles,
  Truck,
  Layers,
  Stamp,
  HeartHandshake,
  Briefcase,
  Gift,
  ArrowRight,
  Flame,
} from "lucide-react";

export const metadata: Metadata = pageMeta({
  title: "The GH Chikki Gift Atelier | Bespoke Keepsake Gifting",
  description:
    "An interactive bespoke gifting experience from Ahmedabad. Curate seven pure jaggery chikki varieties inside hand-carved Sheesham chests, blush lotus boxes, and jewel lacquer tins.",
  path: "/gifting",
});

const BENTO_FEATURES = [
  {
    icon: Layers,
    title: "Seven Signature Varieties",
    detail:
      "Curate your assortment from classic groundnut, rich dry fruit, black sesame, white til, toasted coconut, roasted daliya, and crispy mamra. Prepared with pure jaggery and zero liquid glucose.",
    badge: "Pure Ingredients",
  },
  {
    icon: Stamp,
    title: "Bespoke Corporate Identity",
    detail:
      "Enhance each gift with your organization's logo belly bands, metallic foil stamping, wax-sealed satin ribbons, and bespoke calligraphy greeting inserts.",
    badge: "Custom Branding",
  },
  {
    icon: Package,
    title: "Heirloom Keepsake Packaging",
    detail:
      "Hand-carved solid Sheesham wood chests, solid fluted brass lotus diyas, and jewel-toned lacquer tins designed to be treasured long after the sweets are enjoyed.",
    badge: "Lasting Value",
  },
  {
    icon: Truck,
    title: "White-Glove Multi-City Dispatch",
    detail:
      "Each batch is sealed in food-grade parchment dividers and shipped in shock-absorbent transit packaging across Ahmedabad, Pan-India, and global destinations.",
    badge: "Door-to-Door",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Share Your Brief",
    body: "Tell us the occasion, approximate box count, desired date, and any packaging or branding ideas. A rough estimate is fine to start.",
  },
  {
    num: "02",
    title: "Confirm What is Possible",
    body: "We respond with available varieties, packaging formats, exact lead times for your date, and an individual quote.",
  },
  {
    num: "03",
    title: "Fresh Handcrafting",
    body: "Once confirmed, the chikkis are cooked and hand-cut in our Ahmedabad kitchen within 48 hours of dispatch for optimal crunch.",
  },
  {
    num: "04",
    title: "Handled Collection or Dispatch",
    body: "Packed by hand in protective transit containers, ready for direct collection in Ahmedabad or door-to-door courier dispatch.",
  },
];

const OCCASION_META: Record<string, { icon: typeof Briefcase; note: string }> = {
  "Corporate gifting": {
    icon: Briefcase,
    note: "Client gratitude, milestone hampers & annual festivities",
  },
  "Festive orders": {
    icon: Flame,
    note: "Diwali, New Year, Uttarayan & seasonal celebrations",
  },
  "Retailers": {
    icon: Gift,
    note: "Artisanal confection displays for select retail partners",
  },
  "Bulk & custom weights": {
    icon: Sparkles,
    note: "Custom weight assortments & tailored family distributions",
  },
};

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
    <div className="bg-paper min-h-screen text-ink">
      {/* ============================================================ */}
      {/*  HERO — Editorial, Spacious & Monumental                     */}
      {/* ============================================================ */}
      <header className="relative border-b border-line/80 overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Architectural grid texture & subtle warm vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(184,92,52,0.06),transparent_70%)]"
        />

        <div className="container-page relative z-10 text-center max-w-4xl mx-auto">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-line-strong/60 bg-paper-raised px-4 py-1.5 text-[0.8125rem] font-semibold text-olive shadow-2xs">
            <span className="size-1.5 rounded-full bg-terracotta" />
            <span>Bespoke Confectionery & Keepsake Packaging</span>
          </div>

          {/* Monumental Headline */}
          <h1 className="font-display mt-6 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-ink text-balance leading-[1.1]">
            Handmade for the moments that matter.
          </h1>

          {/* Refined Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-ink-soft max-w-2xl mx-auto leading-relaxed text-pretty">
            Every gifting order is planned around your occasion — from our seven signature chikki varieties and custom branding to hand-carved wooden chests and solid brass lotus diyas.
          </p>

          {/* Apple-Style CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#atelier-studio"
              className="inline-flex items-center gap-2 rounded-full bg-olive px-6 py-3 text-[0.9375rem] font-semibold text-paper shadow-xs hover:bg-olive-deep hover:shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Enter The Gift Atelier</span>
              <ArrowRight className="size-4" />
            </a>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-paper-raised px-6 py-3 text-[0.9375rem] font-semibold text-ink hover:bg-paper-deep transition-all cursor-pointer"
              >
                <span>WhatsApp Enquiry</span>
              </a>
            ) : null}
          </div>

          {/* Minimalist Trust Ribbon */}
          <div className="mt-12 pt-8 border-t border-line/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-2.5">
              <Award className="size-4 shrink-0 text-brass" />
              <span className="text-[0.8125rem] font-medium text-ink-soft">
                Handcrafted in Ahmedabad
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Package className="size-4 shrink-0 text-olive" />
              <span className="text-[0.8125rem] font-medium text-ink-soft">
                Reusable Keepsake Chests
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Stamp className="size-4 shrink-0 text-terracotta" />
              <span className="text-[0.8125rem] font-medium text-ink-soft">
                Custom Logo Bands & Seals
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Truck className="size-4 shrink-0 text-ink" />
              <span className="text-[0.8125rem] font-medium text-ink-soft">
                Pan-India & Global Express
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  THE GH CHIKKI GIFT ATELIER — Living Stage, Constellation, Studio */}
      {/* ============================================================ */}
      <section id="atelier" className="w-full">
        <GiftingAtelier whatsappNumber={settings.business.whatsappNumber} />
      </section>

      {/* ============================================================ */}
      {/*  BENTO GRID — Tailoring & Craftsmanship Details               */}
      {/* ============================================================ */}
      <section className="container-page py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="eyebrow">Bespoke Details</p>
          <h2 className="display-m mt-3">
            Crafted to the finest millimeter.
          </h2>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            We operate as a private family confectionery kitchen, adapting every element from chikki varieties to packaging hardware.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {BENTO_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group relative flex flex-col justify-between rounded-3xl border border-line-strong/60 bg-paper-raised p-8 shadow-xs transition-all duration-300 hover:border-line-strong hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-paper-deep text-olive shadow-2xs group-hover:bg-olive group-hover:text-paper transition-colors duration-300">
                      <Icon className="size-5" />
                    </div>
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-muted">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink mt-6">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {feat.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  OCCASIONS — Refined Minimalist Cards                        */}
      {/* ============================================================ */}
      <section className="border-t border-line/80 bg-paper-raised py-16 md:py-24">
        <div className="container-page">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl">
              <p className="eyebrow">Curated for Occasions</p>
              <h2 className="display-m mt-3">
                A handmade gift says something a catalogue cannot.
              </h2>
            </div>
            <Link
              href="/contact#enquiry"
              className="inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-terracotta hover:text-terracotta-soft transition-colors self-start md:self-end"
            >
              <span>Discuss an upcoming date</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((sec) => {
              const meta = OCCASION_META[sec.heading] ?? {
                icon: Gift,
                note: "Customised confection arrangements",
              };
              const Icon = meta.icon;

              return (
                <div
                  key={sec.heading}
                  className="rounded-2xl border border-line/80 bg-paper p-6 shadow-2xs flex flex-col justify-between transition-all duration-300 hover:border-line-strong hover:shadow-xs"
                >
                  <div>
                    <div className="size-9 rounded-xl bg-paper-raised flex items-center justify-center text-brass border border-line/60">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-ink mt-4">
                      {sec.heading}
                    </h3>
                    <p className="mt-2 text-[0.8125rem] text-ink-soft leading-relaxed">
                      {sec.body[0]}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-line/60">
                    <span className="text-[0.75rem] font-medium text-ink-muted">
                      {meta.note}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS — Clean 4-Step Process                         */}
      {/* ============================================================ */}
      <section className="container-page py-16 md:py-24">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="eyebrow">The Ordering Process</p>
          <h2 className="display-m mt-3">From brief to box.</h2>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            Direct and personal from your first message to the final delivery.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="relative rounded-2xl border border-line bg-paper-raised p-6 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[0.75rem] font-bold tracking-widest text-olive uppercase">
                  Step {step.num}
                </span>
                <h3 className="font-display text-lg font-semibold text-ink mt-2">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CLOSING CTA — Elegant Editorial Finish                      */}
      {/* ============================================================ */}
      <section className="border-t border-line/80 bg-paper-deep/40 py-16 md:py-24 text-center">
        <div className="container-narrow">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-paper-raised text-brass shadow-2xs border border-line mx-auto mb-6">
            <HeartHandshake className="size-6" />
          </div>
          <h2 className="display-m max-w-lg mx-auto">
            Planning an order? Tell us what you need.
          </h2>
          <p className="mt-4 text-[1rem] leading-relaxed text-ink-soft max-w-xl mx-auto">
            Lead times and delivery options depend on your order size and date. We will confirm what is possible before you commit.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/contact#enquiry" className="btn btn-solid">
              Start a gifting enquiry
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
    </div>
  );
}
