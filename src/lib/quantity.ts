export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function parseInventoryQuantity(
  value: unknown,
  options: { allowZero?: boolean } = {},
): number | null {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  if (!options.allowZero && parsed <= 0) return null;
  return roundQuantity(parsed);
}

export function formatStockQuantity(quantity: number): string {
  return quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function stockLabel(quantity: number, unit: string): string {
  return `${formatStockQuantity(quantity)} ${unit}`;
}

/**
 * Most packaging labels already read "250 g", so printing the weighed grams
 * beside them gives the customer "250 g (250 g)". Returns the parenthetical only
 * when the label does not already state that weight.
 */
export function weightAside(item: {
  packagingLabel: string;
  actualWeightGrams: number;
  weightBasis?: "PER_UNIT" | "TOTAL";
}): string {
  if (item.packagingLabel.includes(String(item.actualWeightGrams))) return "";
  const basis = item.weightBasis === "PER_UNIT" ? " each" : item.weightBasis === "TOTAL" ? " total" : "";
  return ` (${item.actualWeightGrams} g${basis})`;
}
