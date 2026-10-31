import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { Diamond } from "@/components/ui/diamond";
import {
  contentParagraphs,
  contentText,
  getPublishedContent,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "GH Chikkis is a family-run, homemade chikki brand in Ahmedabad, established in 2018 and run by sisters Gopi Shah and Himanisha as equal partners.",
  alternates: { canonical: "/our-story" },
};

const FACTS = [
  { label: "Established", value: "2018" },
  { label: "Founders", value: "Gopi Shah & Himanisha" },
  { label: "Partnership", value: "Equal partners" },
  { label: "Kitchen", value: "Ahmedabad, Gujarat" },
];

export default async function StoryPage() {
  const content = await getPublishedContent("story");
  const storyParagraphs = contentParagraphs(content, "storyBody");
  const foundersParagraphs = contentParagraphs(content, "foundersBody");
  const timeline = contentParagraphs(content, "timeline");

  return (
    <>
      <PageHeader
        eyebrow={contentText(content, "eyebrow")}
        title={contentText(content, "title")}
        intro={contentText(content, "intro")}
      />

      <section className="container-page py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.36fr_0.64fr] lg:gap-16">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p
              aria-hidden="true"
              className="font-display text-[clamp(4rem,10vw,7.5rem)] leading-[0.85] tracking-[-0.04em] text-paper-deep"
            >
              EST.
              <br />
              2018
            </p>
            <dl className="mt-8 border-t border-line">
              {FACTS.map((fact) => (
                <div key={fact.label} className="border-b border-line py-3">
                  <dt className="meta">{fact.label}</dt>
                  <dd className="mt-0.5 text-[0.9375rem] font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </aside>

          <div className="max-w-2xl">
            <div className="prose-body text-[1.0625rem]">
              {storyParagraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-12 border-l-2 border-brass pl-6">
              <p className="font-display text-[clamp(1.5rem,3vw,2rem)] font-medium leading-snug text-ink">
                Two sisters, one kitchen, and a family recipe kept at the centre since
                2018.
              </p>
              <p className="meta mt-3">GH Chikkis · Ahmedabad</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-raised">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-20">
          <div>
            <p className="eyebrow">The founders</p>
            <h2 className="display-m mt-4">{contentText(content, "foundersHeading")}</h2>
          </div>
          <div className="prose-body max-w-xl">
            {foundersParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="container-narrow py-16 md:py-20">
        <h2 className="display-m">{contentText(content, "timelineHeading")}</h2>
        <ol className="mt-8 space-y-5 border-l border-line-strong pl-6">
          {timeline.map((entry) => (
            <li key={entry.slice(0, 40)} className="relative">
              <Diamond size="sm" className="absolute -left-[1.72rem] top-2.5" />
              <p className="text-[1.0625rem] leading-relaxed text-ink-soft">{entry}</p>
            </li>
          ))}
        </ol>

        <p className="lede mt-12 border-t border-line pt-8">
          {contentText(content, "closing")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/collection" className="btn btn-solid">
            Explore the collection
          </Link>
          <Link href="/contact#enquiry" className="btn btn-outline">
            Ask us a question
          </Link>
        </div>
      </section>
    </>
  );
}
