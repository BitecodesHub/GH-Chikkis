"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="container-page">
        <div
          className={`glass relative flex items-center justify-between gap-3 rounded-full pl-4 pr-2 transition-[height,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            scrolled ? "h-14" : "h-16"
          }`}
        >
          <Wordmark />

          <nav aria-label="Main" className="nav-segment absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                data-active={isActive(pathname, item.href) ? "true" : undefined}
                className="nav-segment-item"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/contact#enquiry"
              className="btn btn-solid btn-sm hidden sm:inline-flex"
            >
              <span className="lg:hidden">Enquire</span>
              <span className="hidden lg:inline">Start an enquiry</span>
            </Link>

            <button
              type="button"
              className="btn btn-outline btn-sm grid place-items-center px-2 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            </button>
          </div>
        </div>

        <div id="mobile-nav" hidden={!open} className="glass mt-2 rounded-3xl p-3 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
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
                      ? "rounded-2xl bg-white/70 px-4 py-3 text-base font-semibold text-ink"
                      : "rounded-2xl px-4 py-3 text-base text-ink-soft transition-colors hover:bg-white/45"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/contact#enquiry"
              onClick={() => setOpen(false)}
              className="btn btn-solid mt-3 mb-1 w-full"
            >
              Start an enquiry
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
