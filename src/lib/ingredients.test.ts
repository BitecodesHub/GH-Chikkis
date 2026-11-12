import { describe, expect, it } from "vitest";
import { ingredientArt } from "./ingredients";

const key = (...terms: string[]) => ingredientArt(...terms)?.key ?? null;

describe("ingredientArt", () => {
  it("matches the owner's exact expense-desk names", () => {
    expect(key("Black tal", "Ingredients/raw materials")).toBe("black-tal");
    expect(key("White tal", "Ingredients/raw materials")).toBe("white-tal");
    expect(key("Shing", "Ingredients/raw materials")).toBe("shing");
    expect(key("Daliya", "Ingredients/raw materials")).toBe("daliya");
    expect(key("Kopra nu chhin", "Ingredients/raw materials")).toBe("kopra-chhin");
    expect(key("Cashew", "Ingredients/raw materials")).toBe("cashews");
    expect(key("Cashew – grated", "Ingredients/raw materials")).toBe("cashews-crushed");
    expect(key("Almond", "Ingredients/raw materials")).toBe("almond");
    expect(key("Almond – grated", "Ingredients/raw materials")).toBe("almond-crushed");
    expect(key("Pista", "Ingredients/raw materials")).toBe("pista");
    expect(key("Pista – grated", "Ingredients/raw materials")).toBe("pista-crushed");
    expect(key("Ghee", "Ingredients/raw materials")).toBe("ghee");
    expect(key("Jaggery", "Ingredients/raw materials")).toBe("jaggery");
    expect(key("Jaggery – organic", "Ingredients/raw materials")).toBe("jaggery-organic");
    expect(key("Mamra", "Ingredients/raw materials")).toBe("mamra");
    expect(key("Box – 250 gm", "Packaging")).toBe("box-250gm");
    expect(key("Box – 500 gm", "Packaging")).toBe("box-500gm");
    expect(key("Butter paper", "Packaging")).toBe("butter-paper");
    expect(key("Silica", "Packaging")).toBe("silica-bag");
    expect(key("Plastic bag – small", "Packaging")).toBe("plastic-bag-small");
    expect(key("Plastic bag – big", "Packaging")).toBe("plastic-bag-big");
    // Sticker and Salary have no photograph yet; the desk shows an icon.
    expect(key("Sticker", "Packaging")).toBeNull();
    expect(key("Salary", "Labour")).toBeNull();
  });

  it("uses fresh image URLs for the supplied photographs", () => {
    const names = [
      "Black tal", "White tal", "Shing", "Daliya", "Kopra nu chhin",
      "Cashew", "Cashew – grated", "Almond", "Almond – grated",
      "Pista", "Pista – grated", "Ghee", "Jaggery", "Jaggery – organic",
      "Mamra", "Box – 250 gm", "Box – 500 gm", "Butter paper", "Silica",
      "Plastic bag – small", "Plastic bag – big",
    ];
    for (const name of names) {
      expect(ingredientArt(name)?.src).toMatch(/\.jpg\?v=owner-20261111$/);
    }
  });

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
    expect(key("Plastic bag - Small", "Packaging")).toBe("plastic-bag-small");
    expect(key("Plastic bag - Big", "Packaging")).toBe("plastic-bag-big");
  });

  it("reads the purchase description the same way as the item name", () => {
    expect(key("Purchase of 5 kg of Ghee", "Ingredients/raw materials")).toBe("ghee");
    expect(key("Purchase of 2 kg of Black Tal", "Ingredients/raw materials")).toBe("black-tal");
    expect(key("Purchase of 1 pieces of Box - 500gm", "Packaging")).toBe("box-500gm");
    expect(key("Purchase of 100 pieces of Plastic bag - Big", "Packaging")).toBe(
      "plastic-bag-big",
    );
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
    expect(key("Grated cashew")).toBe("cashews-crushed");
    expect(key("Grated almond")).toBe("almond-crushed");
    expect(key("Grated pista")).toBe("pista-crushed");
    expect(key("Kali til")).toBe("black-tal");
    expect(key("Organic jaggery block")).toBe("jaggery-organic");
    expect(key("Small poly bag")).toBe("plastic-bag-small");
    expect(key("Large carry bag")).toBe("plastic-bag-big");
  });

  it("stays quiet on costs that are not stock", () => {
    expect(key("Electricity bill for October", "Utilities")).toBeNull();
    expect(key("Loader wages", "Labour")).toBeNull();
    expect(key("", "")).toBeNull();
  });
});
