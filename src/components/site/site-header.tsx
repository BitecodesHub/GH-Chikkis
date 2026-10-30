"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./wordmark";

const NAV_ITEMS = [
  { href: "/collection", label: "Collection" },
  { href: "/our-story", label: "Our Story" },
  { href: "/process", label: "Process" },
  { href: "/gifting", label: "Gifting" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-20">
        <Wordmark />

        <div className="flex items-center gap-7">
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex xl:gap-8">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "text-[0.875rem] font-semibold text-ink"
                      : "text-[0.875rem] text-ink-soft transition-colors hover:text-ink"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link href="/contact#enquiry" className="btn btn-solid btn-sm hidden lg:inline-flex">
            Start an enquiry
          </Link>

          <button
            type="button"
            className="btn btn-outline btn-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <div id="mobile-nav" hidden={!open} className="border-t border-line bg-paper lg:hidden">
        <nav aria-label="Mobile" className="container-page flex flex-col py-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={
                  active
                    ? "border-b border-line py-3.5 text-base font-semibold text-ink"
                    : "border-b border-line py-3.5 text-base text-ink-soft"
                }
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/contact#enquiry"
            onClick={() => setOpen(false)}
            className="btn btn-solid mt-5 mb-1 w-full"
          >
            Start an enquiry
          </Link>
        </nav>
      </div>
    </header>
  );
}
