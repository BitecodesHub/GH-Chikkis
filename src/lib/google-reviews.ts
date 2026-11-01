import "server-only";
import { getDb } from "./db";
import { env } from "./env";
import { getSettings } from "./settings";
import { nowIso } from "./dates";
import { invalidateReads, readThrough, READ_TTL } from "./read-cache";

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  when: string;
}

export interface ReviewsSnapshot {
  placeId: string;
  name: string;
  rating: number;
  total: number;
  reviews: GoogleReview[];
  fetchedAt: string;
}

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const FIELD_MASK = [
  "displayName",
  "rating",
  "userRatingCount",
  "reviews.authorAttribution.displayName",
  "reviews.rating",
  "reviews.relativeCreateTimeText",
  "reviews.text.text",
].join(",");

export function googleMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

type StoredSnapshot = ReviewsSnapshot & { _id: string };

function withoutId(doc: StoredSnapshot): ReviewsSnapshot {
  const { _id, ...rest } = doc;
  void _id;
  return rest;
}

async function fetchPlacesSnapshot(placeId: string): Promise<ReviewsSnapshot | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": env.google.placesApiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    },
  );
  if (!response.ok) throw new Error(`places responded ${response.status}`);
  const data = (await response.json()) as {
    displayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
    reviews?: {
      authorAttribution?: { displayName?: string };
      rating?: number;
      relativeCreateTimeText?: string;
      text?: { text?: string };
    }[];
  };

  const snapshot: ReviewsSnapshot = {
    placeId,
    name: data.displayName?.text?.trim() || "GH Chikkis",
    rating: Number.isFinite(data.rating) ? Number(data.rating) : 0,
    total: Number.isFinite(data.userRatingCount) ? Number(data.userRatingCount) : 0,
    reviews: Array.isArray(data.reviews)
      ? data.reviews
          .map((review) => ({
            author: review.authorAttribution?.displayName?.trim() ?? "Google user",
            rating: Number.isFinite(review.rating) ? Number(review.rating) : 0,
            text: review.text?.text?.trim() ?? "",
            when: review.relativeCreateTimeText?.trim() ?? "",
          }))
          .filter((review) => review.text.length > 0)
          .slice(0, 3)
      : [],
    fetchedAt: nowIso(),
  };
  if (!snapshot.rating && snapshot.reviews.length === 0) return null;

  const db = await getDb();
  await db
    .collection<StoredSnapshot>("google_reviews")
    .updateOne(
      { _id: "snapshot" },
      { $set: snapshot, $setOnInsert: { _id: "snapshot" } },
      { upsert: true },
    );
  invalidateReads("reviews");
  return snapshot;
}

/**
 * Nothing here is invented: the band on the site renders only what Google
 * returns for the configured place, and renders nothing at all if that fails.
 *
 * A visitor never waits on the Places API. Once a snapshot exists it is served
 * while a refresh runs behind the response, so only the very first render after
 * a place is configured pays for the round trip.
 */
export async function getReviewsSnapshot(): Promise<ReviewsSnapshot | null> {
  return readThrough("reviews:snapshot", READ_TTL.reviews, loadReviewsSnapshot);
}

async function loadReviewsSnapshot(): Promise<ReviewsSnapshot | null> {
  const settings = await getSettings();
  const placeId = settings.reviews.googlePlaceId.trim();
  if (!settings.reviews.enabled || !placeId) return null;

  const db = await getDb();
  const collection = db.collection<StoredSnapshot>("google_reviews");
  const cached = await collection.findOne({ _id: "snapshot" });
  const usable = cached && cached.placeId === placeId ? withoutId(cached) : null;

  if (usable && Date.now() - new Date(usable.fetchedAt).getTime() < REFRESH_AFTER_MS) {
    return usable;
  }
  // A stale snapshot beats a page with no reviews; no key beats a crash.
  if (!env.google.placesApiKey) return usable;

  if (usable) {
    void fetchPlacesSnapshot(placeId).catch(() => {});
    return usable;
  }
  try {
    return await fetchPlacesSnapshot(placeId);
  } catch {
    return null;
  }
}

/**
 * The cached Google data only — no network call, so the admin settings page
 * can show what customers would actually see without waiting on Places.
 */
export async function peekReviewsSnapshot(placeId: string): Promise<ReviewsSnapshot | null> {
  if (!placeId) return null;
  const db = await getDb();
  const cached = await db
    .collection<StoredSnapshot>("google_reviews")
    .findOne({ _id: "snapshot" });
  return cached && cached.placeId === placeId ? withoutId(cached) : null;
}

export async function clearReviewsSnapshot(): Promise<void> {
  const db = await getDb();
  await db
    .collection<StoredSnapshot>("google_reviews")
    .deleteOne({ _id: "snapshot" });
  invalidateReads("reviews");
}
