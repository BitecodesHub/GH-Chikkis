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
        // The badge already spells "GH Chikki's", so it stands in for the type
        // lockup instead of sitting next to a second copy of the name. Its brown
        // fills disappear on the dark olive surfaces, so there it rides a plate.
        <span
          className={cn(
            "shrink-0",
            tone === "paper" && "inline-flex rounded-[1rem] bg-paper p-1.5",
          )}
        >
          <Image
            src={logoSrc}
            alt=""
            width={96}
            height={129}
            className="h-10 w-auto sm:h-11"
            priority
          />
        </span>
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
