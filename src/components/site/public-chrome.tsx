import type { ReactNode } from "react";
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

export async function PublicChrome({ children }: { children: ReactNode }) {
  const [settings, previewing] = await Promise.all([
    getSettings(),
    getPreviewingContent(),
  ]);
  const business = settings.business;
  const whatsappHref = business.whatsappNumber
    ? waLink(business.whatsappNumber, WHATSAPP_GENERAL_MESSAGE)
    : null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const logoSrc = brandLogoSrc();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader logoSrc={logoSrc} />
      <main id="main" className={previewing ? "pb-24" : undefined}>
        {children}
      </main>
      <SiteFooter
        business={business}
        whatsappHref={whatsappHref}
        logoSrc={logoSrc}
        clearedForAssistant={Boolean(whatsappHref)}
      />
      {whatsappHref ? (
        <WhatsAppAssistant href={whatsappHref} number={business.whatsappNumber} />
      ) : null}
      {env.gaId ? (
        <AnalyticsConsent
          gaId={env.gaId}
          nonce={nonce}
          raised={Boolean(whatsappHref)}
        />
      ) : null}
      {previewing ? (
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
      ) : null}
    </>
  );
}
