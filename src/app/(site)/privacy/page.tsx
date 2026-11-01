import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import {
  contentSections,
  contentText,
  getPublishedContent,
} from "@/lib/content";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "How GH Chikkis handles enquiry, customer and order data — WhatsApp permissions, analytics, cookies, retention and your choices.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  const content = await getPublishedContent("privacy");
  return (
    <LegalPage
      title={contentText(content, "title")}
      updated={contentText(content, "updated")}
      sections={contentSections(content, "sections")}
    />
  );
}
