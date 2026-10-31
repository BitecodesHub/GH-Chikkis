import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Eye, FileText } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { listWebsiteContent } from "@/lib/content";
import { pageDef } from "@/lib/content-schema";
import { relativeTime } from "@/lib/dates";
import { hasPermission } from "@/lib/permissions";
import { startPreviewAction } from "./actions";

export const metadata: Metadata = { title: "Website content" };

export default async function AdminContentPage() {
  const { user } = await requirePermission("content.edit");
  const pages = await listWebsiteContent();
  const canPublish = hasPermission(user, "content.publish");
  const unpublished = pages.filter(
    (page) => JSON.stringify(page.draft) !== JSON.stringify(page.published),
  ).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Website content"
        description="Edit the words on every public page. Changes are saved as a draft; preview them, then the Owner publishes."
        actions={
          <span className="pill">
            {unpublished === 0
              ? "All pages published"
              : `${unpublished} ${unpublished === 1 ? "page has" : "pages have"} a draft ahead`}
          </span>
        }
      />

      <section className="surface" aria-labelledby="content-pages">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="content-pages" className="font-[family-name:var(--font-display)] text-xl">
            Pages
          </h2>
          <p className="text-[0.8125rem] text-ink-muted">
            {canPublish
              ? "You can publish drafts as the Owner."
              : "Draft editing is yours; publishing stays with the Owner."}
          </p>
        </div>

        <ul className="divide-y divide-line">
          {pages.map((content) => {
            const definition = pageDef(content.page);
            const hasUnpublished =
              JSON.stringify(content.draft) !== JSON.stringify(content.published);
            return (
              <li
                key={content.page}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
              >
                <span className="hidden size-10 shrink-0 place-items-center border border-line text-brass sm:grid">
                  <FileText aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/content/${content.page}`}
                      className="text-[1.0625rem] font-medium hover:underline"
                    >
                      {definition.label}
                    </Link>
                    <span className="pill">Version {content.version}</span>
                    {hasUnpublished ? (
                      <span className="pill border-brass text-brass">Draft ahead</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                    {definition.path === "/" ? "Home page (/)" : definition.path}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-ink-soft">
                    Last edited {relativeTime(content.updatedAt)}
                    {content.updatedByName ? ` by ${content.updatedByName}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <form action={startPreviewAction}>
                    <input type="hidden" name="page" value={content.page} />
                    <button type="submit" className="btn btn-quiet btn-sm">
                      <Eye aria-hidden="true" className="size-4" />
                      Preview draft
                    </button>
                  </form>
                  <Link
                    href={definition.path}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-quiet btn-sm"
                    aria-label={`Open live ${definition.label} page`}
                  >
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                    Live
                  </Link>
                  <Link
                    href={`/admin/content/${content.page}`}
                    className="btn btn-outline btn-sm"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-[0.75rem] text-ink-muted">
        Preview mode shows saved draft content on the public site for 30 minutes and is
        limited to signed-in editors. Visitors always see the published version.
      </p>
    </div>
  );
}
