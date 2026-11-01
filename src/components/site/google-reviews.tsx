import { Star } from "lucide-react";
import { getReviewsSnapshot, googleMapsUrl } from "@/lib/google-reviews";
import type { GoogleReview } from "@/lib/google-reviews";

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className="inline-flex items-center gap-0.5 text-brass"
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          aria-hidden="true"
          size={14}
          strokeWidth="1.5"
          fill={step <= rounded ? "currentColor" : "none"}
          className={step <= rounded ? "" : "text-line-strong"}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <figure className="surface flex h-full flex-col p-5">
      <Stars rating={review.rating} />
      <blockquote className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">
        “{review.text}”
      </blockquote>
      <figcaption className="meta mt-4 flex flex-wrap items-center gap-x-2">
        <span className="font-semibold text-ink">{review.author}</span>
        {review.when ? <span>· {review.when}</span> : null}
      </figcaption>
    </figure>
  );
}

/**
 * Renders only what Google actually returned for the configured place. With no
 * place ID, no key or a failed lookup, the band is absent rather than invented.
 */
export async function GoogleReviews() {
  const snapshot = await getReviewsSnapshot();
  if (!snapshot || (!snapshot.rating && snapshot.reviews.length === 0)) return null;

  return (
    <section className="border-t border-line">
      <div className="container-page py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">On Google</p>
            <h2 className="display-m mt-4">What customers say</h2>
          </div>
          {snapshot.rating ? (
            <p className="flex items-center gap-3 text-[0.9375rem] text-ink-soft">
              <Stars rating={snapshot.rating} />
              <span className="font-semibold text-ink tabular-nums">
                {snapshot.rating.toFixed(1)}
              </span>
              {snapshot.total ? (
                <span className="meta">from {snapshot.total} Google reviews</span>
              ) : null}
            </p>
          ) : null}
        </div>

        {snapshot.reviews.length > 0 ? (
          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.reviews.map((review, index) => (
              <li key={`${review.author}-${index}`} className="h-full">
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-7 text-[0.875rem]">
          <a
            href={googleMapsUrl(snapshot.placeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline font-semibold"
          >
            Read all reviews on Google
          </a>
          <span className="meta ml-2">Reviews are Google users’ own words.</span>
        </p>
      </div>
    </section>
  );
}
