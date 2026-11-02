import type { BusinessSettings } from "./types";

/**
 * The footer and the contact page both point visitors at the kitchen. The
 * Owner's own map pin is preferred; without one, Google's documented search
 * URL still takes them to the right street.
 */
export function locationHref(business: BusinessSettings): string {
  if (business.mapsUrl.trim()) return business.mapsUrl.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    locationLabel(business),
  )}`;
}

export function locationLabel(business: BusinessSettings): string {
  return (
    business.addressLine.trim() ||
    [business.city, business.state].map((part) => part.trim()).filter(Boolean).join(", ")
  );
}
