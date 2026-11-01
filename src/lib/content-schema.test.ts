import { describe, expect, it } from "vitest";
import { CONTENT_SCHEMA, DEFAULT_CONTENT } from "./content-schema";
import { BRAND_COUPLET } from "./seo";
import { CONTENT_PAGES } from "./types";
import type { PageContent } from "./types";

/** Flattens a page's content into every string the website can render. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(strings);
  }
  return [];
}

function pageStrings(page: keyof typeof DEFAULT_CONTENT): string {
  return strings(DEFAULT_CONTENT[page]).join(" \u0000 ");
}

function allStrings(): string {
  return Object.keys(DEFAULT_CONTENT)
    .map((page) => pageStrings(page as keyof typeof DEFAULT_CONTENT))
    .join(" \u0000 ");
}

describe("content schema and defaults stay in step", () => {
  it("covers every editable page", () => {
    expect(CONTENT_SCHEMA.map((def) => def.key).sort()).toEqual([...CONTENT_PAGES].sort());
  });

  it("declares a field for every default value, so the admin can edit it", () => {
    for (const def of CONTENT_SCHEMA) {
      const declared = new Set(def.fields.map((field) => field.key));
      const stored = Object.keys(DEFAULT_CONTENT[def.key] as PageContent);
      expect(stored.filter((key) => !declared.has(key))).toEqual([]);
      expect([...declared].filter((key) => !stored.includes(key))).toEqual([]);
    }
  });

  it("points each page at a distinct public route", () => {
    const paths = CONTENT_SCHEMA.map((def) => def.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("the owner's copy rules", () => {
  it("never mentions the retired variety or the retired founder spelling", () => {
    const text = allStrings();
    for (const retired of ["Mawa", "Himanisha", "equal partners", "Partnership"]) {
      expect(text).not.toContain(retired);
    }
  });

  it("names the founders the way they asked to be named", () => {
    expect(pageStrings("story")).toContain("Himani Shah");
    expect(pageStrings("home")).toContain("Himani");
  });

  it("opens the hero by naming the sweet, with the couplet above it", () => {
    const home = DEFAULT_CONTENT.home;
    expect(home.heroEyebrow).toBe(BRAND_COUPLET);
    expect(`${home.heroTitle} ${home.heroTitleAccent}`).toMatch(/Chikki.*hand/);
  });

  it("lists the whole current collection in the varieties answer", () => {
    const faqs = DEFAULT_CONTENT.faqs.faqs as { question: string; answer: string }[];
    const varieties = faqs.find((faq) => faq.question === "What varieties do you make?");
    expect(varieties?.answer).toContain("Mamra Chikki");
    expect(varieties?.answer).toContain("Daliya Chikki");
    expect(varieties?.answer).toContain("Groundnut Chikki");
  });

  it("answers shipping and payment in the owner's words", () => {
    const faqs = DEFAULT_CONTENT.faqs.faqs as { question: string; answer: string }[];
    expect(
      faqs.find((faq) => faq.question === "Do you ship outside Ahmedabad?")?.answer,
    ).toBe(
      "Yes! We deliver across all Indian states and select international destinations. " +
        "Shipping charges are borne by the customer and vary by location.",
    );
    expect(faqs.find((faq) => faq.question === "How do I pay?")?.answer).toContain(
      "We accept both cash and online payments",
    );
  });

  it("keeps the collection down to the seven varieties it sells", () => {
    expect(DEFAULT_CONTENT.home.collectionIntro).toContain("Seven varieties");
    expect(DEFAULT_CONTENT.collection.title).toContain("Seven varieties");
  });
});

describe("claims the brand cannot back up stay out", () => {
  it("makes no certification, factory or scale promise", () => {
    const text = allStrings().toLowerCase();
    for (const claim of ["fssai", "iso certified", "organic certified", "since 19", "shop no"]) {
      expect(text).not.toContain(claim);
    }
  });

  it("says plainly that prices are shared directly", () => {
    expect(pageStrings("collection")).toContain("Prices are not shown online");
  });
});
