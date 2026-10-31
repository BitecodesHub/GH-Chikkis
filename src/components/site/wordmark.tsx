import Link from "next/link";
import { cn } from "@/lib/cn";
import { Diamond } from "@/components/ui/diamond";

export function Wordmark({
  tone = "ink",
  className,
  href = "/",
  label = "GH Chikkis — home",
}: {
  tone?: "ink" | "paper";
  className?: string;
  href?: string;
  label?: string;
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
      <Diamond
        size="sm"
        filled={tone === "paper"}
        className={tone === "paper" ? "bg-paper" : undefined}
      />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.6rem] font-semibold leading-[0.9] tracking-[-0.045em]">
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
    </Link>
  );
}
