"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import {
  CONTENT_PREVIEW_COOKIE,
  discardContentDraft,
  getContentVersion,
  normalizeContent,
  publishWebsiteContent,
  saveContentDraft,
  type ContentActor,
} from "@/lib/content";
import { pageDef } from "@/lib/content-schema";
import { env } from "@/lib/env";
import { hasPermission } from "@/lib/permissions";
import {
  CONTENT_PAGES,
  type ContentPageKey,
  type PageContent,
} from "@/lib/types";

export interface ContentFormState {
  ok: boolean;
  message?: string;
  savedSnapshot?: string;
  savedContent?: PageContent;
  publishedContent?: PageContent;
  publishedVersion?: number;
  unchanged?: boolean;
}

function parsePage(value: FormDataEntryValue | null): ContentPageKey | null {
  const key = typeof value === "string" ? value : "";
  return (CONTENT_PAGES as readonly string[]).includes(key)
    ? (key as ContentPageKey)
    : null;
}

function parseContent(formData: FormData): Record<string, unknown> | null {
  const raw = formData.get("content");
  if (typeof raw !== "string" || raw.length > 300_000) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function saveContentAction(
  _previous: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const context = await requirePermission("content.edit");
  const page = parsePage(formData.get("page"));
  if (!page) {
    return { ok: false, message: "That page could not be identified." };
  }
  const parsed = parseContent(formData);
  if (!parsed) {
    return { ok: false, message: "The page content could not be read. Reload and try again." };
  }

  const intent = formData.get("intent") === "publish" ? "publish" : "save";
  if (intent === "publish" && !hasPermission(context.user, "content.publish")) {
    return { ok: false, message: "Only the Owner can publish content." };
  }

  const content = normalizeContent(page, parsed);
  const snapshot = JSON.stringify(content);
  const actor: ContentActor = { id: context.user.id, name: context.user.name };
  const definition = pageDef(page);

  try {
    await saveContentDraft(page, content, actor);

    if (intent === "publish") {
      const result = await publishWebsiteContent(page, content, actor);
      await recordAudit({
        actor: { id: context.user.id, email: context.user.email },
        action: "content.publish",
        entityType: "website_content",
        entityId: page,
        summary: result.changed
          ? `Published ${definition.label} as version ${result.version}`
          : `Re-published ${definition.label} with no content changes`,
      });
      revalidatePath(definition.path);
      revalidatePath("/admin/content");
      revalidatePath(`/admin/content/${page}`);
      return {
        ok: true,
        message: result.changed
          ? `${definition.label} is live as version ${result.version}.`
          : `${definition.label} already matched the published page.`,
        savedSnapshot: snapshot,
        savedContent: content,
        publishedContent: content,
        publishedVersion: result.version,
        unchanged: !result.changed,
      };
    }

    await recordAudit({
      actor: { id: context.user.id, email: context.user.email },
      action: "content.draft_save",
      entityType: "website_content",
      entityId: page,
      summary: `Saved a draft of ${definition.label}`,
    });
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${page}`);
    return {
      ok: true,
      message: `Draft saved for ${definition.label}. Preview it before publishing.`,
      savedSnapshot: snapshot,
      savedContent: content,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The content could not be saved.";
    return { ok: false, message };
  }
}

export async function startPreviewAction(formData: FormData): Promise<void> {
  await requirePermission("content.edit");
  const page = parsePage(formData.get("page"));
  if (!page) return redirect("/admin/content");

  const cookieStore = await cookies();
  cookieStore.set(CONTENT_PREVIEW_COOKIE, "1", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
  redirect(pageDef(page).path);
}

export async function stopPreviewAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CONTENT_PREVIEW_COOKIE);
  redirect("/admin/content");
}

export async function restoreVersionAction(formData: FormData): Promise<void> {
  const context = await requirePermission("content.edit");
  const page = parsePage(formData.get("page"));
  const versionId = String(formData.get("versionId") ?? "");
  if (!page || !versionId) return redirect("/admin/content");

  const version = await getContentVersion(versionId);
  if (!version || version.page !== page) {
    return redirect(`/admin/content/${page}?missing=1`);
  }

  const content = normalizeContent(page, version.content);
  await saveContentDraft(page, content, {
    id: context.user.id,
    name: context.user.name,
  });
  await recordAudit({
    actor: { id: context.user.id, email: context.user.email },
    action: "content.restore",
    entityType: "website_content",
    entityId: page,
    summary: `Restored version ${version.version} of ${pageDef(page).label} into the draft`,
  });
  revalidatePath(`/admin/content/${page}`);
  redirect(`/admin/content/${page}?restored=${version.version}`);
}

export async function discardDraftAction(formData: FormData): Promise<void> {
  const context = await requirePermission("content.edit");
  const page = parsePage(formData.get("page"));
  if (!page) return redirect("/admin/content");

  await discardContentDraft(page, {
    id: context.user.id,
    name: context.user.name,
  });
  await recordAudit({
    actor: { id: context.user.id, email: context.user.email },
    action: "content.discard_draft",
    entityType: "website_content",
    entityId: page,
    summary: `Discarded the unpublished draft of ${pageDef(page).label}`,
  });
  revalidatePath(`/admin/content/${page}`);
  redirect(`/admin/content/${page}?discarded=1`);
}
