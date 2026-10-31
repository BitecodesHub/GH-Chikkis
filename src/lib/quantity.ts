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
