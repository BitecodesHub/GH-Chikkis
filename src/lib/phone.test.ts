import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, maskPhone, normalizePhone, waLink } from "./phone";

describe("normalizePhone", () => {
  it("assumes India for a bare ten-digit number", () => {
    expect(normalizePhone("98765 43210")?.phone).toBe("919876543210");
  });

  it("accepts the ways the owner writes a number", () => {
    expect(normalizePhone("+91 98765 43210")?.phone).toBe("919876543210");
    expect(normalizePhone("09876543210")?.phone).toBe("919876543210");
    expect(normalizePhone("00919876543210")?.phone).toBe("919876543210");
  });

  it("keeps the original text for display while storing digits", () => {
    const result = normalizePhone(" +91-98765-43210 ");
    expect(result?.phone).toBe("919876543210");
    expect(result?.phoneOriginal).toBe("+91-98765-43210");
  });

  it("rejects numbers that cannot be dialled", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("9876543210123456")).toBeNull();
    expect(normalizePhone("no digits here")).toBeNull();
  });
});

describe("formatPhoneDisplay", () => {
  it("groups an Indian mobile in the way people read it", () => {
    expect(formatPhoneDisplay("919876543210")).toBe("+91 98765 43210");
    expect(formatPhoneDisplay("9876543210")).toBe("+91 98765 43210");
  });

  it("leaves an unfamiliar country code alone", () => {
    expect(formatPhoneDisplay("123456789012")).toBe("+123456789012");
  });
});

describe("maskPhone", () => {
  it("keeps only the last four digits visible", () => {
    expect(maskPhone("+91 98765 43210")).toBe("•••• 3210");
    expect(maskPhone("12")).toBe("••••");
  });
});

describe("waLink", () => {
  it("builds a clickable link with the message encoded", () => {
    expect(waLink("+91 98765 43210", "Bulk order? 250 g")).toBe(
      "https://wa.me/919876543210?text=Bulk%20order%3F%20250%20g",
    );
  });

  it("adds the country code to a bare 10-digit number", () => {
    expect(waLink("9876543210", "Hi")).toBe("https://wa.me/919876543210?text=Hi");
  });
});
