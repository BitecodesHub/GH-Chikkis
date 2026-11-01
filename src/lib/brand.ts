import { existsSync } from "node:fs";
import path from "node:path";

const BRAND_DIR = path.join("public", "brand");
const IMAGE_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp"] as const;

/** Returns the served path of the first matching `public/brand/<base>.<ext>`. */
function firstImage(base: string): string | null {
  for (const ext of IMAGE_EXTENSIONS) {
    if (existsSync(path.join(process.cwd(), BRAND_DIR, `${base}.${ext}`))) {
      return `/brand/${base}.${ext}`;
    }
  }
  return null;
}

/**
 * The Owner drops the artwork at public/brand/logo.png (or .svg/.jpg/.webp) and
 * it takes over the header, the footer, the workspace and the link-preview card
 * with no code change. Checked at request time because the files arrive after
 * the repository is set up.
 */
export function brandLogoSrc(): string | null {
  return firstImage("logo");
}

export interface FounderPhoto {
  name: string;
  src: string;
}

/**
 * Portraits for the Our Story page, in the order they should read: drop in
 * public/brand/founder-gopi.jpg and public/brand/founder-himani.jpg. A missing
 * file means no frame, so the page never shows an empty placeholder.
 */
export function founderPhotos(): FounderPhoto[] {
  return [
    { person: "founder-gopi", name: "Gopi Shah" },
    { person: "founder-himani", name: "Himani Shah" },
  ].flatMap((entry) => {
    const src = firstImage(entry.person);
    return src ? [{ name: entry.name, src }] : [];
  });
}
