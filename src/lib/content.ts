import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { DEFAULT_CONTENT, CONTENT_SCHEMA } from "./content-schema";
import { getSessionContext } from "./auth/session";
import { hasPermission } from "./permissions";
import { nowIso } from "./dates";
import { primeRead, readCacheHas, readThrough, READ_TTL } from "./read-cache";
import { cleanSingleLine, cleanText } from "./text";
import type {
  ContentFaq,
  ContentPageKey,
  ContentSection,
  ContentStep,
  ContentVersion,
  PageContent,
  WebsiteContent,
} from "./types";

export const CONTENT_PREVIEW_COOKIE = "gh_content_preview";

interface WebsiteContentDoc extends Omit<WebsiteContent, "page"> {
  _id: string;
  page: ContentPageKey;
}

interface ContentVersionDoc extends Omit<ContentVersion, "id"> {
  _id: string;
}

function mergeContent(
  page: ContentPageKey,
  stored: PageContent | undefined,
): PageContent {
  return { ...DEFAULT_CONTENT[page], ...(stored ?? {}) };
}

export function contentIsEqual(a: PageContent, b: PageContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function stringList(value: unknown, maxItems: number, maxChars: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => cleanText(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeSections(value: unknown): ContentSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      heading: cleanSingleLine(item.heading, 200),
      body: stringList(item.body, 20, 4000),
    }))
    .filter((section) => section.heading.length > 0 || section.body.length > 0)
    .slice(0, 30);
}

function normalizeFaqs(value: unknown): ContentFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      question: cleanSingleLine(item.question, 300),
      answer: cleanText(item.answer, 2500),
    }))
    .filter((faq) => faq.question.length > 0 || faq.answer.length > 0)
    .slice(0, 50);
}

function normalizeSteps(value: unknown): ContentStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const note = cleanSingleLine(item.note, 500);
      return {
        title: cleanSingleLine(item.title, 200),
        body: cleanText(item.body, 2500),
        ...(note ? { note } : {}),
      };
    })
    .filter((step) => step.title.length > 0 || step.body.length > 0)
    .slice(0, 20);
}

export function normalizeContent(page: ContentPageKey, raw: unknown): PageContent {
  const source: Record<string, unknown> =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const fallback = DEFAULT_CONTENT[page];
  const definition = CONTENT_SCHEMA.find((entry) => entry.key === page);

  if (!definition) return { ...fallback };

  const normalized: PageContent = {};
  for (const field of definition.fields) {
    const value = source[field.key];
    if (field.type === "text") {
      normalized[field.key] = cleanSingleLine(value, 300);
    } else if (field.type === "textarea") {
      normalized[field.key] = cleanText(value, 5000);
    } else if (field.type === "paragraphs") {
      normalized[field.key] = stringList(value, 40, 4000);
    } else if (field.type === "sections") {
      normalized[field.key] = normalizeSections(value);
    } else if (field.type === "faqs") {
      normalized[field.key] = normalizeFaqs(value);
    } else if (field.type === "steps") {
      normalized[field.key] = normalizeSteps(value);
    }
  }
  return normalized;
}

export const getPreviewingContent = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies();
  if (cookieStore.get(CONTENT_PREVIEW_COOKIE)?.value !== "1") return false;
  const context = await getSessionContext();
  return Boolean(context && hasPermission(context.user, "content.edit"));
});

async function loadPublishedContent(
  pages: ContentPageKey[],
): Promise<PageContent[]> {
  const db = await getDb();
  const docs = await db
    .collection<WebsiteContentDoc>("website_content")
    .find({ page: { $in: pages } })
    .toArray();
  const byPage = new Map(docs.map((doc) => [doc.page, doc]));
  return pages.map((page) => {
    const doc = byPage.get(page);
    return doc ? mergeContent(page, doc.published) : DEFAULT_CONTENT[page];
  });
}

/**
 * The published copy behind a `page` key is read on every public render, so it
 * is shared between requests rather than fetched per page view.
 */
function publishedContent(page: ContentPageKey): Promise<PageContent> {
  return readThrough(`content:${page}`, READ_TTL.content, async () => {
    const [loaded] = await loadPublishedContent([page]);
    return loaded;
  });
}

export const getPublishedContent = cache(
  async (page: ContentPageKey): Promise<PageContent> => {
    if (!(await getPreviewingContent())) return publishedContent(page);
    const db = await getDb();
    const doc = await db
      .collection<WebsiteContentDoc>("website_content")
      .findOne({ page });
    if (!doc) return DEFAULT_CONTENT[page];
    return mergeContent(page, doc.draft);
  },
);

/**
 * Pages that need more than one document's copy — the home page reads its own
 * hero plus the process steps — ask once and get one query.
 */
