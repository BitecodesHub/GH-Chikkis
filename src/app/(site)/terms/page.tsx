import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import {
  contentSections,
  contentText,
  getPublishedContent,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for using the GH Chikkis website and sending an enquiry. The website does not sell products online or take payment.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const content = await getPublishedContent("terms");
  return (
    <LegalPage
      title={contentText(content, "title")}
      updated={contentText(content, "updated")}
      sections={contentSections(content, "sections")}
    />
  );
}
