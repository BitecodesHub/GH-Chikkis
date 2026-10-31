import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth/session";
import { listAlertsForUser } from "@/lib/alerts";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { SystemAlert } from "@/lib/types";
import { resolveAlertAction } from "./actions";

export const metadata: Metadata = { title: "Alerts" };

const SEVERITY_STYLES: Record<SystemAlert["severity"], string> = {
  INFO: "border-olive-soft text-olive",
  WARNING: "border-brass text-brass",
  CRITICAL: "border-terracotta text-terracotta",
};

const TYPE_LABELS: Record<SystemAlert["type"], string> = {
  NEW_ENQUIRY: "New enquiry",
  WHATSAPP_FAILED: "WhatsApp failure",
  WHATSAPP_SPEND: "WhatsApp spending",
  WHATSAPP_PAUSED: "WhatsApp paused",
  BACKUP_FAILED: "Backup failure",
  SYSTEM_ERROR: "System error",
  CANCELLED_ORDER_PAYMENT: "Cancelled order payment",
};

function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) {
    return (
      <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
        {error}
      </p>
    );
  }
  if (typeof params.updated === "string") {
    return (
      <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        {params.updated === "resolved" ? "Alert resolved." : "Alert acknowledged."}
      </p>
    );
  }
  return null;
}

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUser();
  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status : "OPEN";
  const status =
    requested === "ACKNOWLEDGED" || requested === "RESOLVED" ? requested : "OPEN";
  const alerts = await listAlertsForUser(user, { status, limit: 100 });
  const tabs = [
    ["OPEN", "Open"],
    ["ACKNOWLEDGED", "Acknowledged"],
    ["RESOLVED", "Resolved"],
  ] as const;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Overview"
        title="Alerts"
        description="Enquiries, message failures, backup failures and system errors that need attention. You only see alerts for areas you can access. Acknowledge means you have seen it; Resolve means it is dealt with."
      />

      <Notice params={params} />

      <section className="surface" aria-labelledby="alert-list">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="alert-list" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
            <Bell aria-hidden="true" className="size-4 text-brass" />
            {tabs.find(([value]) => value === status)?.[1]} alerts
          </h2>
          <div className="flex gap-1">
            {tabs.map(([value, label]) => (
              <Link
                key={value}
                href={`/admin/alerts?status=${value}`}
                className={cn(
                  "px-2.5 py-1 text-[0.75rem]",
                  status === value
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {alerts.length === 0 ? (
          <p className="px-5 py-12 text-center text-[0.875rem] text-ink-muted">
            {status === "OPEN" ? "Nothing needs attention." : "No alerts in this view."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.map((alert) => (
              <li key={alert.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("pill", SEVERITY_STYLES[alert.severity])}>
                        {alert.severity.toLowerCase()}
                      </span>
                      <span className="text-[0.75rem] text-ink-muted">{TYPE_LABELS[alert.type]}</span>
                      <span className="text-[0.75rem] text-ink-muted">
                        {relativeTime(alert.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[0.9375rem] font-medium">{alert.title}</p>
                    <p className="mt-0.5 text-[0.875rem] text-ink-soft">{alert.message}</p>
                    <p className="mt-1 text-[0.75rem] text-ink-muted">
                      {formatDateTime(alert.createdAt)}
                      {alert.resolvedAt
                        ? ` · resolved ${formatDateTime(alert.resolvedAt)}${alert.resolvedBy ? ` by ${alert.resolvedBy}` : ""}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {alert.link ? (
                      <Link href={alert.link} className="btn btn-outline btn-sm">
                        Open
                      </Link>
                    ) : null}
                    {alert.status === "OPEN" ? (
                      <form action={resolveAlertAction}>
                        <input type="hidden" name="id" value={alert.id} />
                        <input type="hidden" name="status" value="ACKNOWLEDGED" />
                        <button type="submit" className="btn btn-quiet btn-sm">
                          <Check aria-hidden="true" className="size-3.5" />
                          Acknowledge
                        </button>
                      </form>
                    ) : null}
                    {alert.status !== "RESOLVED" ? (
                      <form action={resolveAlertAction}>
                        <input type="hidden" name="id" value={alert.id} />
                        <input type="hidden" name="status" value="RESOLVED" />
                        <button type="submit" className="btn btn-solid btn-sm">
                          <CheckCheck aria-hidden="true" className="size-3.5" />
                          Resolve
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
