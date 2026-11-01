import { describe, expect, it } from "vitest";
import {
  BRAND_COUPLET,
  BRAND_NAME,
  BRAND_TAGLINE,
  SITE_DESCRIPTION,
  SITE_TITLE,
  absoluteUrl,
  pageMeta,
} from "./seo";
import { env } from "./env";

describe("absoluteUrl", () => {
  it("builds a full URL from a site path", () => {
    expect(absoluteUrl("/collection/groundnut-chikki")).toBe(
      `${env.appUrl}/collection/groundnut-chikki`,
    );
    expect(absoluteUrl("privacy")).toBe(`${env.appUrl}/privacy`);
  });

  it("leaves an absolute URL alone", () => {
    expect(absoluteUrl("https://example.com/a")).toBe("https://example.com/a");
  });

  it("never hands Google a relative or trailing-slash origin", () => {
    expect(env.appUrl).toMatch(/^https?:\/\/[^/]+$/);
  });
});

describe("pageMeta", () => {
  const meta = pageMeta({
    title: "Our story",
    description: "Two sisters and a family kitchen in Ahmedabad.",
    path: "/our-story",
  });

  it("puts the title, canonical and preview card on the same page", () => {
    expect(meta.title).toBe("Our story");
    expect(meta.description).toBe("Two sisters and a family kitchen in Ahmedabad.");
    expect(meta.alternates?.canonical).toBe("/our-story");
    expect(meta.openGraph?.url).toBe(`${env.appUrl}/our-story`);
    expect(meta.openGraph?.siteName).toBe(BRAND_NAME);
  });

  it("signs the preview card so a shared link reads as the brand", () => {
    expect(meta).toMatchObject({
      openGraph: { title: `Our story — ${BRAND_NAME}` },
      twitter: { card: "summary_large_image", title: `Our story — ${BRAND_NAME}` },
    });
  });

  it("always ships an image with dimensions and alt text", () => {
    expect(meta).toMatchObject({
      openGraph: {
        images: [{ width: 1200, height: 630, alt: expect.stringContaining("chikki") }],
      },
      twitter: { images: [expect.objectContaining({ url: "/og" })] },
    });
  });

  it("lets the home page keep the document title by passing none", () => {
    const home = pageMeta({ description: SITE_DESCRIPTION, path: "/" });
    expect(home.title).toBeUndefined();
    expect(home.openGraph?.title).toBe(SITE_TITLE);
    expect(home.alternates?.canonical).toBe("/");
  });

  it("uses the brand line as the fallback description source, not a placeholder", () => {
    expect(SITE_TITLE).toContain("chikki");
    expect(SITE_DESCRIPTION).toContain("Ahmedabad");
    expect(BRAND_TAGLINE).toBe("Ghar ki Gud-crafted Chikki's");
    expect(BRAND_COUPLET).toBe("Gud ki mithaas, Ghee ki richness.");
  });
});
