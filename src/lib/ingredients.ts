/**
 * The kitchen buys the same handful of raw materials, so the expense desk can
 * show what each one looks like instead of making the owner read a name. The
 * photographs live in `public/ingredients` and `credits.json` beside them
 * records where each came from.
 */
export interface IngredientArt {
  key: string;
  src: string;
  alt: string;
}

const ART: Record<string, IngredientArt> = {
  groundnut: {
    key: "groundnut",
    src: "/ingredients/groundnut.jpg",
    alt: "Groundnuts in their shells",
  },
  "white-til": {
    key: "white-til",
    src: "/ingredients/white-til.jpg",
    alt: "White sesame seeds",
  },
  "black-til": {
    key: "black-til",
    src: "/ingredients/black-til.jpg",
    alt: "Black sesame seeds in a white bowl",
  },
  jaggery: {
    key: "jaggery",
    src: "/ingredients/jaggery.jpg",
    alt: "Cubes of jaggery",
  },
  ghee: {
    key: "ghee",
    src: "/ingredients/ghee.jpg",
    alt: "Ghee in a steel jar",
  },
  daliya: {
    key: "daliya",
    src: "/ingredients/daliya.jpg",
    alt: "Daliya — cracked wheat",
  },
  mamra: {
    key: "mamra",
    src: "/ingredients/mamra.jpg",
    alt: "Mamra — flattened rice flakes",
  },
  coconut: {
    key: "coconut",
    src: "/ingredients/coconut.jpg",
    alt: "Grated coconut on a plate",
  },
  "dry-fruit": {
    key: "dry-fruit",
    src: "/ingredients/dry-fruit.jpg",
    alt: "Walnuts, pistachios, cashews and almonds",
  },
  "gift-box": {
    key: "gift-box",
    src: "/ingredients/gift-box.jpg",
    alt: "Gift boxes tied with ribbon",
  },
  "kraft-paper": {
    key: "kraft-paper",
    src: "/ingredients/kraft-paper.jpg",
    alt: "A roll of brown paper",
  },
};

// Read top to bottom: the specific spelling wins, so black sesame is checked
// before sesame and peanuts before nuts in general.
const MATCHERS: [RegExp, string][] = [
  [/black\s*(til|sesame)|kali\s*til/, "black-til"],
  [/\btil\b|sesame/, "white-til"],
  [/groundnut|peanut/, "groundnut"],
  [/jaggery|\bgur\b/, "jaggery"],
  [/\bghee\b/, "ghee"],
  [/daliya|dalia|broken wheat|bulgur/, "daliya"],
  [/mamra|poha|flattened rice/, "mamra"],
  [/coconut|copra/, "coconut"],
  [/dry\s*-?\s*fruit|mixed nut|almond|cashew|kaju|pista|raisin|badam/, "dry-fruit"],
  // Wrapping before packaging: the category word "Packaging" rides along with
  // every stock line, so the loose box rule would swallow "Wrapping paper".
  [/wrap|label|tape|kraft|stickers?|brown paper/, "kraft-paper"],
  [/packag|carton|gift box|\bbox(es)?\b/, "gift-box"],
];

/** The photograph for whatever was bought, or null when nothing fits. */
export function ingredientArt(...terms: (string | null | undefined)[]): IngredientArt | null {
  const text = terms.filter(Boolean).join(" ").toLowerCase();
  if (!text.trim()) return null;
  for (const [pattern, key] of MATCHERS) {
    if (pattern.test(text)) return ART[key];
  }
  return null;
}
