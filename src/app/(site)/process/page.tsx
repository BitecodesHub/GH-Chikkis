import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { ProcessFilm } from "@/components/site/process-film";
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
        <ProcessFilm steps={steps} />

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
