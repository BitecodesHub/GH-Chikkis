import type { Metadata } from "next";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { emailModeInfo, listRecentEmails } from "@/lib/email";
import { retryOrderEmailAction } from "@/app/admin/orders/message-actions";
import type { EmailMessage } from "@/lib/types";

export const metadata: Metadata = { title: "Emails" };

const EMAIL_STATUS_STYLES: Record<EmailMessage["status"], string> = {
  SENT: "border-olive-soft text-olive",
  SIMULATED: "border-line text-ink-muted",
  FAILED: "border-terracotta text-terracotta",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("messaging.manage");
  const params = await searchParams;
  const emails = await listRecentEmails(100);
  const mode = emailModeInfo();
  const error = first(params.error);
  const state = first(params.state);

  const notice =
    params.email === "1"
      ? state === "sent"
        ? "Email sent."
        : state === "simulated"
          ? "Test-mode email recorded. Nothing was sent."
          : state === "failed"
            ? "The email failed. Check the error and retry after fixing the cause."
            : "Email processed."
      : "";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Communication"
        title="Emails"
        description="Manual Gmail messages sent from an order. There are no automatic customer emails, and no PDFs are attached."
        actions={
          <Link href="/admin/orders" className="btn btn-outline btn-sm">
            Open orders
          </Link>
        }
      />

      {notice ? (
        <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
          {error}
        </p>
      ) : null}

      <section
        className={cn(
          "border px-5 py-4",
          mode.mode === "LIVE"
            ? "border-olive bg-paper-raised"
            : "border-line border-l-4 border-l-brass bg-paper-raised",
        )}
        aria-label="Email mode"
      >
        <div className="flex items-start gap-3">
          <Mail aria-hidden="true" className="mt-0.5 size-5 text-brass" />
          <div>
            <p className="font-medium">
              {mode.mode === "LIVE"
                ? "Live mode — emails are delivered through Gmail"
                : "Test mode — emails are recorded, not sent"}
            </p>
            <p className="mt-1 max-w-3xl text-[0.875rem] leading-relaxed text-ink-soft">
              {mode.mode === "LIVE"
                ? `Messages are sent from ${mode.sender || "the configured Gmail account"} using the stored refresh token. Only compose an email when you are ready to send it.`
                : "Set GMAIL_MODE=live with a sender address and OAuth refresh token to deliver email. Until then every message is saved as “Test — not sent” so you can check the wording."}
            </p>
          </div>
        </div>
      </section>

      <section className="surface" aria-labelledby="email-history">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="email-history" className="font-[family-name:var(--font-display)] text-xl">
            Recent emails
          </h2>
          <span className="meta">{emails.length} records</span>
        </div>

        {emails.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Mail aria-hidden="true" className="mx-auto size-7 text-brass" />
            <p className="display-s mt-4">No emails yet.</p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              Open a sales order and use the email composer in its Customer messages section.
            </p>
            <Link href="/admin/orders" className="btn btn-solid mt-6">
              Choose an order
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {emails.map((email) => (
              <li key={email.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("pill", EMAIL_STATUS_STYLES[email.status])}>
                        {email.status === "SIMULATED"
                          ? "Test — not sent"
                          : email.status === "SENT"
                            ? "Sent"
                            : "Failed"}
                      </span>
                      <Link
                        href={`/admin/orders/${email.orderId}`}
                        className="font-medium hover:underline"
                      >
                        {email.orderRef}
                      </Link>
                      <span className="text-[0.8125rem] text-ink-soft">To {email.to}</span>
                      <span className="text-[0.75rem] text-ink-muted">
                        {formatDateTime(email.createdAt)}
                        {email.createdByName ? ` · ${email.createdByName}` : ""}
                        {email.retryOfId ? " · retry" : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.875rem] font-medium">{email.subject}</p>
                    {email.error ? (
                      <p className="mt-1 text-[0.8125rem] text-terracotta">{email.error}</p>
                    ) : null}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[0.8125rem] text-ink-soft">
                        View body
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap border-t border-line pt-2 font-mono text-[0.8125rem] leading-relaxed text-ink-soft">
                        {email.body}
                      </pre>
                    </details>
                  </div>
                  {email.status === "FAILED" ? (
                    <form action={retryOrderEmailAction}>
                      <input type="hidden" name="emailId" value={email.id} />
                      <input type="hidden" name="orderId" value={email.orderId} />
                      <button type="submit" className="btn btn-outline btn-sm">
                        <RefreshCw aria-hidden="true" className="size-4" />
                        Retry
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-line px-5 py-3 text-[0.75rem] text-ink-muted">
          Email bodies are stored for reference. No attachments are supported.
        </p>
      </section>
    </div>
  );
}
