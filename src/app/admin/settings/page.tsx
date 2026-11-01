import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  DatabaseBackup,
  KeyRound,
  PlugZap,
  ReceiptText,
  Save,
  ShieldCheck,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { relativeTime } from "@/lib/dates";
import {
  cloudinaryConfigured,
  env,
  gmailConfigured,
  googleConfigured,
  whatsappConfigured,
} from "@/lib/env";
import { peekReviewsSnapshot } from "@/lib/google-reviews";
import { getSettings } from "@/lib/settings";
import { changeMyPasswordAction, saveSettingsAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };

function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
        {error}
      </p>
    );
  }
  if (params.password === "1") {
    return (
      <p role="status" className="rounded-2xl border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        Your sign-in password is updated. Use it next time you sign in.
      </p>
    );
  }
  if (params.saved === "1") {
    return (
      <p role="status" className="rounded-2xl border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        Settings saved. New invoices and public pages pick up the changes immediately.
      </p>
    );
  }
  return null;
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? "pill border-olive-soft text-olive"
          : "pill border-line text-ink-muted"
      }
    >
      {label}
    </span>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("settings.manage");
  const params = await searchParams;
  const settings = await getSettings();
  const business = settings.business;
  const reviews = settings.reviews;
  const reviewsSnapshot = reviews.enabled
    ? await peekReviewsSnapshot(reviews.googlePlaceId)
    : null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin"
        title="Settings"
        description="Business details on invoices and the website, invoice wording, expense categories, session security and backup retention."
      />

      <Notice params={params} />

      <form action={saveSettingsAction} className="space-y-6">
        <section className="surface p-5 sm:p-6" aria-labelledby="business-details">
          <h2
            id="business-details"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
          >
            <Building2 aria-hidden="true" className="size-4 text-brass" />
            Business details
          </h2>
          <p className="mt-2 text-[0.875rem] text-ink-soft">
            These details appear on invoices and in the website footer and contact page. Leave a
            field blank to hide it.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="business-name" className="label">
                Business name
              </label>
              <input
                id="business-name"
                name="businessName"
                required
                maxLength={120}
                defaultValue={business.name}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-tagline" className="label">
                Tagline
              </label>
              <input
                id="business-tagline"
                name="tagline"
                maxLength={120}
                defaultValue={business.tagline}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-whatsapp" className="label">
                WhatsApp number
              </label>
              <input
                id="business-whatsapp"
                name="whatsappNumber"
                inputMode="tel"
                maxLength={30}
                defaultValue={business.whatsappNumber}
                placeholder="+91 98765 43210"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-phone-display" className="label">
                Phone shown on the website
              </label>
              <input
                id="business-phone-display"
                name="phoneDisplay"
                maxLength={40}
                defaultValue={business.phoneDisplay}
                placeholder="+91 98765 43210"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-email" className="label">
                Business email
              </label>
              <input
                id="business-email"
                name="email"
                type="email"
                maxLength={160}
                defaultValue={business.email}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-instagram" className="label">
                Instagram URL
              </label>
              <input
                id="business-instagram"
                name="instagramUrl"
                type="url"
                maxLength={300}
                defaultValue={business.instagramUrl}
                placeholder="https://instagram.com/…"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-google-review" className="label">
                Google review link
              </label>
              <input
                id="business-google-review"
                name="googleReviewUrl"
                type="url"
                maxLength={300}
                defaultValue={business.googleReviewUrl}
                placeholder="https://g.page/r/…/review"
                className="field"
              />
              <p className="help">
                From your Google business profile, use the Share reviews link. Customers
                land straight on the review form. Leave blank to hide the link.
              </p>
            </div>
            <div>
              <label htmlFor="business-city" className="label">
                City
              </label>
              <input
                id="business-city"
                name="city"
                maxLength={80}
                defaultValue={business.city}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-state" className="label">
                State
              </label>
              <input
                id="business-state"
                name="state"
                maxLength={80}
                defaultValue={business.state}
                className="field"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="business-address" className="label">
                Address (optional)
              </label>
              <input
                id="business-address"
                name="addressLine"
                maxLength={300}
                defaultValue={business.addressLine}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="business-gstin" className="label">
                GSTIN (optional)
              </label>
              <input
                id="business-gstin"
                name="gstin"
                maxLength={15}
                defaultValue={business.gstin}
                className="field uppercase"
              />
              <p className="mt-1 text-[0.75rem] text-ink-muted">
                Shown as business information only. Invoices do not calculate GST.
              </p>
            </div>
            <div>
              <label htmlFor="google-place-id" className="label">
                Google Place ID (optional)
              </label>
              <input
                id="google-place-id"
                name="googlePlaceId"
                maxLength={120}
                defaultValue={reviews.googlePlaceId}
                placeholder="ChIJ…"
                className="field"
              />
              <p className="mt-1 text-[0.75rem] text-ink-muted">
                Find it on your Google Business Profile listing URL, or with a “Place ID lookup”
                search for your shop address.
              </p>
            </div>
            <div className="flex items-end pb-1">
              <label htmlFor="show-google-reviews" className="flex items-center gap-2 text-[0.875rem]">
                <input
                  id="show-google-reviews"
                  name="showGoogleReviews"
                  type="checkbox"
                  defaultChecked={reviews.enabled}
                  className="size-4 accent-olive"
                />
                Show Google reviews on the website
              </label>
            </div>
          </div>
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="invoice-wording">
          <h2
            id="invoice-wording"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
          >
            <ReceiptText aria-hidden="true" className="size-4 text-brass" />
            Invoice wording
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="invoice-thank-you" className="label">
                Thank-you line
              </label>
              <textarea
                id="invoice-thank-you"
                name="thankYou"
                rows={3}
                maxLength={500}
                defaultValue={settings.invoice.thankYou}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="invoice-footer" className="label">
                Footer note
              </label>
              <textarea
                id="invoice-footer"
                name="footerNote"
                rows={3}
                maxLength={500}
                defaultValue={settings.invoice.footerNote}
                className="field"
              />
            </div>
          </div>
          <p className="mt-3 text-[0.75rem] text-ink-muted">
            Issued invoice versions keep their original wording. Changes apply to invoices issued
            from now on.
          </p>
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="operations-settings">
          <h2
            id="operations-settings"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
          >
            <ShieldCheck aria-hidden="true" className="size-4 text-brass" />
            Operations & security
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="expense-categories" className="label">
                Expense categories (one per line)
              </label>
              <textarea
                id="expense-categories"
                name="expenseCategories"
                rows={9}
                required
                defaultValue={settings.expenseCategories.join("\n")}
                className="field font-mono text-[0.8125rem]"
              />
            </div>
            <div className="space-y-5">
              <div>
                <label htmlFor="idle-minutes" className="label">
                  Idle sign-out (minutes)
                </label>
                <input
                  id="idle-minutes"
                  name="idleMinutes"
                  type="number"
                  min={15}
                  max={480}
                  step={1}
                  required
                  defaultValue={settings.security.idleMinutes}
                  className="field"
                />
                <p className="mt-1 text-[0.75rem] text-ink-muted">
                  Between 15 and 480 minutes. Sessions also expire after 30 days.
                </p>
              </div>
              <div>
                <label htmlFor="retention-days" className="label">
                  Backup retention (days)
                </label>
                <input
                  id="retention-days"
                  name="retentionDays"
                  type="number"
                  min={7}
                  max={365}
                  step={1}
                  required
                  defaultValue={settings.backup.retentionDays}
                  className="field"
                />
                <p className="mt-1 text-[0.75rem] text-ink-muted">
                  The specification asks for 30 days. Older backup files are removed after a
                  successful run.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.75rem] text-ink-muted">
            Every change is recorded in the audit log with your account and the time.
          </p>
          <button type="submit" className="btn btn-solid">
            <Save aria-hidden="true" className="size-4" />
            Save settings
          </button>
        </div>
      </form>

      <section
        id="your-sign-in"
        className="surface p-5 sm:p-6"
        aria-labelledby="your-sign-in-heading"
      >
        <h2
          id="your-sign-in-heading"
          className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
        >
          <KeyRound aria-hidden="true" className="size-4 text-brass" />
          Your sign-in
        </h2>
        <p className="mt-2 text-[0.875rem] text-ink-soft">
          Signed in as <span className="font-medium">{user.email}</span>
          {user.canUsePassword
            ? " using a password."
            : " — this account has no password yet, so it signs in with Google only."}
        </p>
        <form action={changeMyPasswordAction} className="mt-5 grid gap-4 sm:grid-cols-3">
          {user.canUsePassword ? (
            <div>
              <label htmlFor="current-password" className="label">
                Current password
              </label>
              <input
                id="current-password"
                name="current"
                type="password"
                autoComplete="current-password"
                className="field"
                required
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="new-password" className="label">
              New password
            </label>
            <input
              id="new-password"
              name="next"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="field"
              required
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="label">
              Repeat new password
            </label>
            <input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="field"
              required
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
            <p className="help">
              At least 8 characters. Other people you add get their password set
              for them on the Users page.
            </p>
            <button type="submit" className="btn btn-solid btn-sm">
              Update password
            </button>
          </div>
        </form>
      </section>

      <section className="surface" aria-labelledby="integration-status">
        <div className="border-b border-line px-5 py-4">
          <h2
            id="integration-status"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
          >
            <PlugZap aria-hidden="true" className="size-4 text-brass" />
            Integration status
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            Read-only checks of the environment. Secret values are never displayed on this page.
          </p>
        </div>
        <ul className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
          {[
            {
              label: "Google sign-in",
              ok: googleConfigured && Boolean(env.ownerEmail),
              detail: googleConfigured
                ? `Owner account: ${env.ownerEmail || "not set"}`
                : "Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and OWNER_EMAIL.",
            },
            {
              label: "WhatsApp",
              ok: whatsappConfigured,
              detail: `${env.whatsapp.mode === "live" ? "Live mode" : "Test mode"} · automated sends ${
                settings.whatsapp.liveEnabled ? "enabled" : "disabled"
              }. Manage on the WhatsApp page.`,
            },
            {
              label: "Gmail",
              ok: gmailConfigured,
              detail: `${env.gmail.mode === "live" ? "Live mode" : "Test mode"} · manual sending only.`,
            },
            {
              label: "Cloudinary",
              ok: cloudinaryConfigured,
              detail: cloudinaryConfigured
                ? "Product media uploads use Cloudinary."
                : "Add Cloudinary credentials, or local uploads are used in development.",
            },
            {
              label: "Backup encryption",
              ok: Boolean(env.backup.encryptionKey),
              detail: `Provider: ${env.backup.provider}. ${
                env.backup.encryptionKey
                  ? "Encryption key is present."
                  : "Add BACKUP_ENCRYPTION_KEY before production."
              }`,
            },
            {
              label: "Cron protection",
              ok: Boolean(env.cronSecret),
              detail: env.cronSecret
                ? "Message and backup cron endpoints require CRON_SECRET."
                : "Add CRON_SECRET before production.",
            },
            {
              label: "Enquiry CAPTCHA",
              ok: Boolean(env.turnstile.secretKey && env.turnstile.siteKey),
              detail:
                env.turnstile.secretKey && env.turnstile.siteKey
                  ? "Cloudflare Turnstile verifies the public enquiry form."
                  : "Add TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable. Hidden-field, timing and rate-limit checks stay active without it.",
            },
            {
              label: "Analytics",
              ok: Boolean(env.gaId),
              detail: "Google Analytics loads only after consent.",
            },
            {
              label: "Google reviews",
              ok: Boolean(reviewsSnapshot),
              detail: !reviews.googlePlaceId
                ? "Add your Google Place ID in Business details to show customer reviews."
                : !reviews.enabled
                  ? "Place ID saved. Tick “Show Google reviews on the website” to put them on the home page."
                  : reviewsSnapshot
                    ? `${reviewsSnapshot.name} · ${reviewsSnapshot.rating.toFixed(1)} stars from ${reviewsSnapshot.total} ratings · fetched ${relativeTime(reviewsSnapshot.fetchedAt)}.`
                    : env.google.placesApiKey
                      ? "Turned on, but Google has not returned any data for this Place ID yet."
                      : "Turned on, but GOOGLE_PLACES_API_KEY is not set, so the website shows nothing.",
            },
          ].map((item) => (
            <li key={item.label} className="flex items-start justify-between gap-3 border border-line bg-paper-raised px-4 py-3">
              <div>
                <p className="text-[0.875rem] font-medium">{item.label}</p>
                <p className="mt-0.5 text-[0.75rem] text-ink-muted">{item.detail}</p>
              </div>
              <Status ok={item.ok} label={item.ok ? "Ready" : "Optional / missing"} />
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="flex items-center gap-2 text-[0.75rem] text-ink-muted">
            <DatabaseBackup aria-hidden="true" className="size-3.5" />
            Backup files stay on the configured storage, encrypted. Restore steps live in the
            handover documentation.
          </p>
          <Link href="/admin/backups" className="text-[0.8125rem] text-olive-deep hover:underline">
            Open backups
          </Link>
        </div>
      </section>
    </div>
  );
}
