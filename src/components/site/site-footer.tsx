import Link from "next/link";
import type { BusinessSettings } from "@/lib/types";
import { Wordmark } from "./wordmark";

const EXPLORE_LINKS = [
  { href: "/collection", label: "Chikki Collection" },
  { href: "/our-story", label: "Our Story" },
  { href: "/process", label: "Handmade Process" },
  { href: "/gifting", label: "Bulk & Corporate Gifting" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter({
  business,
  whatsappHref,
}: {
  business: BusinessSettings;
  whatsappHref: string | null;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-olive-deep text-paper">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr] md:gap-10 md:py-20">
        <div>
          <Wordmark tone="paper" />
          <p className="mt-6 max-w-xs text-[0.9375rem] leading-relaxed text-paper/75">
            Handmade chikki from a family kitchen in Ahmedabad. Ghar ki gud,
            made by hand since 2018.
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
                  className="transition-colors hover:text-paper"
                >
                  WhatsApp
                </a>
              </li>
            ) : null}
            {business.email ? (
              <li>
                <a
                  href={`mailto:${business.email}`}
                  className="transition-colors hover:text-paper"
                >
                  {business.email}
                </a>
              </li>
            ) : null}
            {business.instagramUrl ? (
              <li>
                <a
                  href={business.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-paper"
                >
                  Instagram
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/contact#enquiry" className="transition-colors hover:text-paper">
                Enquiry form
              </Link>
            </li>
            <li className="pt-1 text-paper/60">
              {business.city}
              {business.state ? `, ${business.state}` : ""}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/15">
        <div className="container-page flex flex-col gap-4 py-6 text-[0.8125rem] text-paper/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {business.name}. All rights reserved.
          </p>
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
