import { describe, expect, it } from "vitest";
import type { BusinessSettings } from "./types";
import { locationHref, locationLabel } from "./location";

const base: BusinessSettings = {
  name: "GH Chikkis",
  tagline: "",
  city: "Ahmedabad",
  state: "Gujarat",
  whatsappNumber: "",
  email: "",
  phoneDisplay: "",
  instagramUrl: "",
  googleReviewUrl: "",
  addressLine: "",
  mapsUrl: "",
  gstin: "",
};

describe("location helpers", () => {
  it("opens the owner's own map pin when there is one", () => {
    const business = { ...base, mapsUrl: "https://maps.app.goo.gl/abc123" };
    expect(locationHref(business)).toBe("https://maps.app.goo.gl/abc123");
  });

  it("falls back to a maps search for the address, encoded", () => {
    const business = { ...base, addressLine: "Paldi, Ahmedabad - 380007" };
    expect(locationHref(business)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Paldi%2C%20Ahmedabad%20-%20380007",
    );
  });

  it("settles for city and state when no street address is on file", () => {
    expect(locationLabel(base)).toBe("Ahmedabad, Gujarat");
    expect(locationHref(base)).toContain("query=Ahmedabad%2C%20Gujarat");
  });

  it("prefers the street address over city and state", () => {
    expect(locationLabel({ ...base, addressLine: "3, Gopal Nivas, Paldi" })).toBe(
      "3, Gopal Nivas, Paldi",
    );
  });
});
