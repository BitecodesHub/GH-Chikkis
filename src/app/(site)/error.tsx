"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-page py-20 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow eyebrow-plain justify-center">Something went wrong</p>
        <h1 className="display-l mt-4">We couldn’t load this page.</h1>
        <p className="lede mt-5">
          Please try again. If it keeps happening, message us on WhatsApp or use the
          enquiry form and we will help directly.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-solid">
            Try again
          </button>
          <Link href="/contact#enquiry" className="btn btn-outline">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
