import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Diamond } from "@/components/ui/diamond";

export function Wordmark({
  tone = "ink",
  className,
  href = "/",
  label = "GH Chikkis — home",
  logoSrc,
}: {
  tone?: "ink" | "paper";
  className?: string;
  href?: string;
  label?: string;
  logoSrc?: string | null;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group inline-flex items-center gap-3",
        tone === "paper" ? "text-paper" : "text-ink",
        className,
      )}
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt="GH Chikkis"
          width={176}
          height={48}
          className="h-10 w-auto object-contain sm:h-11"
          priority
        />
      ) : (
        <>
          <Diamond
            size="sm"
            filled={tone === "paper"}
            className={tone === "paper" ? "bg-paper" : undefined}
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[1.7rem] font-semibold leading-[0.95] tracking-[-0.02em]">
              GH
            </span>
            <span
              className={cn(
                "mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.36em]",
                tone === "paper" ? "text-paper/70" : "text-ink-muted",
              )}
            >
              Chikkis
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
