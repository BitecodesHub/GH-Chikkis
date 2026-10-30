import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import {
  contentFaqs,
  contentText,
  getPublishedContent,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Common questions about ordering chikki from GH Chikkis — prices, varieties, custom weights, delivery, ingredients and corporate orders.",
  alternates: { canonical: "/faqs" },
};

export default async function FaqsPage() {
  const content = await getPublishedContent("faqs");
  const faqs = contentFaqs(content, "faqs");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      {faqs.length > 0 ? <JsonLd data={faqSchema} /> : null}

      <PageHeader
        title={contentText(content, "title")}
        intro={contentText(content, "intro")}
      />

      <section className="container-page py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <FaqList faqs={faqs} />

          <div className="surface mt-12 flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center md:p-8">
            <div>
              <h2 className="display-s">Still have a question?</h2>
              <p className="mt-1 text-[0.9375rem] text-ink-soft">
                Ask us directly and we will give you a real answer.
              </p>
            </div>
            <Link href="/contact#enquiry" className="btn btn-solid shrink-0">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
