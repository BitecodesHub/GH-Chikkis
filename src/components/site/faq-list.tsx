export function FaqList({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((faq) => (
        <details key={faq.question} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
            <span className="display-s pr-2 text-[1.15rem] leading-snug">{faq.question}</span>
            <span
              aria-hidden="true"
              className="mt-1 inline-block shrink-0 text-xl leading-none text-brass transition-transform duration-200 group-open:rotate-45 motion-reduce:transform-none"
            >
              +
            </span>
          </summary>
          <p className="max-w-3xl pb-6 text-[0.9375rem] leading-relaxed text-ink-soft">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
