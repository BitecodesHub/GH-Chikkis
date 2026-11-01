import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/seo";

export const revalidate = 86400;

const PAPER = "#f6f1e6";
const INK = "#221d16";
const INK_SOFT = "#57503f";
const OLIVE = "#46512f";
const BRASS = "#8a6a2f";
const LINE = "#d9cdb4";

async function asset(...segments: string[]): Promise<string> {
  const buffer = await readFile(path.join(process.cwd(), ...segments));
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

export async function GET() {
  const [fonts, photo] = await Promise.all([
    Promise.all([
      readFile(path.join(process.cwd(), "src", "assets", "fonts", "NotoSans-Regular.ttf")),
      readFile(path.join(process.cwd(), "src", "assets", "fonts", "NotoSans-SemiBold.ttf")),
    ]),
    asset("public", "products", "groundnut-chikki.jpg"),
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
