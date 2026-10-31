import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FilterNav } from "@/components/admin/filter-nav";
import { requirePermission } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { formatINR, paiseToInput } from "@/lib/money";
import {
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  TEMPLATE_STATUS_LABELS,
  getMessagingSnapshot,
  listNotificationJobs,
  templateReadiness,
  type MessagingSnapshot,
} from "@/lib/messaging";
import { hasPermission } from "@/lib/permissions";
import type {
  MessageTemplate,
  NotificationJob,
  NotificationStatus,
  TemplateStatus,
} from "@/lib/types";
import {
  approveMessageAction,
  discardMessageAction,
  pauseWhatsAppAction,
  processQueueAction,
  rebuildMessageAction,
  resumeWhatsAppAction,
  retryMessageAction,
  saveWhatsAppSettingsAction,
} from "./actions";

export const metadata: Metadata = { title: "WhatsApp" };

const PAGE_SIZE = 20;

const JOB_STATUS_STYLES: Record<NotificationStatus, string> = {
  QUEUED: "border-brass text-brass",
  NEEDS_REVIEW: "border-olive-deep text-olive-deep",
  SENDING: "border-brass text-brass",
  SENT: "border-olive-soft text-olive",
  DELIVERED: "border-olive-deep text-olive-deep",
  READ: "border-olive-deep text-olive-deep",
  FAILED: "border-terracotta text-terracotta",
  SIMULATED: "border-line text-ink-muted",
  DISCARDED: "border-line text-ink-muted",
  BLOCKED: "border-terracotta text-terracotta",
};

const TEMPLATE_STATUS_STYLES: Record<TemplateStatus, string> = {
  DRAFT: "border-line text-ink-muted",
  PENDING: "border-brass text-brass",
  APPROVED: "border-olive-deep text-olive-deep",
  REJECTED: "border-terracotta text-terracotta",
  DISABLED: "border-line text-ink-muted",
};

