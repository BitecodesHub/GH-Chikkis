import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import {
  contentSections,
  contentText,
  getPublishedContent,
} from "@/lib/content";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Terms",
  description:
    "Terms for using the GH Chikkis website: enquiries are not orders, prices are confirmed directly, and nothing here is nutritional advice.",
  path: "/terms",
});

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
