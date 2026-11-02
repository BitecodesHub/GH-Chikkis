import Link from "next/link";
import { Mail, MapPin, Star } from "lucide-react";
import type { BusinessSettings } from "@/lib/types";
import { BRAND_COUPLET } from "@/lib/seo";
import { formatPhoneDisplay } from "@/lib/phone";
import { locationHref, locationLabel } from "@/lib/location";
import { cn } from "@/lib/cn";
import { WhatsAppMark } from "./whatsapp-mark";
import { Wordmark } from "./wordmark";

const EXPLORE_LINKS = [
  { href: "/collection", label: "Chikki Collection" },
  { href: "/our-story", label: "Our Story" },
  { href: "/process", label: "Handmade Process" },
  { href: "/gifting", label: "Bulk & Corporate Gifting" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
] as const;

function instagramHandle(url: string): string {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean);
    return path.length > 0 ? `@${path[path.length - 1]}` : "Instagram";
  } catch {
    return "Instagram";
  }
}

/** lucide-react dropped brand glyphs, so the Instagram outline is drawn here. */
function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function SiteFooter({
  business,
  whatsappHref,
  logoSrc,
  clearedForAssistant = false,
}: {
  business: BusinessSettings;
  whatsappHref: string | null;
  logoSrc?: string | null;
  /** The floating chat bubble sits over the bottom bar, so leave it room. */
  clearedForAssistant?: boolean;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-olive-deep text-paper">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr] md:gap-10 md:py-20">
        <div>
          <Wordmark tone="paper" logoSrc={logoSrc} />
          <p className="display-s mt-6 text-paper">{business.tagline}</p>
          <p className="font-display mt-2 text-[1.0625rem] italic leading-relaxed text-paper/70">
            {BRAND_COUPLET}
          </p>
          <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed text-paper/75">
            Handmade chikki from a family kitchen in Ahmedabad, made by Gopi Shah and
            Himani Shah.
          </p>
        </div>

        <nav aria-label="Footer" className="text-[0.9375rem]">
          <h2 className="eyebrow eyebrow-plain text-paper/60">Explore</h2>
          <ul className="mt-5 space-y-3">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-paper/85 transition-colors hover:text-paper"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-[0.9375rem]">
          <h2 className="eyebrow eyebrow-plain text-paper/60">Reach us</h2>
          <ul className="mt-5 space-y-3 text-paper/85">
            {whatsappHref ? (
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-paper/25 bg-paper/10 px-4 py-2 font-semibold text-paper transition-colors hover:bg-paper/20"
                >
                  <WhatsAppMark className="size-4" />
                  {formatPhoneDisplay(business.whatsappNumber)}
                </a>
              </li>
            ) : null}
            {business.email ? (
              <li>
                <a
                  href={`mailto:${business.email}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-paper"
                >
                  <Mail aria-hidden="true" className="size-4 text-paper/60" />
                  {business.email}
                </a>
              </li>
            ) : null}
            {business.googleReviewUrl ? (
              <li>
                <a
                  href={business.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-colors hover:text-paper"
                >
                  <Star aria-hidden="true" className="size-4 text-paper/60" />
                  Reviews on Google
                </a>
              </li>
            ) : null}
            {business.instagramUrl ? (
              <li>
                <a
                  href={business.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-colors hover:text-paper"
                >
                  <InstagramMark className="size-4 text-paper/60" />
                  {instagramHandle(business.instagramUrl)}
                </a>
              </li>
            ) : null}
            <li>
              <Link
                href="/contact#enquiry"
                className="inline-flex items-center gap-2 transition-colors hover:text-paper"
              >
                Enquiry form
              </Link>
            </li>
            <li className="pt-1">
              <a
                href={locationHref(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 transition-colors hover:text-paper"
              >
                <MapPin
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-paper/60 transition-colors group-hover:text-paper"
                />
                <span className="leading-relaxed">
                  {locationLabel(business)}
                  <span className="mt-0.5 block text-[0.8125rem] text-paper/55 underline-offset-2 group-hover:underline">
                    Open in Google Maps
                  </span>
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/15">
        <div
          className={cn(
            "container-page flex flex-col gap-4 py-6 text-[0.8125rem] text-paper/60 sm:flex-row sm:items-center sm:justify-between",
            clearedForAssistant && "pe-24 sm:pe-48",
          )}
        >
          <p>© {year} {business.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-paper">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-paper">
              Terms
            </Link>
            <Link href="/admin" className="transition-colors hover:text-paper">
              Staff sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
