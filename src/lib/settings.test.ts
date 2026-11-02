import { describe, expect, it } from "vitest";
import { DEFAULT_EXPENSE_CATEGORIES, defaultSettings } from "./settings";

describe("default settings", () => {
  it("carries the brand line the owner chose", () => {
    expect(defaultSettings().business.tagline).toBe("Ghar ki Gud-crafted Chikki's");
    expect(defaultSettings().business.name).toBe("GH Chikkis");
  });

  it("ships the contact links the owner supplied", () => {
    const { business } = defaultSettings();
    expect(business.email).toBe("ghchikkis@gmail.com");
    expect(business.instagramUrl).toBe("https://www.instagram.com/ghchikkis");
    expect(business.googleReviewUrl).toMatch(/^https:\/\/(www\.)?(g\.page|google\.com)\//);
    expect(business.addressLine).toContain("Paldi");
    expect(business.addressLine).toContain("380007");
    expect(business.mapsUrl).toMatch(/^https:\/\/maps\.app\.goo\.gl\//);
  });

  it("leaves details we have not been given blank instead of inventing them", () => {
    const { business } = defaultSettings();
    expect(business.whatsappNumber).toBe("");
    expect(business.gstin).toBe("");
  });

  it("starts with every paid or outbound integration switched off", () => {
    const settings = defaultSettings();
    expect(settings.whatsapp.liveEnabled).toBe(false);
    expect(settings.reviews.enabled).toBe(false);
    expect(settings.reviews.googlePlaceId).toBe("");
    expect(settings.updatedBy).toBe("system");
  });

  it("gives expenses a usable, non-repeating category list", () => {
    const settings = defaultSettings();
    expect(settings.expenseCategories).toEqual(DEFAULT_EXPENSE_CATEGORIES);
    expect(new Set(settings.expenseCategories).size).toBe(settings.expenseCategories.length);
    expect(settings.expenseCategories).toContain("Ingredients/raw materials");
  });

  it("returns a fresh object each call so a screen cannot mutate the defaults", () => {
    const first = defaultSettings();
    first.business.name = "Changed";
    first.expenseCategories.push("Something made up");
    const second = defaultSettings();
    expect(second.business.name).toBe("GH Chikkis");
    expect(second.expenseCategories).toEqual(DEFAULT_EXPENSE_CATEGORIES);
  });
});
