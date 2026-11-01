import { describe, expect, it } from "vitest";
import {
  cleanSingleLine,
  cleanText,
  initials,
  safeFilename,
  slugify,
  splitParagraphs,
  toLines,
  truncate,
} from "./text";

describe("cleanSingleLine", () => {
  it("flattens whatever is pasted into one line", () => {
    expect(cleanSingleLine("  GH\n\tChikkis   Ahmedabad ")).toBe("GH Chikkis Ahmedabad");
  });

  it("strips control characters but keeps normal punctuation", () => {
    expect(cleanSingleLine("Bulk\u0000 order? Yes.")).toBe("Bulk order? Yes.");
  });

  it("cuts to the field limit", () => {
    expect(cleanSingleLine("a".repeat(200), 120)).toHaveLength(120);
  });

  it("returns empty for non-strings rather than throwing", () => {
    expect(cleanSingleLine(undefined)).toBe("");
    expect(cleanSingleLine({})).toBe("");
  });
});

describe("cleanText", () => {
  it("normalises Windows line endings", () => {
    expect(cleanText("line one\r\nline two")).toBe("line one\nline two");
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines and drops the empty ones", () => {
    expect(splitParagraphs("One\n\n\nTwo\n\n  \nThree")).toEqual(["One", "Two", "Three"]);
  });

  it("caps the number of paragraphs a page can hold", () => {
    expect(splitParagraphs(Array.from({ length: 60 }, (_, i) => `${i}`).join("\n\n"), 3)).toHaveLength(3);
  });
});

describe("toLines", () => {
  it("turns a textarea into trimmed non-empty lines", () => {
    expect(toLines("Groundnuts\n\n  Jaggery  \n")).toEqual(["Groundnuts", "Jaggery"]);
  });

  it("drops the bullet markers people type into the box", () => {
    expect(toLines("- Pure jaggery\n• Amul cow ghee\n* Roasted peanuts")).toEqual([
      "Pure jaggery",
      "Amul cow ghee",
      "Roasted peanuts",
    ]);
  });

  it("keeps a line that only looks like a bullet, such as a year range or a minus", () => {
    expect(toLines("2018-2020\n-25%")).toEqual(["2018-2020", "-25%"]);
  });
});

describe("slugify", () => {
  it("makes a URL-safe slug from a variety name", () => {
    expect(slugify("Dry Fruit Chikki")).toBe("dry-fruit-chikki");
    expect(slugify("  Mawa — Chikki!  ")).toBe("mawa-chikki");
  });

  it("keeps accented letters readable instead of dropping them", () => {
    expect(slugify("Gur Chikki")).toBe("gur-chikki");
  });
});

describe("safeFilename", () => {
  it("removes path traversal and odd characters from a download name", () => {
    expect(safeFilename("../../etc/passwd")).toBe("etc-passwd");
    expect(safeFilename("orders 01-10-2026 to 31-10-2026.csv")).toBe(
      "orders-01-10-2026-to-31-10-2026.csv",
    );
  });
});

describe("initials", () => {
  it("uses at most two words, and never ends up blank", () => {
    expect(initials("Gopi Shah")).toBe("GS");
    expect(initials("Himani Shah Patel")).toBe("HS");
    expect(initials("   ")).toBe("GH");
  });
});

describe("truncate", () => {
  it("keeps short strings whole and marks long ones", () => {
    expect(truncate("Mamra Chikki", 20)).toBe("Mamra Chikki");
    expect(truncate("a".repeat(100), 10)).toHaveLength(10);
  });
});
