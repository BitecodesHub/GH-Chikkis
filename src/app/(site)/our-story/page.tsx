import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { Diamond } from "@/components/ui/diamond";
import { brandLogoSrc, founderPhotos } from "@/lib/brand";
import {
  contentParagraphs,
  contentSteps,
  contentText,
  getPublishedContent,
} from "@/lib/content";
import { BRAND_COUPLET, BRAND_TAGLINE, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Our Story",
  description:
    "The family kitchen behind GH Chikkis: Gopi Shah and Himani Shah, the recipes they keep, and how a home habit became a handmade brand.",
  path: "/our-story",
});

const FACTS = [
  { label: "Founders", value: "Gopi Shah & Himani Shah" },
  { label: "Kitchen", value: "Ahmedabad, Gujarat" },
  { label: "Made", value: "By hand, in small batches" },
  { label: "Established", value: "2018" },
];

export default async function StoryPage() {
  const content = await getPublishedContent("story");
  const storyParagraphs = contentParagraphs(content, "storyBody");
  const foundersParagraphs = contentParagraphs(content, "foundersBody");
  const timeline = contentSteps(content, "timeline");
  const photos = founderPhotos();
  const logoSrc = brandLogoSrc();

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
            {logoSrc ? (
              // The Owner asked for the artwork to hold the space the big
              // tagline used to fill. Without a logo file the words stand in.
              <Image
                src={logoSrc}
                alt=""
                width={650}
                height={876}
                sizes="(min-width: 1024px) 30vw, 90vw"
                className="mx-auto h-auto w-[min(15rem,72%)] lg:w-full"
              />
            ) : (
              <p aria-hidden="true" className="display-l select-none text-paper-deep">
                Ghar ki
                <br />
                Gud-crafted
                <br />
                Chikki&apos;s
              </p>
            )}
            <p className="meta mt-4 text-center font-semibold tracking-[0.14em] text-ink-soft lg:text-left">
              {BRAND_TAGLINE}
            </p>
            <p className="font-display mt-3 text-[1.0625rem] italic leading-relaxed text-ink-soft">
              {BRAND_COUPLET}
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
                Two sisters, one kitchen, and a family recipe kept at the centre.
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
          {photos.length > 0 ? (
            <ul className="mt-2 grid gap-6 sm:grid-cols-2 md:col-span-2">
              {photos.map((photo) => (
                <li key={photo.src}>
                  <div className="overflow-hidden rounded-[1.5rem] border border-line bg-paper">
                    <Image
                      src={photo.src}
                      alt={`${photo.name}, co-founder of GH Chikkis`}
                      width={640}
                      height={800}
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </div>
                  <p className="mt-3 text-center font-display text-[1.0625rem] font-medium">
                    {photo.name}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="container-narrow py-16 md:py-20">
        <h2 className="display-m">{contentText(content, "timelineHeading")}</h2>
        {contentText(content, "timelineIntro") ? (
          <p className="lede mt-3 text-ink-soft">{contentText(content, "timelineIntro")}</p>
        ) : null}
        <ol className="mt-8 space-y-6 border-l border-line-strong pl-6">
          {timeline.map((entry) => (
            <li key={entry.title || entry.body} className="relative">
              <Diamond size="sm" className="absolute -left-[1.72rem] top-2" />
              {entry.note ? (
                <p className="meta text-brass">{entry.note}</p>
              ) : null}
              <h3 className="display-s mt-1">{entry.title}</h3>
              {entry.body ? (
                <p className="mt-2 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
                  {entry.body}
                </p>
              ) : null}
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
