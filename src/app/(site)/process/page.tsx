import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Droplets, Layers, Scissors, Package } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import {
  contentSteps,
  contentText,
  getPublishedContent,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Handmade Process",
  description:
    "How GH Chikkis is made by hand in Ahmedabad: cooking, pouring, pressing, cutting and wrapping. The stages of a family kitchen.",
  alternates: { canonical: "/process" },
};

const ICONS = [Flame, Droplets, Layers, Scissors, Package];

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
          {steps.map((step, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <li
                key={step.title}
                className="grid gap-5 border-t border-line py-9 first:border-t-0 first:pt-0 sm:grid-cols-[auto_1fr] sm:gap-8"
              >
                <div className="flex items-center gap-4 sm:flex-col sm:items-start">
                  <span className="meta tabular-nums">0{index + 1}</span>
                  <span className="inline-flex size-12 items-center justify-center border border-line-strong text-olive">
                    <Icon aria-hidden="true" size={22} strokeWidth={1.25} />
                  </span>
                </div>
                <div>
                  <h2 className="display-m text-[clamp(1.6rem,3vw,2.2rem)]">{step.title}</h2>
                  <p className="mt-3 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                  {step.note ? <p className="meta mt-3">{step.note}</p> : null}
                </div>
              </li>
            );
          })}
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
