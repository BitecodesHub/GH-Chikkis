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
