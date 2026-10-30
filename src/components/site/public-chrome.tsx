import type { ReactNode } from "react";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AnalyticsConsent } from "@/components/site/analytics-consent";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { waLink, WHATSAPP_GENERAL_MESSAGE } from "@/lib/phone";

export async function PublicChrome({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  const business = settings.business;
  const whatsappHref = business.whatsappNumber
    ? waLink(business.whatsappNumber, WHATSAPP_GENERAL_MESSAGE)
    : null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter business={business} whatsappHref={whatsappHref} />
      {env.gaId ? <AnalyticsConsent gaId={env.gaId} nonce={nonce} /> : null}
    </>
  );
}
