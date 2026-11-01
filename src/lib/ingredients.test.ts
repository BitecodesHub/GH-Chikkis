import { describe, expect, it } from "vitest";
import { ingredientArt } from "./ingredients";

const key = (...terms: string[]) => ingredientArt(...terms)?.key ?? null;

describe("ingredientArt", () => {
  it("matches the names the kitchen actually buys", () => {
    expect(key("Groundnuts", "Ingredients/raw materials")).toBe("groundnut");
    expect(key("White sesame", "Ingredients/raw materials")).toBe("white-til");
    expect(key("Black sesame", "Ingredients/raw materials")).toBe("black-til");
    expect(key("Dry fruit mix", "Ingredients/raw materials")).toBe("dry-fruit");
    expect(key("Desiccated coconut", "Ingredients/raw materials")).toBe("coconut");
    expect(key("Mamra (flattened rice)", "Ingredients/raw materials")).toBe("mamra");
    expect(key("Daliya", "Ingredients/raw materials")).toBe("daliya");
    expect(key("Jaggery", "Ingredients/raw materials")).toBe("jaggery");
    expect(key("Ghee", "Ingredients/raw materials")).toBe("ghee");
    expect(key("Packaging boxes", "Packaging")).toBe("gift-box");
    expect(key("Wrapping paper and labels", "Packaging")).toBe("kraft-paper");
  });

  it("reads the purchase description the same way as the item name", () => {
    expect(key("Purchase of 5 kg of Ghee", "Ingredients/raw materials")).toBe("ghee");
    expect(key("Purchase of 2 kg of Black sesame", "Ingredients/raw materials")).toBe("black-til");
  });

  it("keeps the specific spellings ahead of the general ones", () => {
    expect(key("Roasted peanuts")).toBe("groundnut");
    expect(key("Til chikki raw material")).toBe("white-til");
    expect(key("Kali til")).toBe("black-til");
  });

  it("stays quiet on costs that are not stock", () => {
    expect(key("Electricity bill for October", "Utilities")).toBeNull();
    expect(key("Loader wages", "Labour")).toBeNull();
    expect(key("", "")).toBeNull();
  });
});
