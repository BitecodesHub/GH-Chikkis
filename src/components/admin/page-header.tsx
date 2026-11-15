import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-s mt-1.5">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-line-strong/70 via-line/50 to-transparent"
      />
    </header>
  );
}
