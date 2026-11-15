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
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-s mt-3">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-line-strong/70 via-line/50 to-transparent sm:col-span-2"
      />
    </header>
  );
}
