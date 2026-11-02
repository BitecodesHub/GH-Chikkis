import type { ReactNode } from "react";
import { Suspense } from "react";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsAppAssistant } from "@/components/site/whatsapp-assistant";
import { AnalyticsConsent } from "@/components/site/analytics-consent";
import { getPreviewingContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { brandLogoSrc } from "@/lib/brand";
import { env } from "@/lib/env";
import { waLink, WHATSAPP_GENERAL_MESSAGE } from "@/lib/phone";
import { stopPreviewAction } from "@/app/admin/content/actions";

/**
 * The footer, chat bubble and preview banner each read something at request
 * time. Next.js refuses to flush a route's loading skeleton while the layout is
 * still awaiting that, so every navbar click used to stare at the page it was
 * leaving. Each read now sits behind its own boundary and the shell stays
 * synchronous, which lets the page answer a click immediately.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader logoSrc={brandLogoSrc()} />
      <main id="main">
        {children}
        <Suspense fallback={null}>
          <DraftPreviewNotice />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <FooterChrome />
      </Suspense>
      <Suspense fallback={null}>
        <ChatBubbleChrome />
      </Suspense>
      <Suspense fallback={null}>
        <ConsentChrome />
      </Suspense>
    </>
  );
}

async function FooterChrome() {
  const settings = await getSettings();
  const business = settings.business;
  return (
    <SiteFooter
      business={business}
      whatsappHref={business.whatsappNumber
        ? waLink(business.whatsappNumber, WHATSAPP_GENERAL_MESSAGE)
        : null}
      logoSrc={brandLogoSrc()}
      clearedForAssistant={Boolean(business.whatsappNumber)}
    />
  );
}

async function ChatBubbleChrome() {
  const settings = await getSettings();
  const number = settings.business.whatsappNumber;
  if (!number) return null;
  return (
    <WhatsAppAssistant
      href={waLink(number, WHATSAPP_GENERAL_MESSAGE)}
      number={number}
    />
  );
}

async function ConsentChrome() {
  if (!env.gaId) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const number = (await getSettings()).business.whatsappNumber;
  return <AnalyticsConsent gaId={env.gaId} nonce={nonce} raised={Boolean(number)} />;
}

async function DraftPreviewNotice() {
  if (!(await getPreviewingContent())) return null;
  return (
    <>
      {/* Replaces the padding the banner used to force on <main>. */}
      <div aria-hidden="true" className="h-24" />
      <div
        role="status"
        aria-label="Draft preview"
        className="fixed inset-x-0 bottom-0 z-[70] border-t-2 border-brass bg-olive-deep text-paper"
      >
        <div className="container-page flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
          <p className="text-[0.875rem] leading-snug">
            <span className="font-semibold">Draft preview.</span>{" "}
            <span className="text-paper/75">
              You are seeing saved draft content. Visitors still see the published page.
            </span>
          </p>
          <form action={stopPreviewAction} className="ml-auto">
            <button
              type="submit"
              className="btn btn-sm border-paper/40 text-paper hover:bg-paper/10"
            >
              Exit preview
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
