"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * One answer open at a time: a visitor scanning the list should never have to
 * work out which of five expanded blocks they were reading. The panel collapses
 * with a grid-row transition so the height animates without measuring in JS.
 */
export function FaqList({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState(0);
  const group = useId();

  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((faq, index) => {
        const isOpen = index === open;
        const buttonId = `${group}-q-${index}`;
        const panelId = `${group}-a-${index}`;
        return (
          <div key={faq.question}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="flex w-full cursor-pointer items-start justify-between gap-6 py-5 text-left"
              >
                <span className="display-s pr-2 text-[1.15rem] leading-snug">
                  {faq.question}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 inline-block shrink-0 text-xl leading-none text-brass transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    isOpen && "rotate-45",
                  )}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-3xl pb-6 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
