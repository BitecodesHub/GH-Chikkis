import { describe, expect, it } from "vitest";
import { ingredientArt } from "./ingredients";

const key = (...terms: string[]) => ingredientArt(...terms)?.key ?? null;

describe("ingredientArt", () => {
  it("matches the names the kitchen actually buys", () => {
    expect(key("Cashews", "Ingredients/raw materials")).toBe("cashews");
    expect(key("Cashews - crushed", "Ingredients/raw materials")).toBe("cashews-crushed");
    expect(key("Almond", "Ingredients/raw materials")).toBe("almond");
    expect(key("Almond - Crushed", "Ingredients/raw materials")).toBe("almond-crushed");
    expect(key("Pista", "Ingredients/raw materials")).toBe("pista");
    expect(key("Pista - Crushed", "Ingredients/raw materials")).toBe("pista-crushed");
    expect(key("Black Tal", "Ingredients/raw materials")).toBe("black-tal");
    expect(key("White Tal", "Ingredients/raw materials")).toBe("white-tal");
    expect(key("Daliya", "Ingredients/raw materials")).toBe("daliya");
    expect(key("Mamra", "Ingredients/raw materials")).toBe("mamra");
    expect(key("Shing", "Ingredients/raw materials")).toBe("shing");
    expect(key("Kopra Chhin", "Ingredients/raw materials")).toBe("kopra-chhin");
    expect(key("Jaggery", "Ingredients/raw materials")).toBe("jaggery");
    expect(key("Jaggery - Organic", "Ingredients/raw materials")).toBe("jaggery-organic");
    expect(key("Ghee", "Ingredients/raw materials")).toBe("ghee");
    expect(key("Box - 250gm", "Packaging")).toBe("box-250gm");
    expect(key("Box - 500gm", "Packaging")).toBe("box-500gm");
    expect(key("Butter paper", "Packaging")).toBe("butter-paper");
    expect(key("Silica bag", "Packaging")).toBe("silica-bag");
  });

  it("reads the purchase description the same way as the item name", () => {
    expect(key("Purchase of 5 kg of Ghee", "Ingredients/raw materials")).toBe("ghee");
    expect(key("Purchase of 2 kg of Black Tal", "Ingredients/raw materials")).toBe("black-tal");
    expect(key("Purchase of 1 pieces of Box - 500gm", "Packaging")).toBe("box-500gm");
  });

  it("still recognises the names older expenses carry", () => {
    expect(key("Purchase of 5 kg of Groundnuts", "Ingredients/raw materials")).toBe("shing");
    expect(key("Purchase of 2 kg of Black sesame", "Ingredients/raw materials")).toBe("black-tal");
    expect(key("Purchase of 2 kg of White sesame", "Ingredients/raw materials")).toBe("white-tal");
    expect(key("Purchase of 1 kg of Desiccated coconut", "Ingredients/raw materials")).toBe(
      "kopra-chhin",
    );
    expect(key("Purchase of 10 pieces of Packaging boxes", "Packaging")).toBe("box-250gm");
  });

  it("keeps the specific spellings ahead of the general ones", () => {
    expect(key("Roasted peanuts")).toBe("shing");
    expect(key("Chopped cashews")).toBe("cashews-crushed");
    expect(key("Kali til")).toBe("black-tal");
    expect(key("Organic jaggery block")).toBe("jaggery-organic");
  });

  it("stays quiet on costs that are not stock", () => {
    expect(key("Electricity bill for October", "Utilities")).toBeNull();
    expect(key("Loader wages", "Labour")).toBeNull();
    expect(key("", "")).toBeNull();
  });
});