const STATUS_OPTIONS: NotificationStatus[] = [
  "NEEDS_REVIEW",
  "QUEUED",
  "FAILED",
  "SIMULATED",
  "SENT",
  "DELIVERED",
  "READ",
  "DISCARDED",
];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = first(params.error);
  if (error) {
    return (
      <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
        {error}
      </p>
    );
  }
  const notice = first(params.notice);
  let message = "";
  if (notice === "settings") message = "WhatsApp settings saved.";
  if (notice === "paused") message = "Sending paused. Queued messages now wait for review.";
  if (notice === "resumed") message = "Sending resumed. Queued messages still need review.";
  if (notice === "approved") message = "Message approved and processed.";
  if (notice === "rebuilt") message = "Message rebuilt from the current order. Review it before sending.";
  if (notice === "discarded") message = "Message discarded.";
  if (notice === "retried") message = "Message retried.";
  if (notice === "processed") {
    const processed = Number(first(params.processed) || 0);
    const wasPaused = first(params.paused) === "1";
    message = wasPaused
      ? "Sending is paused or the spending limit was reached, so nothing was processed."
      : `Queue processed: ${processed} message${processed === 1 ? "" : "s"} handled.`;
  }
  if (!message) return null;
  return (
    <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
      {message}
    </p>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface px-5 py-4">
      <p className="meta">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-[0.75rem] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function JobActions({
  job,
  canReview,
}: {
  job: NotificationJob;
  canReview: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {job.needsReview && canReview ? (
        <form action={approveMessageAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <button type="submit" className="btn btn-solid btn-sm">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Approve
          </button>
        </form>
      ) : null}
      {job.needsReview ? (
        <form action={rebuildMessageAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <button type="submit" className="btn btn-outline btn-sm">
            <RefreshCw aria-hidden="true" className="size-4" />
            Rebuild
          </button>
        </form>
      ) : null}
      {job.status === "FAILED" ? (
        <form action={retryMessageAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <button type="submit" className="btn btn-outline btn-sm">
            <RefreshCw aria-hidden="true" className="size-4" />
            Retry
          </button>
        </form>
      ) : null}
      {["NEEDS_REVIEW", "QUEUED", "FAILED"].includes(job.status) ? (
        <form action={discardMessageAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <button type="submit" className="btn btn-quiet btn-sm">
            Discard
          </button>
        </form>
      ) : null}
    </div>
  );
}

function QueueRow({
  job,
  canReview,
}: {
  job: NotificationJob;
  canReview: boolean;
}) {
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/orders/${job.orderId}`}
              className="font-medium hover:underline"
            >
              {job.orderRef}
            </Link>
            <span className="text-[0.8125rem] text-ink-soft">{job.customerName}</span>
            <span className={cn("pill", JOB_STATUS_STYLES[job.status])}>
              {NOTIFICATION_STATUS_LABELS[job.status]}
            </span>
            <span className="pill border-line text-ink-muted">
              {job.mode === "LIVE" ? "Live" : "Test"}
            </span>
          </div>
          <p className="mt-1 text-[0.75rem] text-ink-muted">
            {NOTIFICATION_TYPE_LABELS[job.type]} · queued at {formatDateTime(job.createdAt)}
            {job.templateVersion ? ` · template v${job.templateVersion}` : ""}
            {job.attempts > 0 ? ` · ${job.attempts} attempt${job.attempts === 1 ? "" : "s"}` : ""}
            {job.approvedBy ? ` · approved by ${job.approvedBy}` : ""}
          </p>
          <p className="mt-2 max-w-3xl whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-soft">
            {job.body}
          </p>
          {job.holdReason ? (
            <p className="mt-2 flex items-start gap-1.5 text-[0.8125rem] text-brass">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {job.holdReason}
            </p>
          ) : null}
          {job.lastError ? (
            <p className="mt-1 flex items-start gap-1.5 text-[0.8125rem] text-terracotta">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {job.lastError}
            </p>
          ) : null}
        </div>
        <JobActions job={job} canReview={canReview} />
      </div>
    </li>
  );
}

function TemplateCard({
  template,
  mode,
}: {
  template: MessageTemplate;
  mode: MessagingSnapshot["mode"];
}) {
  const readiness = templateReadiness(template, mode);
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{template.name}</p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
            {NOTIFICATION_TYPE_LABELS[template.type]} · version {template.version} ·{" "}
            {template.language}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("pill", TEMPLATE_STATUS_STYLES[template.status])}>
              {TEMPLATE_STATUS_LABELS[template.status]}
            </span>
            <span
              className={cn(
                "pill",
                readiness.ready ? "border-olive-soft text-olive" : "border-terracotta text-terracotta",
              )}
            >
              {readiness.ready ? "Ready" : "Not ready"}
            </span>
            {!template.active ? (
              <span className="pill border-line text-ink-muted">Switched off</span>
            ) : null}
          </div>
          {!readiness.ready && readiness.reason ? (
            <p className="mt-2 max-w-xl text-[0.8125rem] text-ink-soft">{readiness.reason}</p>
          ) : null}
        </div>
        <Link
          href={`/admin/whatsapp/templates/${template.id}`}
          className="btn btn-outline btn-sm"
        >
          <FileText aria-hidden="true" className="size-4" />
          Edit template
        </Link>
      </div>
    </li>
  );
}

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("messaging.manage");
  const params = await searchParams;
  const statusFilter = first(params.status);
  const reviewOnly = first(params.review) === "1";
  const page = Math.max(Number(first(params.page) || 1) || 1, 1);
  const canReview = hasPermission(user, "messaging.review");

  const [snapshot, queue] = await Promise.all([
    getMessagingSnapshot(),
    listNotificationJobs({
      status: STATUS_OPTIONS.includes(statusFilter as NotificationStatus)
        ? (statusFilter as NotificationStatus)
        : "",
      review: reviewOnly,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);
  const settings = snapshot.settings.whatsapp;
  const pages = Math.max(Math.ceil(queue.total / PAGE_SIZE), 1);
  const filterHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (statusFilter) search.set("status", statusFilter);
    if (reviewOnly) search.set("review", "1");
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return `/admin/whatsapp${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Communication"
        title="WhatsApp"
        description="Transactional messages only, with consent recorded before anything is sent. Test mode never contacts Meta; live mode needs an approved template and server credentials."
        actions={
          <form action={processQueueAction}>
            <button type="submit" className="btn btn-outline btn-sm">
              <PlayCircle aria-hidden="true" className="size-4" />
              Process queue
            </button>
          </form>
        }
      />

      <Notice params={params} />

      <section
        className={cn(
          "border px-5 py-4",
          snapshot.mode === "LIVE"
            ? "border-olive bg-paper-raised"
            : "border-line border-l-4 border-l-brass bg-paper-raised",
        )}
        aria-label="Sending mode"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {snapshot.mode === "LIVE" ? (
              <MessageCircle aria-hidden="true" className="mt-0.5 size-5 text-olive-deep" />
            ) : (
              <Settings2 aria-hidden="true" className="mt-0.5 size-5 text-brass" />
            )}
            <div>
              <p className="font-medium">
                {snapshot.mode === "LIVE"
                  ? "Live mode — messages can reach customers"
                  : "Test mode — nothing leaves the server"}
              </p>
              <p className="mt-1 max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
                {snapshot.mode === "LIVE"
                  ? "Live sending needs an approved template, a Meta template name, customer consent and server credentials. Every live message counts toward the estimated monthly spend."
                  : "Messages are composed and recorded as “Test mode — not sent”. Switch WHATSAPP_MODE to live only after Meta approval and a test number check."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[0.8125rem]">
            <span className="pill border-line text-ink-soft">
              Meta {snapshot.liveConfigured ? "configured" : "not configured"}
            </span>
            <span
              className={cn(
                "pill",
                settings.liveEnabled ? "border-olive-soft text-olive" : "border-line text-ink-muted",
              )}
            >
              Automation {settings.liveEnabled ? "on" : "off"}
            </span>
          </div>
        </div>
      </section>

      {settings.paused ? (
        <section className="border border-terracotta bg-paper-raised px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <PauseCircle aria-hidden="true" className="mt-0.5 size-5 text-terracotta" />
              <div>
                <p className="font-medium text-terracotta">Sending is paused</p>
                <p className="mt-1 text-[0.875rem] text-ink-soft">
                  {settings.pauseReason || "Emergency pause"}
                  {settings.pausedBy ? ` · ${settings.pausedBy}` : ""}
                  {settings.pausedAt ? ` · ${formatDateTime(settings.pausedAt)}` : ""}
                </p>
                <p className="mt-1 text-[0.8125rem] text-ink-muted">
                  Queued messages wait for review. Resuming does not send them automatically.
                </p>
              </div>
            </div>
            {canReview ? (
              <form action={resumeWhatsAppAction} className="space-y-2">
                <label className="flex items-center gap-2 text-[0.8125rem]">
                  <input type="checkbox" name="reviewed" className="size-4 accent-olive" required />
                  I reviewed the queued messages
                </label>
                <button type="submit" className="btn btn-solid btn-sm">
                  <PlayCircle aria-hidden="true" className="size-4" />
                  Resume sending
                </button>
              </form>
            ) : (
              <p className="text-[0.8125rem] text-ink-muted">
                Only the Owner can resume sending.
              </p>
            )}
          </div>
        </section>
      ) : canReview ? (
        <details className="surface">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-[0.9375rem] font-medium">
            <PauseCircle aria-hidden="true" className="size-4 text-terracotta" />
            Pause all sending
          </summary>
          <form action={pauseWhatsAppAction} className="space-y-3 border-t border-line px-5 py-4">
            <div>
              <label htmlFor="pause-reason" className="label">
                Reason
              </label>
              <input
                id="pause-reason"
                name="reason"
                required
                minLength={3}
                maxLength={300}
                placeholder="For example, checking a template with Meta"
                className="field"
              />
            </div>
            <p className="text-[0.8125rem] text-ink-soft">
              Pausing moves every queued message to review. Nothing sends until you resume and
              approve each message.
            </p>
            <button type="submit" className="btn btn-outline btn-sm">
              Pause sending
            </button>
          </form>
        </details>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Waiting review"
          value={String(snapshot.reviewCount)}
          hint={canReview ? "Approve or discard below" : "Owner approval needed"}
        />
        <Metric label="Queued" value={String(snapshot.queuedCount)} hint="Processed by cron or the button above" />
        <Metric label="Failed" value={String(snapshot.failedCount)} hint="Retry after checking the cause" />
        <Metric label="Test sends" value={String(snapshot.simulatedCount)} hint="Recorded, never delivered" />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="surface" aria-labelledby="message-queue">
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="message-queue" className="font-[family-name:var(--font-display)] text-xl">
                Message queue
              </h2>
              <span className="meta">
                {queue.total} {queue.total === 1 ? "message" : "messages"}
              </span>
            </div>
            <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
              <div>
                <label htmlFor="queue-status" className="label">
                  Status
                </label>
                <select id="queue-status" name="status" defaultValue={statusFilter} className="field min-w-44">
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {NOTIFICATION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2.5 text-[0.875rem]">
                <input
                  type="checkbox"
                  name="review"
                  value="1"
                  defaultChecked={reviewOnly}
                  className="size-4 accent-olive"
                />
                Only waiting review
              </label>
              <FilterNav />
              <button type="submit" className="sr-only">
                Filter
              </button>
              {statusFilter || reviewOnly ? (
                <Link href="/admin/whatsapp" className="btn btn-quiet btn-sm">
                  Clear
                </Link>
              ) : null}
            </form>
          </div>

          {queue.items.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Send aria-hidden="true" className="mx-auto size-7 text-brass" />
              <p className="display-s mt-4">
                {statusFilter || reviewOnly ? "No messages match these filters." : "The queue is clear."}
              </p>
              <p className="mt-2 text-[0.9375rem] text-ink-soft">
                {statusFilter || reviewOnly
                  ? "Clear the filters to see every message in the queue."
                  : "Messages appear here when a sales order is completed with consent on record, or when you send invoice details from an order."}
              </p>
              {statusFilter || reviewOnly ? (
                <Link href="/admin/whatsapp" className="btn btn-outline mt-6">
                  Clear filters
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {queue.items.map((job) => (
                <QueueRow key={job.id} job={job} canReview={canReview} />
              ))}
            </ul>
          )}

          {pages > 1 ? (
            <nav className="flex items-center justify-between border-t border-line px-5 py-3" aria-label="Queue pages">
              {page > 1 ? (
                <Link href={filterHref(page - 1)} className="btn btn-quiet btn-sm">
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="meta">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={filterHref(page + 1)} className="btn btn-quiet btn-sm">
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="surface" aria-labelledby="spend-heading">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="spend-heading" className="font-medium">
                Estimated spend
              </h2>
              <Wallet aria-hidden="true" className="size-4 text-brass" />
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl">
                  {formatINR(snapshot.spend.estimatedCostPaise)}
                </p>
                <p className="mt-1 text-[0.8125rem] text-ink-soft">
                  {snapshot.spend.monthLabel} · {snapshot.spend.liveMessages} live message
                  {snapshot.spend.liveMessages === 1 ? "" : "s"} ×{" "}
                  {formatINR(snapshot.spend.costPerMessagePaise)}
                </p>
                {!snapshot.spend.estimateAvailable ? (
                  <p className="mt-2 text-[0.8125rem] text-brass">
                    Set a per-message cost to estimate spend and enforce the monthly limit.
                  </p>
                ) : null}
                {snapshot.spend.thresholdPaise > 0 ? (
                  <>
                    <div className="mt-3 h-2 w-full bg-line" role="presentation">
                      <div
                        className={cn(
                          "h-2",
                          snapshot.spend.percentUsed >= 100
                            ? "bg-terracotta"
                            : snapshot.spend.percentUsed >= snapshot.spend.alertPercent
                              ? "bg-brass"
                              : "bg-olive",
                        )}
                        style={{ width: `${Math.min(snapshot.spend.percentUsed, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[0.75rem] text-ink-muted">
                      {snapshot.spend.percentUsed}% of {formatINR(snapshot.spend.thresholdPaise)} ·
                      alert at {snapshot.spend.alertPercent}%
                    </p>
                  </>
                ) : null}
              </div>
              <p className="border-t border-line pt-3 text-[0.75rem] leading-relaxed text-ink-muted">
                This is an estimate from your configured per-message rate, not Meta&apos;s invoice.
                Hitting the limit pauses sending automatically.
              </p>
            </div>
          </section>

          <section className="surface" aria-labelledby="consent-heading">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="consent-heading" className="font-medium">
                WhatsApp consent
              </h2>
              <Users aria-hidden="true" className="size-4 text-brass" />
            </div>
            <dl className="divide-y divide-line px-5 text-[0.875rem]">
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-soft">Granted</dt>
                <dd className="font-medium">{snapshot.consent.granted}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-soft">Withdrawn</dt>
                <dd className="font-medium">{snapshot.consent.withdrawn}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-soft">Not recorded</dt>
                <dd className="font-medium">{snapshot.consent.notRecorded}</dd>
              </div>
            </dl>
            <p className="border-t border-line px-5 py-3 text-[0.75rem] leading-relaxed text-ink-muted">
              Record consent from the customer profile, with the source and the date. Withdrawing
              consent discards unsent messages.
            </p>
          </section>

          <section className="surface" aria-labelledby="automation-heading">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="automation-heading" className="font-medium">
                Automation &amp; spending
              </h2>
              <ShieldCheck aria-hidden="true" className="size-4 text-brass" />
            </div>
            {canReview ? (
              <form action={saveWhatsAppSettingsAction} className="space-y-4 px-5 py-4">
                <label className="flex items-start gap-2 text-[0.875rem]">
                  <input
                    type="checkbox"
                    name="liveEnabled"
                    defaultChecked={settings.liveEnabled}
                    className="mt-0.5 size-4 accent-olive"
                  />
                  <span>
                    Queue a completion message automatically when a sales order is completed
                    <span className="mt-0.5 block text-[0.75rem] text-ink-muted">
                      Consent is still required. Template readiness and the pause state are checked
                      before anything sends.
                    </span>
                  </span>
                </label>
                <div>
                  <label htmlFor="cost-per-message" className="label">
                    Cost per message (₹)
                  </label>
                  <input
                    id="cost-per-message"
                    name="costPerMessage"
                    inputMode="decimal"
                    defaultValue={paiseToInput(settings.estimatedCostPerMessagePaise)}
                    placeholder="0"
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="monthly-threshold" className="label">
                    Monthly limit (₹)
                  </label>
                  <input
                    id="monthly-threshold"
                    name="monthlyThreshold"
                    inputMode="decimal"
                    defaultValue={paiseToInput(settings.monthlySpendThresholdPaise)}
                    placeholder="0"
                    className="field"
                  />
                  <p className="mt-1 text-[0.75rem] text-ink-muted">
                    Zero means no limit and no automatic pause.
                  </p>
                </div>
                <div>
                  <label htmlFor="alert-percent" className="label">
                    Warning at (%)
                  </label>
                  <input
                    id="alert-percent"
                    name="alertPercent"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={settings.alertPercent}
                    className="field"
                  />
                </div>
                <button type="submit" className="btn btn-solid btn-sm">
                  Save settings
                </button>
              </form>
            ) : (
              <div className="space-y-2 px-5 py-4 text-[0.875rem] text-ink-soft">
                <p>Automation: {settings.liveEnabled ? "on" : "off"}</p>
                <p>
                  Cost per message: {formatINR(settings.estimatedCostPerMessagePaise)} · monthly
                  limit: {formatINR(settings.monthlySpendThresholdPaise)}
                </p>
                <p className="text-[0.75rem] text-ink-muted">
                  Only the Owner can change automation, pause or spending controls.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="surface" aria-labelledby="templates-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="templates-heading" className="font-[family-name:var(--font-display)] text-xl">
            Message templates
          </h2>
          <span className="meta">Owner approval required for live sending</span>
        </div>
        <ul className="divide-y divide-line">
          {snapshot.templates.map((template) => (
            <TemplateCard key={template.id} template={template} mode={snapshot.mode} />
          ))}
        </ul>
        <p className="border-t border-line px-5 py-3 text-[0.75rem] leading-relaxed text-ink-muted">
          Copy the final body into Meta Business Manager, then record the approved Meta template
          name here. Editing an approved template returns it to draft unless the Owner re-approves
          it in the same save. Message bodies are text only; no PDFs are attached.
        </p>
      </section>

      <section className="surface px-5 py-4" aria-labelledby="how-heading">
        <h2 id="how-heading" className="font-medium">
          How messages are used
        </h2>
        <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-ink-soft">
          <li className="flex gap-2">
            <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-brass" />
            <span>
              <strong className="font-medium text-ink">Order completed</strong> is prepared
              automatically for sales orders when automation is on and consent is recorded. If
              automation is off, send invoice details from the order.
            </span>
          </li>
          <li className="flex gap-2">
            <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-brass" />
            <span>
              <strong className="font-medium text-ink">Invoice details</strong> and{" "}
              <strong className="font-medium text-ink">Corrections</strong> are always started by a
              person from the order page. No marketing messages are sent.
            </span>
          </li>
          <li className="flex gap-2">
            <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-brass" />
            <span>
              Pausing, spend limits, template changes and order edits move queued messages to
              review instead of sending stale text. Failed sends retry twice with a short backoff,
              then wait for a person.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
