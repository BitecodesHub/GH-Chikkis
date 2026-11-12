import type { PaymentStatus, WeightBasis } from "./types";

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const rupeeFormatterWithPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Whole rupees by default, paise only when they exist. */
export function formatINR(paise: number, options?: { alwaysPaise?: boolean }): string {
  if (!Number.isFinite(paise)) return "₹0";
  const safe = Math.round(paise);
  if (options?.alwaysPaise || safe % 100 !== 0) {
    return rupeeFormatterWithPaise.format(safe / 100);
  }
  return rupeeFormatter.format(safe / 100);
}

export function formatINRPlain(paise: number): string {
  return formatINR(paise);
}

export function parseRupeesToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  const cleaned = input.replace(/[₹,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === "+") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  const paise = Math.round(value * 100);
  if (!Number.isSafeInteger(paise)) return null;
  return paise;
}

export function paiseToInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || !Number.isFinite(paise)) return "";
  const value = paise / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function ratePerGramFromStandard(
  standardPricePaise: number | null | undefined,
  grams: number,
): number | null {
  if (
    standardPricePaise === null ||
    standardPricePaise === undefined ||
    !Number.isFinite(standardPricePaise) ||
    standardPricePaise < 0 ||
    !Number.isFinite(grams) ||
    grams <= 0
  ) {
    return null;
  }
  return Math.round(standardPricePaise / grams);
}

export interface LineCalculation {
  standardAmountPaise: number;
  lineTotalPaise: number;
}

export function calculateLineAmount(input: {
  ratePerGramPaise: number;
  actualWeightGrams: number;
  weightBasis: WeightBasis;
  quantity: number;
  adjustmentPaise?: number;
  /** Exact price for the basis weight; wins over the per-gram rate. */
  basisPricePaise?: number;
}): LineCalculation {
  const { ratePerGramPaise, actualWeightGrams, weightBasis, quantity } = input;
  if (!Number.isInteger(ratePerGramPaise) || ratePerGramPaise < 0) {
    throw new Error("Rate must be a non-negative whole number of paise.");
  }
  if (!Number.isFinite(actualWeightGrams) || actualWeightGrams <= 0) {
    throw new Error("Actual weight must be greater than zero.");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a whole number greater than zero.");
  }
  const adjustment = input.adjustmentPaise ?? 0;
  if (!Number.isInteger(adjustment)) {
    throw new Error("Adjustment must be whole paise.");
  }
  const basisPrice = input.basisPricePaise;
  if (basisPrice !== undefined && (!Number.isInteger(basisPrice) || basisPrice < 0)) {
    throw new Error("Price must be a non-negative whole number of paise.");
  }
  const multiplier = weightBasis === "PER_UNIT" ? quantity : 1;
  const standardAmountPaise =
    basisPrice !== undefined
      ? basisPrice * multiplier
      : Math.round(ratePerGramPaise * actualWeightGrams * multiplier);
  const lineTotalPaise = standardAmountPaise + adjustment;
  if (lineTotalPaise < 0) {
    throw new Error("The adjustment cannot make a line negative.");
  }
  if (!Number.isSafeInteger(lineTotalPaise)) {
    throw new Error("The line total is too large.");
  }
  return { standardAmountPaise, lineTotalPaise };
}

export function sumPaise(values: number[]): number {
  return values.reduce((total, value) => total + Math.round(value), 0);
}

export function paymentStatusFor(totalPaise: number, netPaidPaise: number): PaymentStatus {
  if (totalPaise <= 0) return "FULLY_PAID";
  if (netPaidPaise <= 0) return "UNPAID";
  if (netPaidPaise < totalPaise) return "PARTIALLY_PAID";
  return "FULLY_PAID";
}

export function balanceFor(totalPaise: number, netPaidPaise: number): number {
  return Math.max(0, Math.max(0, totalPaise) - Math.max(0, netPaidPaise));
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function parseNonNegativeInt(input: string | null | undefined): number | null {
  if (!input) return null;
  if (!/^\d+$/.test(input.trim())) return null;
  const value = Number(input);
  return Number.isSafeInteger(value) ? value : null;
}
