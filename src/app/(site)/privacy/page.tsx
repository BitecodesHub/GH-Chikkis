import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import {
  contentSections,
  contentText,
  getPublishedContent,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How GH Chikkis collects, uses and protects enquiry, customer and order information, including WhatsApp, analytics and staff access.",
  alternates: { canonical: "/privacy" },
};

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
