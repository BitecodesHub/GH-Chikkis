import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GiftingShowcase } from "@/components/site/gifting-showcase";
import {
  contentParagraphs,
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

const NEXT_STEPS = [
  {
    title: "Tell us the brief",
    body: "Occasion, quantity, date and any packaging or presentation ideas. A rough number is fine to start.",
  },
  {
    title: "We confirm what is possible",
    body: "We reply with available varieties, packaging, pricing and the lead time for your date.",
  },
  {
    title: "We make and pack by hand",
    body: "Once confirmed, the order is planned into the kitchen and packed by hand for collection or delivery.",
  },
];

const CUSTOMISABLE_OPTIONS = [
  {
    title: "Chikki varieties",
    detail: "Choose individual classics or curate radial samplers from our 7 signature varieties.",
  },
  {
    title: "Pack size / weight",
    detail: "From pocket sampler boxes to generous 1kg and 2kg festive family assortments.",
  },
  {
    title: "Gift packaging",
    detail: "Hand-carved wooden chests, metallic keepsake tins, or foiled rigid paper boxes.",
  },
  {
    title: "Quantity",
    detail: "Bespoke batches crafted for intimate family gatherings or 500+ corporate orders.",
  },
  {
    title: "Presentation",
    detail: "Hand-tied satin ribbons, bespoke logo belly bands, brass diyas & personalized tags.",
  },
  {
    title: "Delivery / collection",
    detail: "Direct pickup in Ahmedabad, door-to-door courier, or multi-city corporate dispatch.",
  },
] as const;

export default async function GiftingPage() {
  const [content, settings] = await Promise.all([
    getPublishedContent("gifting"),
    getSettings(),
  ]);
  const sections = contentSections(content, "sections");
  const body = contentParagraphs(content, "body");
  const whatsappHref = settings.business.whatsappNumber
    ? waLink(settings.business.whatsappNumber, WHATSAPP_BULK_MESSAGE)
    : null;

  return (
    <>
      {/* Hero Section with Split Visual Presentation */}
      <header className="relative overflow-hidden border-b border-line bg-paper">
        {/* Subtle decorative atmospheric background radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(184,92,52,0.12),transparent_65%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 bottom-0 size-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(70,81,47,0.08),transparent_60%)]"
        />

        <div className="container-page relative py-12 md:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            {/* Left Content Column */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3.5 py-1 text-[0.8125rem] font-semibold text-olive shadow-2xs">
                <span className="size-2 rounded-full bg-olive animate-pulse" />
                {contentText(content, "eyebrow")}
              </div>

              <h1 className="display-l mt-5 text-balance">
                {contentText(content, "title")}
              </h1>

              <p className="lede mt-5 max-w-2xl text-ink-soft">
                {contentText(content, "intro")}
              </p>

              {/* Standardised CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
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

              {/* Trust highlights */}
              <div className="mt-10 grid grid-cols-1 gap-3 border-t border-line/80 pt-6 sm:grid-cols-3">
                <div className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
                  <span className="size-1.5 shrink-0 rounded-full bg-terracotta" />
                  <span>Handcrafted in Ahmedabad</span>
                </div>
                <div className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
                  <span className="size-1.5 shrink-0 rounded-full bg-brass" />
                  <span>Bespoke Keepsake Packaging</span>
                </div>
                <div className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
                  <span className="size-1.5 shrink-0 rounded-full bg-olive" />
                  <span>Pan-India & Global Courier</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Card */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-paper-deep shadow-md transition-all duration-500 hover:border-line-strong hover:shadow-lg sm:aspect-[16/11]">
                <Image
                  src="/gifting/lotus-blush-box-ribbon.jpg"
                  alt="GH Chikkis luxury blush pink gift box tied with golden satin ribbon bow beside a glowing brass lotus diya"
                  fill
                  priority
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
                />
                <div className="absolute bottom-4 inset-x-4 flex items-end justify-between gap-3 text-white">
                  <div>
                    <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider backdrop-blur-xs">
                      The Signature Lotus Box
                    </span>
                    <p className="mt-1 text-[0.875rem] font-medium drop-shadow-sm">
                      Embossed gold foil, satin ribbon bow & fresh artisan chikkis
                    </p>
                  </div>
                  <span className="hidden shrink-0 rounded-full bg-white/25 px-2.5 py-1 text-[0.75rem] font-medium backdrop-blur-xs sm:inline-block">
                    Made by hand
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Signature Gift Boxes Showcase Section */}
      <section className="container-page py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow">Packaging & Presentation</p>
          <h2 className="display-m mt-3 text-balance">
            Four signature ways to present your gift.
          </h2>
          <p className="lede mt-4 text-ink-soft">
            From hand-carved octagonal wooden chests to jewel-toned peacock tins and gold-foiled ribbon boxes — each format is designed to be cherished as a keepsake long after the chikkis are enjoyed.
          </p>
        </div>

        <div className="mt-12">
          <GiftingShowcase whatsappNumber={settings.business.whatsappNumber} />
        </div>
      </section>

      {/* Why Gifting & Gifting Occasions */}
      <section className="border-t border-line bg-paper-raised py-16 md:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[0.42fr_0.58fr] lg:gap-16">
            <div>
              <p className="eyebrow">Why gifting</p>
              <h2 className="display-m mt-4">
                A handmade gift says something a catalogue cannot.
              </h2>
            </div>
            <div className="prose-body max-w-xl space-y-4">
              {body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* 4 Occasion Sections */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {sections.map((section, idx) => {
              const accentColors = [
                "border-t-terracotta",
                "border-t-olive",
                "border-t-brass",
                "border-t-ink-muted",
              ];
              const accentColor = accentColors[idx % accentColors.length];

              return (
                <article
                  key={section.heading}
                  className={`surface flex flex-col justify-between border-t-2 ${accentColor} p-6 sm:p-8 transition-shadow hover:shadow-xs`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.75rem] font-bold tracking-widest uppercase text-ink-muted">
                        Occasion 0{idx + 1}
                      </span>
                    </div>
                    <h3 className="display-s mt-2 text-ink">{section.heading}</h3>
                    <div className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {section.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-line/60">
                    <Link
                      href="/contact#enquiry"
                      className="inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-terracotta hover:text-terracotta-soft transition-colors"
                    >
                      Enquire for {section.heading.toLowerCase()} &rarr;
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Can Be Customised Section */}
      <section className="container-page py-16 md:py-24">
        <div className="surface p-8 sm:p-10 md:p-12">
          <div className="max-w-2xl">
            <p className="eyebrow">Options & Details</p>
            <h2 className="display-m mt-3">What can be customised</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              Every gifting order is tailored to your brief. These are the elements we can adapt:
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOMISABLE_OPTIONS.map((item) => (
              <div
                key={item.title}
                className="flex flex-col rounded-xl border border-line bg-paper p-5 shadow-2xs transition-all hover:border-line-strong hover:shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-2 rounded-full bg-olive shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="text-[0.9375rem] font-semibold text-ink">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Extra Bespoke Details Banner */}
          <div className="mt-8 flex flex-col gap-4 rounded-xl border border-brass/30 bg-paper-deep/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-brass shrink-0" />
              <p className="text-[0.875rem] text-ink-soft">
                <strong className="font-semibold text-ink">Custom Branding & Logo Sleeves:</strong> We can include your custom company logo bands, greeting inserts, and wax seal ribbons for corporate or wedding orders.
              </p>
            </div>
            <Link
              href="/contact#enquiry"
              className="btn btn-outline shrink-0 text-[0.8125rem] py-2 px-3.5 self-start sm:self-center"
            >
              Discuss your custom brief
            </Link>
          </div>
        </div>
      </section>

      {/* From Brief to Box - How It Works */}
      <section className="border-y border-line bg-paper-raised">
        <div className="container-page py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="display-m mt-3">From brief to box.</h2>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              We keep the process transparent and personal from your first message to the final delivery.
            </p>
          </div>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {NEXT_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-line bg-paper p-6 sm:p-7 shadow-2xs"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-olive/10 text-[0.875rem] font-bold text-olive">
                  0{index + 1}
                </span>
                <h3 className="display-s mt-4 text-ink">{step.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="container-narrow py-16 text-center md:py-24">
        <p className="eyebrow">Ready to start?</p>
        <h2 className="display-l mt-3 max-w-xl mx-auto">
          Planning an order? Tell us what you need.
        </h2>
        <p className="lede mx-auto mt-4 max-w-xl text-ink-soft">
          {contentText(content, "closing")}
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
      </section>
    </>
  );
}
