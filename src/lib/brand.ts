import { existsSync } from "node:fs";
import path from "node:path";

const RELATIVE_PATH = path.join("public", "brand", "logo.png");
export const BRAND_LOGO_SRC = "/brand/logo.png";

/**
 * The Owner drops the artwork at public/brand/logo.png and it takes over the
 * header, the footer and the link-preview card with no code change. Checked at
 * request time because the file is not in the repository yet.
 */
export function brandLogoSrc(): string | null {
  return existsSync(path.join(process.cwd(), RELATIVE_PATH)) ? BRAND_LOGO_SRC : null;
}
