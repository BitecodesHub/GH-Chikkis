/**
 * The owner's exact expense-desk list, in the owner's exact order: first
 * Black tal, last Salary. Shared by the inventory sort, the seed and the
 * one-off migration so the three can never drift apart.
 */
export interface ExpenseCatalogItem {
  name: string;
  category: "Ingredients/raw materials" | "Packaging";
  unit: "kg" | "pieces";
}

export const EXPENSE_CATALOG: ExpenseCatalogItem[] = [
  { name: "Black tal", category: "Ingredients/raw materials", unit: "kg" },
  { name: "White tal", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Shing", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Daliya", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Kopra nu chhin", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Cashew", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Cashew – grated", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Almond", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Almond – grated", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Pista", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Pista – grated", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Ghee", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Jaggery", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Jaggery – organic", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Mamra", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Box – 250 gm", category: "Packaging", unit: "pieces" },
  { name: "Box – 500 gm", category: "Packaging", unit: "pieces" },
  { name: "Butter paper", category: "Packaging", unit: "pieces" },
  { name: "Silica", category: "Packaging", unit: "pieces" },
  { name: "Plastic bag – small", category: "Packaging", unit: "pieces" },
  { name: "Plastic bag – big", category: "Packaging", unit: "pieces" },
  { name: "Sticker", category: "Packaging", unit: "pieces" },
];

// Salary is not stock: it books a plain Labour expense, never a movement.
export const SALARY_TILE_NAME = "Salary";
export const SALARY_EXPENSE_CATEGORY = "Labour";

export const EXPENSE_TILE_ORDER: string[] = [
  ...EXPENSE_CATALOG.map((item) => item.name),
  SALARY_TILE_NAME,
];

const CATALOG_RANK = new Map(
  EXPENSE_CATALOG.map((item, index) => [item.name.trim().toLowerCase(), index]),
);

/** Kitchen rank for stock items; anything the owner adds sorts after them. */
export function expenseCatalogRank(name: string): number {
  return CATALOG_RANK.get(name.trim().toLowerCase()) ?? EXPENSE_CATALOG.length;
}
