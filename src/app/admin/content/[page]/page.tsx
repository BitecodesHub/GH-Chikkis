import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Eye, RotateCcw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ContentEditor } from "@/components/admin/content-editor";
import { requirePermission } from "@/lib/auth/session";
import {
  getWebsiteContent,
  listContentVersions,
} from "@/lib/content";
import { pageDef } from "@/lib/content-schema";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { hasPermission } from "@/lib/permissions";
import { CONTENT_PAGES, type ContentPageKey } from "@/lib/types";
import {
  discardDraftAction,
  restoreVersionAction,
  startPreviewAction,
} from "../actions";

interface PageProps {
  params: Promise<{ page: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toPageKey(value: string): ContentPageKey | null {
  return (CONTENT_PAGES as readonly string[]).includes(value)
    ? (value as ContentPageKey)
    : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page } = await params;
  const key = toPageKey(page);
  return { title: key ? `Edit ${pageDef(key).label}` : "Website content" };
}

export default async function EditContentPage({ params, searchParams }: PageProps) {
  const { user } = await requirePermission("content.edit");
  const { page: pageParam } = await params;
  const page = toPageKey(pageParam);
  if (!page) notFound();

  const definition = pageDef(page);
  const [content, versions, query] = await Promise.all([
    getWebsiteContent(page),
    listContentVersions(page),
    searchParams,
  ]);
  const canPublish = hasPermission(user, "content.publish");
  const hasUnpublished =
    JSON.stringify(content.draft) !== JSON.stringify(content.published);

  const restored = typeof query.restored === "string" ? query.restored : "";
  const discarded = query.discarded === "1";
  const missing = query.missing === "1";

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Catalogue / Website content"
        title={definition.label}
        description={`${definition.path} · Published version ${content.version} · Preview uses the saved draft, not unsaved edits.`}
        actions={
          <>
            <Link href="/admin/content" className="btn btn-outline btn-sm">
              <ArrowLeft aria-hidden="true" className="size-4" />
              All pages
            </Link>
            <Link
              href={definition.path}
              target="_blank"
              rel="noreferrer"
              className="btn btn-quiet btn-sm"
            >
              <ArrowUpRight aria-hidden="true" className="size-4" />
              View live
            </Link>
            <form action={startPreviewAction}>
              <input type="hidden" name="page" value={page} />
              <button type="submit" className="btn btn-quiet btn-sm">
                <Eye aria-hidden="true" className="size-4" />
                Preview draft
              </button>
            </form>
          </>
        }
      />

      {restored ? (
        <p
          role="status"
          className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]"
        >
          Version {restored} was copied into the draft. Preview it, then publish when
          ready.
        </p>
      ) : null}
      {discarded ? (
        <p
          role="status"
          className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]"
        >
          The unpublished draft was discarded. The page matches the published version.
        </p>
      ) : null}
      {missing ? (
        <p
          role="alert"
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]"
        >
          That saved version could not be found.
        </p>
      ) : null}

      <section
        className="surface grid gap-5 p-5 sm:grid-cols-3"
        aria-label="Publishing status"
      >
        <div>
          <p className="meta">Published</p>
          <p className="mt-1 text-[0.9375rem] font-medium">Version {content.version}</p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
            {content.publishedAt ? formatDateTime(content.publishedAt) : "Default content"}
          </p>
        </div>
        <div>
          <p className="meta">Draft</p>
          <p className="mt-1 text-[0.9375rem] font-medium">
            {hasUnpublished ? "Ahead of the live page" : "Matches the live page"}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
            Updated {relativeTime(content.updatedAt)}
            {content.updatedByName ? ` by ${content.updatedByName}` : ""}
          </p>
        </div>
        <div className="sm:text-right">
          {hasUnpublished ? (
            <form action={discardDraftAction}>
              <input type="hidden" name="page" value={page} />
              <button type="submit" className="btn btn-quiet btn-sm text-terracotta">
                <RotateCcw aria-hidden="true" className="size-4" />
                Discard unpublished draft
              </button>
            </form>
          ) : (
            <p className="text-[0.8125rem] text-ink-muted">
              Publish to create a new version. Visitors see published content only.
            </p>
          )}
        </div>
      </section>

      <ContentEditor
        page={definition}
        draft={content.draft}
        published={content.published}
        canPublish={canPublish}
      />

      <section className="surface" aria-labelledby="version-history">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2
            id="version-history"
            className="font-[family-name:var(--font-display)] text-xl"
          >
            Version history
          </h2>
          <span className="meta">{versions.length} saved versions</span>
        </div>
        {versions.length === 0 ? (
          <p className="px-5 py-8 text-[0.875rem] text-ink-muted">
            Publishing this page will create the first version in its history.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[0.9375rem] font-medium">
                    Version {version.version}
                  </p>
                  <p className="text-[0.8125rem] text-ink-muted">
                    {formatDateTime(version.publishedAt)}
                    {version.publishedByName ? ` · ${version.publishedByName}` : ""}
                  </p>
                </div>
                <form action={restoreVersionAction}>
                  <input type="hidden" name="page" value={page} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <button type="submit" className="btn btn-outline btn-sm">
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Restore to draft
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[0.75rem] text-ink-muted">
        Restoring an older version only replaces the draft; it does not change the live
        page until published. Every publish and restore is recorded in the audit log.
      </p>
    </div>
  );
}
