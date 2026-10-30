import type { Metadata, Viewport } from "next";
import { Archivo, Fraunces } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "GH Chikkis — Handmade chikki from Ahmedabad",
    template: "%s — GH Chikkis",
  },
  description:
    "GH Chikkis is a family-run, homemade chikki brand in Ahmedabad, run by sisters Gopi Shah and Himanisha. Seven varieties, made by hand since 2018.",
  applicationName: "GH Chikkis",
  authors: [{ name: "GH Chikkis" }],
  keywords: [
    "GH Chikkis",
    "chikki Ahmedabad",
    "handmade chikki",
    "gud chikki",
    "groundnut chikki",
    "til chikki",
    "corporate gifting Ahmedabad",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "GH Chikkis",
    title: "GH Chikkis — Handmade chikki from Ahmedabad",
    description:
      "A family-run chikki kitchen in Ahmedabad. Seven varieties, made by hand since 2018.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "GH Chikkis — Handmade chikki from Ahmedabad",
    description:
      "A family-run chikki kitchen in Ahmedabad. Seven varieties, made by hand since 2018.",
  },
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
      className={`${archivo.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
