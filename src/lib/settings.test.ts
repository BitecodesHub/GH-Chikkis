import { describe, expect, it } from "vitest";
import { DEFAULT_EXPENSE_CATEGORIES, defaultSettings } from "./settings";

describe("default settings", () => {
  it("carries the brand line the owner chose", () => {
    expect(defaultSettings().business.tagline).toBe("Ghar ki Gud-crafted Chikki's");
    expect(defaultSettings().business.name).toBe("GH Chikkis");
  });

  it("leaves real contact details blank instead of inventing them", () => {
    const { business } = defaultSettings();
    expect(business.whatsappNumber).toBe("");
    expect(business.email).toBe("");
    expect(business.instagramUrl).toBe("");
    expect(business.addressLine).toBe("");
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
