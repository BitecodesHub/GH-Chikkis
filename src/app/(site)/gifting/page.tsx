import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import {
  contentParagraphs,
  contentSections,
  contentText,
  getPublishedContent,
} from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { waLink, WHATSAPP_BULK_MESSAGE } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Bulk & Corporate Gifting",
  description:
    "Bulk, festive and corporate chikki gifting from GH Chikkis in Ahmedabad. Share the occasion, quantity and date and we will confirm what is possible directly.",
  alternates: { canonical: "/gifting" },
};

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
      <PageHeader
        eyebrow={contentText(content, "eyebrow")}
        title={contentText(content, "title")}
        intro={contentText(content, "intro")}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contact#enquiry" className="btn btn-solid">
            Start a bulk enquiry
          </Link>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              WhatsApp about gifting
            </a>
          ) : null}
        </div>
      </PageHeader>

      <section className="container-page py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.4fr_0.6fr] lg:gap-16">
          <div>
            <p className="eyebrow">Why gifting</p>
            <h2 className="display-m mt-4">A handmade gift says something a catalogue cannot.</h2>
          </div>
          <div className="prose-body max-w-xl">
            {body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {sections.map((section) => (
            <article key={section.heading} className="surface p-6 md:p-8">
              <h3 className="display-s">{section.heading}</h3>
              <div className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper-raised">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="display-m mt-4">From brief to box.</h2>
          </div>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {NEXT_STEPS.map((step, index) => (
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

      <section className="container-narrow py-16 text-center md:py-20">
        <p className="lede mx-auto max-w-xl">{contentText(content, "closing")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/contact#enquiry" className="btn btn-solid">
            Start an enquiry
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
