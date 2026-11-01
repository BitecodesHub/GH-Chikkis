import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { ProcessArt } from "@/components/site/line-art";
import {
  contentSteps,
  contentText,
  getPublishedContent,
} from "@/lib/content";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Handmade Process",
  description:
    "How chikki is made by hand in Ahmedabad: cooking the jaggery, pouring, pressing, cutting and wrapping. The five stages of a family kitchen.",
  path: "/process",
});

export default async function ProcessPage() {
  const content = await getPublishedContent("process");
  const steps = contentSteps(content, "steps");

  return (
    <>
      <PageHeader
        eyebrow={contentText(content, "eyebrow")}
        title={contentText(content, "title")}
        intro={contentText(content, "intro")}
      />

      <section className="container-page py-14 md:py-20">
        <ol className="mx-auto max-w-3xl">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-5 border-t border-line py-9 first:border-t-0 first:pt-0 sm:grid-cols-[auto_1fr] sm:gap-8"
            >
              <div className="flex items-center gap-5 sm:flex-col sm:items-start sm:gap-4">
                <span className="meta tabular-nums">0{index + 1}</span>
                <ProcessArt step={index} className="w-[6.5rem] shrink-0 sm:w-[7.75rem]" />
              </div>
              <div>
                <h2 className="display-m text-[clamp(1.6rem,3vw,2.2rem)]">{step.title}</h2>
                <p className="mt-3 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
                {step.note ? <p className="meta mt-3">{step.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-10 max-w-3xl">
          <p className="surface p-6 text-[0.9375rem] leading-relaxed text-ink-soft md:p-8">
            {contentText(content, "closing")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/collection" className="btn btn-solid">
              See the varieties
            </Link>
            <Link href="/contact#enquiry" className="btn btn-outline">
              Ask about the process
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
