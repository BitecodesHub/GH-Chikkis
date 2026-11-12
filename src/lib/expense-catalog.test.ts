import { describe, expect, it } from "vitest";
import {
  EXPENSE_CATALOG,
  EXPENSE_TILE_ORDER,
  SALARY_TILE_NAME,
  expenseCatalogRank,
} from "./expense-catalog";

describe("expense catalog", () => {
  it("keeps the owner's exact sequence, Black tal first and Salary last", () => {
    expect(EXPENSE_TILE_ORDER).toEqual([
      "Black tal",
      "White tal",
      "Shing",
      "Daliya",
      "Kopra nu chhin",
      "Cashew",
      "Cashew – grated",
      "Almond",
      "Almond – grated",
      "Pista",
      "Pista – grated",
      "Ghee",
      "Jaggery",
      "Jaggery – organic",
      "Mamra",
      "Box – 250 gm",
      "Box – 500 gm",
      "Butter paper",
      "Silica",
      "Plastic bag – small",
      "Plastic bag – big",
      "Sticker",
      "Salary",
    ]);
    expect(EXPENSE_TILE_ORDER).toHaveLength(23);
    expect(EXPENSE_CATALOG).toHaveLength(22);
    expect(EXPENSE_CATALOG.some((item) => item.name === SALARY_TILE_NAME)).toBe(false);
  });

  it("measures ingredients in kg and packaging in pieces", () => {
    for (const item of EXPENSE_CATALOG) {
      expect(item.unit).toBe(item.category === "Packaging" ? "pieces" : "kg");
    }
  });

  it("ranks kitchen items ahead of anything the owner adds later", () => {
    expect(expenseCatalogRank("Black tal")).toBe(0);
    expect(expenseCatalogRank("  black TAL ")).toBe(0);
    expect(expenseCatalogRank("Sticker")).toBe(21);
    expect(expenseCatalogRank("Some new item")).toBe(EXPENSE_CATALOG.length);
  });
});
