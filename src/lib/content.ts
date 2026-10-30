import { cache } from "react";
import { getDb } from "./db";
import { DEFAULT_CONTENT } from "./content-schema";
import type {
  ContentFaq,
  ContentPageKey,
  ContentSection,
  ContentStep,
  PageContent,
  WebsiteContent,
} from "./types";

interface WebsiteContentDoc extends Omit<WebsiteContent, "page"> {
  _id: string;
  page: ContentPageKey;
}

function mergeContent(
  page: ContentPageKey,
  stored: PageContent | undefined,
): PageContent {
  return { ...DEFAULT_CONTENT[page], ...(stored ?? {}) };
}

export const getPublishedContent = cache(
  async (page: ContentPageKey): Promise<PageContent> => {
    const db = await getDb();
    const doc = await db
      .collection<WebsiteContentDoc>("website_content")
      .findOne({ page });
    if (!doc) return DEFAULT_CONTENT[page];
    return mergeContent(page, doc.published);
  },
);

export async function getWebsiteContent(
  page: ContentPageKey,
): Promise<WebsiteContent> {
  const db = await getDb();
  const doc = await db
    .collection<WebsiteContentDoc>("website_content")
    .findOne({ page });
  if (!doc) {
    return {
      page,
      draft: DEFAULT_CONTENT[page],
      published: DEFAULT_CONTENT[page],
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
      updatedByName: "Default content",
    };
  }
  const { _id, ...rest } = doc;
  void _id;
  return {
    ...rest,
    draft: mergeContent(page, doc.draft),
    published: mergeContent(page, doc.published),
  };
}

export function contentText(content: PageContent, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

export function contentParagraphs(content: PageContent, key: string): string[] {
  const value = content[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function contentSections(content: PageContent, key: string): ContentSection[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ContentSection =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ContentSection).heading === "string" &&
      Array.isArray((item as ContentSection).body),
  );
}

export function contentFaqs(content: PageContent, key: string): ContentFaq[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ContentFaq =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ContentFaq).question === "string" &&
      typeof (item as ContentFaq).answer === "string",
  );
}

export function contentSteps(content: PageContent, key: string): ContentStep[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ContentStep =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ContentStep).title === "string" &&
      typeof (item as ContentStep).body === "string",
  );
}
