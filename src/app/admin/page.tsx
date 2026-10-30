import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Inbox, Package, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { countEnquiries, listRecentEnquiries } from "@/lib/enquiries";
import { listAlertsForUser } from "@/lib/alerts";
import { listActiveProducts } from "@/lib/products";
import { formatDateDDMMYYYY, minutesFromNow, relativeTime } from "@/lib/dates";
import { PERMISSION_LABELS, type Permission } from "@/lib/types";
import { AdminPageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };

const SEVERITY_STYLES: Record<string, string> = {
  INFO: "bg-olive-soft",
  WARNING: "bg-brass",
  CRITICAL: "bg-terracotta",
};

function greeting(): string {
  const hour =
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    ) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function longDate(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUser();
  const params = await searchParams;
  const denied = typeof params.denied === "string" ? params.denied : "";

  const weekAgo = minutesFromNow(-7 * 24 * 60);
  const [weekCount, totalCount, alerts, enquiries, products] = await Promise.all([
    countEnquiries(weekAgo),
    countEnquiries(),
    listAlertsForUser(user, { status: "OPEN", limit: 5 }),
    listRecentEnquiries(5),
    listActiveProducts(),
  ]);
  const firstName = user.name.split(/\s+/)[0] || user.name;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Dashboard"
        title={`${greeting()}, ${firstName}.`}
        description={longDate()}
        actions={
          <Link href="/" target="_blank" className="btn btn-outline btn-sm">
            View website
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      />

      {denied ? (
        <p
          role="alert"
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-ink"
        >
          You do not have access to{" "}
          {PERMISSION_LABELS[denied as Permission]
            ? PERMISSION_LABELS[denied as Permission].toLowerCase()
            : "that area"}
          . Ask the Owner if you need it.
        </p>
      ) : null}

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Enquiries · last 7 days",
            value: weekCount,
            detail: `${totalCount} in total`,
            icon: Inbox,
          },
          {
            label: "Open alerts",
            value: alerts.length,
            detail: alerts.length === 0 ? "All clear" : "Need attention",
            icon: TriangleAlert,
          },
          {
            label: "Active varieties",
            value: products.length,
            detail: "Live on the website",
            icon: Package,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {stat.label}
                </p>
                <Icon aria-hidden="true" className="size-4 text-brass" />
              </div>
              <p className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-none">
                {stat.value}
              </p>
              <p className="mt-2 text-[0.8125rem] text-ink-muted">{stat.detail}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface lg:col-span-2" aria-labelledby="recent-enquiries">
          <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id="recent-enquiries" className="font-[family-name:var(--font-display)] text-xl">
              Recent enquiries
            </h2>
            <span className="meta">Latest five</span>
          </div>
          {enquiries.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
              Enquiries from the website will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {enquiries.map((enquiry) => (
                <li key={enquiry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] font-medium">{enquiry.name}</p>
                    <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                      {enquiry.phoneOriginal || enquiry.phone}
                      {enquiry.email ? ` · ${enquiry.email}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.875rem]">{enquiry.quantityKg} kg</p>
                    <p className="text-[0.75rem] text-ink-muted">
                      {enquiry.notSure
                        ? "Date not decided"
                        : `Expected ${formatDateDDMMYYYY(enquiry.expectedDate)}`}
                    </p>
                  </div>
                  <p className="w-full text-[0.75rem] text-ink-muted sm:w-auto">
                    {relativeTime(enquiry.submittedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface" aria-labelledby="open-alerts">
          <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id="open-alerts" className="font-[family-name:var(--font-display)] text-xl">
              Open alerts
            </h2>
            <span className="meta">{alerts.length} open</span>
          </div>
          {alerts.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
              Nothing needs attention.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {alerts.map((alert) => (
                <li key={alert.id} className="px-5 py-4">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rotate-45",
                        SEVERITY_STYLES[alert.severity] ?? "bg-ink-muted",
                      )}
                    />
                    <div>
                      <p className="text-[0.875rem] font-medium">{alert.title}</p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{alert.message}</p>
                      <p className="mt-1 text-[0.75rem] text-ink-muted">
                        {relativeTime(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="surface p-5" aria-labelledby="your-access">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="your-access" className="font-[family-name:var(--font-display)] text-xl">
            Your access
          </h2>
          <span className="pill">
            {user.role === "OWNER" ? "Owner" : "Team member"}
          </span>
        </div>
        <p className="mt-2 text-[0.875rem] text-ink-soft">
          Signed in as {user.email}
          {user.lastSignInAt ? ` · last sign-in ${relativeTime(user.lastSignInAt)}` : ""}
        </p>
        {user.role === "OWNER" ? (
          <p className="mt-4 text-[0.875rem] text-ink-soft">
            Full access to every area of the workspace.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {user.permissions.length === 0 ? (
              <li className="text-[0.875rem] text-ink-muted">
                No specific permissions have been assigned yet.
              </li>
            ) : (
              user.permissions.map((permission) => (
                <li key={permission} className="pill">
                  {PERMISSION_LABELS[permission]}
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <p className="text-[0.75rem] text-ink-muted">
        All times are shown in Asia/Kolkata. Dates are shown as DD/MM/YYYY.
      </p>
    </div>
  );
}
