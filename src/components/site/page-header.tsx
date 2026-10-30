import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-line">
      <div className="container-page py-14 md:py-20">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display-l mt-5 max-w-4xl">{title}</h1>
        {intro ? <p className="lede mt-6 max-w-2xl">{intro}</p> : null}
        {children}
      </div>
    </header>
  );
}

export function ArrowLink({
  href,
  children,
  className,
  tone = "ink",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  tone?: "ink" | "paper";
}) {
  return (
    <Link
      href={href}
      className={
        "group inline-flex items-center gap-2 text-[0.9375rem] font-semibold transition-colors " +
        (tone === "paper"
          ? "text-paper hover:text-paper/80 "
          : "text-ink hover:text-terracotta ") +
        (className ?? "")
      }
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
      >
        →
      </span>
    </Link>
  );
}
