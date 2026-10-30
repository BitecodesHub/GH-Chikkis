import Link from "next/link";
import type { ContentSection } from "@/lib/types";
import { slugify } from "@/lib/text";

export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: ContentSection[];
}) {
  const used = new Set<string>();
  const items = sections.map((section, index) => {
    const base = slugify(section.heading) || `section-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    return { ...section, id };
  });

  return (
    <>
      <header className="border-b border-line">
        <div className="container-page py-14 md:py-20">
          <p className="eyebrow">Legal</p>
          <h1 className="display-l mt-5">{title}</h1>
          <p className="meta mt-5">{updated}</p>
        </div>
      </header>

      <section className="container-page py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.28fr_0.72fr] lg:gap-16">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-28">
              <p className="eyebrow eyebrow-plain">On this page</p>
              <ol className="mt-4 space-y-2.5 text-[0.875rem]">
                {items.map((item, index) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-ink-soft transition-colors hover:text-ink">
                      <span className="meta mr-2 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                      {item.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="max-w-3xl">
            {items.map((item) => (
              <section
                key={item.id}
                id={item.id}
                className="scroll-mt-28 border-t border-line py-8 first:border-t-0 first:pt-0 last:pb-0"
              >
                <h2 className="display-s">{item.heading}</h2>
                <div className="prose-body mt-3">
                  {item.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <div className="surface mt-10 p-6">
              <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
                Questions about this page? Use the enquiry form and we will respond
                directly.
              </p>
              <Link href="/contact#enquiry" className="btn btn-outline mt-4">
                Contact GH Chikkis
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
