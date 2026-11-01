import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { env } from "@/lib/env";
import {
  BRAND_NAME,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "@/lib/seo";
import "./globals.css";

// A soft-serif with cut terminals for the voice of the brand, a plain humanist
// sans for everything the reader has to parse. Both are variable, so optical
// sizing can do the work of a separate display cut.
const displayFace = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-display-face",
  display: "swap",
});

const bodyFace = Instrument_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-body-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: SITE_TITLE,
    template: `%s — ${BRAND_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: BRAND_NAME,
  authors: [{ name: BRAND_NAME }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  formatDetection: { telephone: false },
  keywords: [
    "GH Chikkis",
    "chikki Ahmedabad",
    "handmade chikki",
    "gud chikki",
    "groundnut chikki",
    "til chikki",
    "mamra chikki",
    "corporate gifting Ahmedabad",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e6",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${bodyFace.variable} ${displayFace.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
