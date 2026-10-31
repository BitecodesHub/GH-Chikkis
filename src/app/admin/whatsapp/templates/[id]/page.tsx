import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TemplateForm } from "@/components/admin/template-form";
import { requirePermission } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import {
  NOTIFICATION_TYPE_LABELS,
  TEMPLATE_STATUS_LABELS,
  getTemplate,
  listTemplateVersions,
  messagingModeInfo,
  templateReadiness,
} from "@/lib/messaging";
import { isOwner } from "@/lib/permissions";
import type { TemplateStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Message template" };

const STATUS_OPTIONS: { value: TemplateStatus; label: string }[] = (
  ["DRAFT", "PENDING", "APPROVED", "REJECTED", "DISABLED"] as TemplateStatus[]
).map((value) => ({ value, label: TEMPLATE_STATUS_LABELS[value] }));

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requirePermission("messaging.manage");
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();
  const [versions, modeInfo] = await Promise.all([
    listTemplateVersions(template.id),
    Promise.resolve(messagingModeInfo()),
  ]);
  const readiness = templateReadiness(template, modeInfo.mode);
  const owner = isOwner(user);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="WhatsApp template"
        title={template.name}
        description={`${NOTIFICATION_TYPE_LABELS[template.type]} · version ${template.version} · ${template.language}`}
        actions={
          <Link href="/admin/whatsapp" className="btn btn-quiet btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            WhatsApp
          </Link>
        }
      />

      <section className="surface" aria-labelledby="template-state">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <h2 id="template-state" className="text-[1.0625rem] font-medium">
            Template state
          </h2>
          <span
            className={cn(
              "pill",
              readiness.ready ? "border-olive-soft text-olive" : "border-terracotta text-terracotta",
            )}
          >
            {modeInfo.mode === "LIVE"
              ? readiness.ready
                ? "Ready for live sending"
                : "Not ready for live sending"
              : "Test mode — always ready"}
          </span>
          {!readiness.ready && readiness.reason ? (
            <span className="text-[0.8125rem] text-ink-soft">{readiness.reason}</span>
          ) : null}
        </div>
        <TemplateForm template={template} isOwner={owner} statusOptions={STATUS_OPTIONS} />
      </section>

      <section className="surface" aria-labelledby="version-history">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2
            id="version-history"
            className="font-[family-name:var(--font-display)] text-xl"
          >
            Version history
          </h2>
          <span className="meta">{versions.length} versions</span>
        </div>
        <ol className="divide-y divide-line">
          {versions.map((version) => (
            <li key={`${version.templateId}-${version.version}`} className="px-5 py-4">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[0.875rem]">
                  <FileText aria-hidden="true" className="size-4 text-brass" />
                  <span className="font-medium">Version {version.version}</span>
                  <span className="pill border-line text-ink-muted">
                    {TEMPLATE_STATUS_LABELS[version.status]}
                  </span>
                  <span className="text-ink-muted">
                    {formatDateTime(version.at)} · {version.by}
                  </span>
                </summary>
                <pre className="mt-3 whitespace-pre-wrap border border-line bg-paper-raised px-4 py-3 font-mono text-[0.8125rem] leading-relaxed">
                  {version.body}
                </pre>
              </details>
            </li>
          ))}
        </ol>
        <p className="border-t border-line px-5 py-3 text-[0.75rem] text-ink-muted">
          Versions are kept for reference. WhatsApp parameters are filled from the order at send
          time.
        </p>
      </section>
    </div>
  );
}
