import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { brandLogoSrc } from "@/lib/brand";
import { BRAND_COUPLET, BRAND_NAME, BRAND_TAGLINE } from "@/lib/seo";

export const revalidate = 86400;

const PAPER = "#f6f1e6";
const INK = "#221d16";
const INK_SOFT = "#57503f";
const OLIVE = "#46512f";
const BRASS = "#8a6a2f";
const LINE = "#d9cdb4";

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const ROOT = process.cwd();

/** Only ever joined with a filename from `brandLogoSrc()`, so the scan stays scoped to public/brand. */
const BRAND_DIR = path.join(ROOT, "public", "brand");

async function jpegDataUrl(absolute: string): Promise<string> {
  const buffer = await readFile(absolute);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

/** The Owner's artwork is optional, so a missing file must not break previews. */
async function logoDataUrl(): Promise<string | null> {
  const src = brandLogoSrc();
  if (!src) return null;
  const fileName = src.slice("/brand/".length);
  const mime = MIME_BY_EXTENSION[fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()];
  if (!mime) return null;
  try {
    const buffer = await readFile(path.join(BRAND_DIR, /* turbopackIgnore: true */ fileName));
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET() {
  const [fonts, photo, logo] = await Promise.all([
    Promise.all([
      readFile(path.join(ROOT, "src", "assets", "fonts", "NotoSans-Regular.ttf")),
      readFile(path.join(ROOT, "src", "assets", "fonts", "NotoSans-SemiBold.ttf")),
    ]),
    jpegDataUrl(path.join(ROOT, "public", "products", "groundnut-chikki.jpg")),
    logoDataUrl(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Noto",
          backgroundColor: PAPER,
          padding: 44,
          gap: 40,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: BRASS,
              fontSize: 22,
              letterSpacing: 6,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: BRASS,
                transform: "rotate(45deg)",
              }}
            />
            HANDMADE CHIKKI · AHMEDABAD
          </div>

          {logo ? (
            <div
              style={{
                display: "flex",
                marginTop: 8,
                width: 220,
                height: 250,
                alignItems: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt={BRAND_NAME}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: 104,
                fontWeight: 600,
                lineHeight: 1,
                color: INK,
                letterSpacing: -3,
              }}
            >
              {BRAND_NAME}
            </div>
          )}

          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 40,
              fontWeight: 600,
              color: OLIVE,
            }}
          >
            {BRAND_TAGLINE}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: 25,
              color: INK_SOFT,
            }}
          >
            {BRAND_COUPLET}
          </div>

          <div style={{ display: "flex", marginTop: "auto", paddingTop: 30 }}>
            <div style={{ width: "100%", height: 2, backgroundColor: LINE }} />
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 25,
              color: INK_SOFT,
              lineHeight: 1.45,
            }}
          >
            Seven varieties made by hand · Bulk & festive gifting
          </div>
        </div>

        <div
          style={{
            width: 400,
            display: "flex",
            borderRadius: 28,
            overflow: "hidden",
            border: `6px solid #fbf7ee`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            width={400}
            height={542}
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Noto", data: fonts[0], weight: 400 },
        { name: "Noto", data: fonts[1], weight: 600 },
      ],
    },
  );
}