export const getPublishedContentPages = cache(
  async (pages: ContentPageKey[]): Promise<PageContent[]> => {
    if (await getPreviewingContent()) {
      return Promise.all(pages.map((page) => getPublishedContent(page)));
    }
    const missing = pages.filter((page) => !readCacheHas(`content:${page}`));
    if (missing.length > 0) {
      const loaded = await loadPublishedContent(missing);
      missing.forEach((page, index) => {
        primeRead(`content:${page}`, READ_TTL.content, loaded[index]);
      });
    }
    return Promise.all(pages.map((page) => publishedContent(page)));
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

export async function listWebsiteContent(): Promise<WebsiteContent[]> {
  const db = await getDb();
  const docs = await db
    .collection<WebsiteContentDoc>("website_content")
    .find({})
    .toArray();
  const byPage = new Map(docs.map((doc) => [doc.page, doc]));
  return CONTENT_SCHEMA.map((definition) => {
    const doc = byPage.get(definition.key);
    if (!doc) {
      return {
        page: definition.key,
        draft: DEFAULT_CONTENT[definition.key],
        published: DEFAULT_CONTENT[definition.key],
        version: 1,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
        updatedByName: "Default content",
      } satisfies WebsiteContent;
    }
    const { _id, ...rest } = doc;
    void _id;
    return {
      ...rest,
      draft: mergeContent(definition.key, doc.draft),
      published: mergeContent(definition.key, doc.published),
    };
  });
}

export interface ContentActor {
  id: string;
  name: string;
}

export async function saveContentDraft(
  page: ContentPageKey,
  content: PageContent,
  actor: ContentActor,
): Promise<void> {
  const db = await getDb();
  const collection = db.collection<WebsiteContentDoc>("website_content");
  const existing = await collection.findOne({ page });
  const now = nowIso();
  if (!existing) {
    await collection.insertOne({
      _id: randomUUID(),
      page,
      draft: content,
      published: DEFAULT_CONTENT[page],
      version: 1,
      updatedAt: now,
      updatedBy: actor.id,
      updatedByName: actor.name,
    });
    return;
  }
  await collection.updateOne(
    { page },
    {
      $set: {
        draft: content,
        updatedAt: now,
        updatedBy: actor.id,
        updatedByName: actor.name,
      },
    },
  );
}

export async function publishWebsiteContent(
  page: ContentPageKey,
  content: PageContent,
  actor: ContentActor,
): Promise<{ version: number; changed: boolean }> {
  const db = await getDb();
  const collection = db.collection<WebsiteContentDoc>("website_content");
  const existing = await collection.findOne({ page });
  const currentPublished = mergeContent(page, existing?.published);

  if (existing && contentIsEqual(currentPublished, content)) {
    return { version: existing.version, changed: false };
  }

  const version = (existing?.version ?? 1) + 1;
  const now = nowIso();
  const versionDoc: ContentVersionDoc = {
    _id: randomUUID(),
    page,
    version,
    content,
    publishedAt: now,
    publishedBy: actor.id,
    publishedByName: actor.name,
  };
  await db.collection<ContentVersionDoc>("content_versions").insertOne(versionDoc);

  if (!existing) {
    await collection.insertOne({
      _id: randomUUID(),
      page,
      draft: content,
      published: content,
      version,
      updatedAt: now,
      updatedBy: actor.id,
      updatedByName: actor.name,
      publishedAt: now,
      publishedBy: actor.id,
    });
  } else {
    await collection.updateOne(
      { page },
      {
        $set: {
          draft: content,
          published: content,
          version,
          updatedAt: now,
          updatedBy: actor.id,
          updatedByName: actor.name,
          publishedAt: now,
          publishedBy: actor.id,
        },
      },
    );
  }
  primeRead(`content:${page}`, READ_TTL.content, mergeContent(page, content));
  return { version, changed: true };
}

export async function discardContentDraft(
  page: ContentPageKey,
  actor: ContentActor,
): Promise<void> {
  const current = await getWebsiteContent(page);
  await saveContentDraft(page, current.published, actor);
}

export async function listContentVersions(
  page: ContentPageKey,
  limit = 20,
): Promise<ContentVersion[]> {
  const db = await getDb();
  const docs = await db
    .collection<ContentVersionDoc>("content_versions")
    .find({ page })
    .sort({ version: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
}

export async function getContentVersion(id: string): Promise<ContentVersion | null> {
  const db = await getDb();
  const doc = await db
    .collection<ContentVersionDoc>("content_versions")
    .findOne({ _id: id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
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

/**
 * A sitemap can only be trusted if <lastmod> means something, so it is taken
 * from when each page was actually published rather than from request time.
 */
export async function listPublishedDates(): Promise<Record<string, Date>> {
  const db = await getDb();
  const docs = await db
    .collection<{ page: ContentPageKey; publishedAt?: string; updatedAt: string }>(
      "website_content",
    )
    .find({})
    .toArray();
  const dates: Record<string, Date> = {};
  for (const doc of docs) {
    const value = doc.publishedAt ?? doc.updatedAt;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) dates[doc.page] = parsed;
  }
  return dates;
}
