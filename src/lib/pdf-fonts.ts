import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

let fontBytesPromise: Promise<{ regular: Buffer; semibold: Buffer }> | null = null;

export function loadFontBytes() {
  if (!fontBytesPromise) {
    const dir = path.join(process.cwd(), "src", "assets", "fonts");
    fontBytesPromise = Promise.all([
      readFile(path.join(dir, "NotoSans-Regular.ttf")),
      readFile(path.join(dir, "NotoSans-SemiBold.ttf")),
    ]).then(([regular, semibold]) => ({ regular, semibold }));
  }
  return fontBytesPromise;
}
