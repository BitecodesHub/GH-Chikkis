import { describe, expect, it } from "vitest";
import {
  balanceFor,
  calculateLineAmount,
  formatINR,
  parseRupeesToPaise,
  paymentStatusFor,
  percent,
  ratePerGramFromStandard,
} from "./money";

describe("formatINR", () => {
  it("drops paise when the amount is whole rupees", () => {
    expect(formatINR(15000)).toBe("₹150");
  });

  it("keeps paise when they exist", () => {
    expect(formatINR(15050)).toBe("₹150.50");
  });

  it("groups Indian digit positions", () => {
    expect(formatINR(1250000)).toBe("₹12,500");
  });

  it("shows a zero rather than garbage for a bad number", () => {
    expect(formatINR(Number.NaN)).toBe("₹0");
  });
});

describe("parseRupeesToPaise", () => {
  it("accepts the way the owner types money", () => {
    expect(parseRupeesToPaise("₹1,250.50")).toBe(125050);
    expect(parseRupeesToPaise(" 800 ")).toBe(80000);
    expect(parseRupeesToPaise(800)).toBe(80000);
  });

  it("rejects blanks and non-numbers instead of guessing zero", () => {
    expect(parseRupeesToPaise("")).toBeNull();
    expect(parseRupeesToPaise("-")).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise(null)).toBeNull();
  });

  it("round-trips through the input value", () => {
    expect(parseRupeesToPaise("150.75")).toBe(15075);
  });
});

describe("ratePerGramFromStandard", () => {
  it("derives a per-gram rate from a pack price", () => {
    expect(ratePerGramFromStandard(15000, 250)).toBe(60);
  });

  it("refuses to divide by a missing weight", () => {
    expect(ratePerGramFromStandard(15000, 0)).toBeNull();
    expect(ratePerGramFromStandard(null, 250)).toBeNull();
  });
});

describe("calculateLineAmount", () => {
  it("preserves exact piece prices instead of rounding through a per-gram rate", () => {
    expect(calculateLineAmount({
      ratePerGramPaise: 36, actualWeightGrams: 275, weightBasis: "PER_UNIT",
      quantity: 3, basisPricePaise: 10000,
    }).lineTotalPaise).toBe(30000);
  });

  it("preserves a total-basis price without multiplying it by quantity", () => {
    expect(calculateLineAmount({
      ratePerGramPaise: 36, actualWeightGrams: 275, weightBasis: "TOTAL",
      quantity: 3, basisPricePaise: 10000, adjustmentPaise: -50,
    }).lineTotalPaise).toBe(9950);
  });

  it("honours an explicit zero price and rejects invalid exact prices", () => {
    const input = { ratePerGramPaise: 36, actualWeightGrams: 275,
      weightBasis: "PER_UNIT" as const, quantity: 1 };
    expect(calculateLineAmount({ ...input, basisPricePaise: 0 }).lineTotalPaise).toBe(0);
    for (const price of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => calculateLineAmount({ ...input, basisPricePaise: price })).toThrow();
    }
  });

  it("scales by quantity only when the basis is per unit", () => {
    const perUnit = calculateLineAmount({
      ratePerGramPaise: 60,
      actualWeightGrams: 250,
      weightBasis: "PER_UNIT",
      quantity: 3,
    });
    const total = calculateLineAmount({
      ratePerGramPaise: 60,
      actualWeightGrams: 250,
      weightBasis: "TOTAL",
      quantity: 3,
    });
    expect(perUnit.standardAmountPaise).toBe(45000);
    expect(total.standardAmountPaise).toBe(15000);
  });

  it("applies a whole-paise adjustment to the line total", () => {
    const line = calculateLineAmount({
      ratePerGramPaise: 60,
      actualWeightGrams: 250,
      weightBasis: "TOTAL",
      quantity: 1,
      adjustmentPaise: -500,
    });
    expect(line.lineTotalPaise).toBe(14500);
  });

  it("refuses an adjustment that makes a line negative", () => {
    expect(() =>
      calculateLineAmount({
        ratePerGramPaise: 60,
        actualWeightGrams: 250,
        weightBasis: "TOTAL",
        quantity: 1,
        adjustmentPaise: -20000,
      }),
    ).toThrow("The adjustment cannot make a line negative.");
  });

  it("refuses a zero weight or quantity rather than billing nothing silently", () => {
    expect(() =>
      calculateLineAmount({
        ratePerGramPaise: 60,
        actualWeightGrams: 0,
        weightBasis: "TOTAL",
        quantity: 1,
      }),
    ).toThrow("Actual weight must be greater than zero.");
    expect(() =>
      calculateLineAmount({
        ratePerGramPaise: 60,
        actualWeightGrams: 250,
        weightBasis: "TOTAL",
        quantity: 0,
      }),
    ).toThrow("Quantity must be a whole number greater than zero.");
  });
});

describe("payment status", () => {
  it("reads the order of a payment against the total", () => {
    expect(paymentStatusFor(100000, 0)).toBe("UNPAID");
    expect(paymentStatusFor(100000, 40000)).toBe("PARTIALLY_PAID");
    expect(paymentStatusFor(100000, 100000)).toBe("FULLY_PAID");
    expect(paymentStatusFor(100000, 120000)).toBe("FULLY_PAID");
    expect(paymentStatusFor(0, 0)).toBe("FULLY_PAID");
  });

  it("never reports a negative balance for an overpayment", () => {
    expect(balanceFor(100000, 120000)).toBe(0);
    expect(balanceFor(100000, 40000)).toBe(60000);
  });

  it("guards against a divide by zero in percentages", () => {
    expect(percent(25000, 100000)).toBe(25);
    expect(percent(25000, 0)).toBe(0);
  });
});
