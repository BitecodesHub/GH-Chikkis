import type { Metadata } from "next";
import { env } from "./env";

export const BRAND_NAME = "GH Chikkis";
export const BRAND_TAGLINE = "Ghar ki Gudcrafted Chikki's";
/** The Gujarati couplet the Owner asks for wherever the brand needs a desi touch. */
export const BRAND_COUPLET = "Gud ki mithaas, Ghee ki richness.";
export const SITE_TITLE = `${BRAND_NAME} — Handmade chikki from Ahmedabad`;
export const SITE_DESCRIPTION =
  "Two sisters, one family kitchen in Ahmedabad. Seven chikki varieties made by hand, with prices and packaging confirmed directly.";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${env.appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageMetaOptions {
  /** Omit for the home page so the default document title is used. */
  title?: string;
  description: string;
  path: string;
  imageSrc?: string;
  imageAlt?: string;
}

/**
 * Every public route gets one call so a title, a canonical and a link-preview
 * card can never drift apart from each other.
 */
export function pageMeta({
  title,
  description,
  path,
  imageSrc = "/og",
  imageAlt = `${BRAND_NAME} — handmade chikki from a family kitchen in Ahmedabad`,
}: PageMetaOptions): Metadata {
  const shareTitle = title ? `${title} — ${BRAND_NAME}` : SITE_TITLE;
  const images = [{ url: imageSrc, width: 1200, height: 630, alt: imageAlt }];

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: absoluteUrl(path),
      siteName: BRAND_NAME,
      locale: "en_IN",
      title: shareTitle,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images,
    },
  };
}
