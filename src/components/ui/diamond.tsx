import { cn } from "@/lib/cn";

export function Diamond({
  className,
  filled = false,
  size = "md",
}: {
  className?: string;
  filled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = {
    sm: "size-1.5",
    md: "size-2",
    lg: "size-2.5",
  }[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rotate-45",
        dimensions,
        filled ? "bg-brass" : "border border-brass",
        className,
      )}
    />
  );
}

/** A hairline rule, for the places the Owner asked for a dash rather than a gem. */
export function Dash({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-px w-5 shrink-0 self-center", className)}
    />
  );
}
