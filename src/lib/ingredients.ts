/**
 * The kitchen buys the same handful of raw materials, so the expense desk can
 * show what each one looks like instead of making the owner read a name. The
 * photographs were supplied by the owner and live in `public/ingredients`.
 */
export interface IngredientArt {
  key: string;
  src: string;
  alt: string;
}

const ART: Record<string, IngredientArt> = {
  cashews: {
    key: "cashews",
    src: "/ingredients/cashews.jpg",
    alt: "Whole cashew nuts",
  },
  "cashews-crushed": {
    key: "cashews-crushed",
    src: "/ingredients/cashews-crushed.jpg",
    alt: "Crushed cashew pieces",
  },
  almond: {
    key: "almond",
    src: "/ingredients/almond.jpg",
    alt: "Whole almonds",
  },
  "almond-crushed": {
    key: "almond-crushed",
    src: "/ingredients/almond-crushed.jpg",
    alt: "Chopped almonds",
  },
  pista: {
    key: "pista",
    src: "/ingredients/pista.jpg",
    alt: "Pistachios in their shells",
  },
  "pista-crushed": {
    key: "pista-crushed",
    src: "/ingredients/pista-crushed.jpg",
    alt: "Chopped pistachios",
  },
  "black-tal": {
    key: "black-tal",
    src: "/ingredients/black-tal.jpg",
    alt: "Black sesame seeds",
  },
  "white-tal": {
    key: "white-tal",
    src: "/ingredients/white-tal.jpg",
    alt: "White sesame seeds",
  },
  daliya: {
    key: "daliya",
    src: "/ingredients/daliya-chana.jpg",
    alt: "Daliya — chana dal",
  },
  mamra: {
    key: "mamra",
    src: "/ingredients/mamra-bowl.jpg",
    alt: "Mamra — puffed rice in a clay bowl",
  },
  shing: {
    key: "shing",
    src: "/ingredients/shing.jpg",
    alt: "Peanuts in a jute sack",
  },
  "kopra-chhin": {
    key: "kopra-chhin",
    src: "/ingredients/kopra-chhin.jpg",
    alt: "Coconut halves",
  },
  jaggery: {
    key: "jaggery",
    src: "/ingredients/jaggery-cubes.jpg",
    alt: "Jaggery pieces in a brass bowl",
  },
  "jaggery-organic": {
    key: "jaggery-organic",
    src: "/ingredients/jaggery-organic.jpg",
    alt: "Organic jaggery block with sugarcane",
  },
  ghee: {
    key: "ghee",
    src: "/ingredients/ghee-bowl.jpg",
    alt: "Ghee in a copper bowl",
  },
  "box-250gm": {
    key: "box-250gm",
    src: "/ingredients/box-250gm.jpg",
    alt: "Clear 250 g sweet box",
  },
  "box-500gm": {
    key: "box-500gm",
    src: "/ingredients/box-500gm.jpg",
    alt: "Clear 500 g sweet box",
  },
  "butter-paper": {
    key: "butter-paper",
    src: "/ingredients/butter-paper.jpg",
    alt: "Sheets of butter paper",
  },
  "silica-bag": {
    key: "silica-bag",
    src: "/ingredients/silica-bag.jpg",
    alt: "Silica gel sachets",
  },
  "plastic-bag-small": {
    key: "plastic-bag-small",
    src: "/ingredients/plastic-bag-small.jpg",
    alt: "Small clear plastic carry bag",
  },
  "plastic-bag-big": {
    key: "plastic-bag-big",
    src: "/ingredients/plastic-bag-big.jpg",
    alt: "Large clear plastic carry bag",
  },
};

// Read top to bottom: the specific cut wins over the whole nut, organic jaggery
// over plain jaggery, and black til over the white one.
const MATCHERS: [RegExp, string][] = [
  [/(cashew|kaju).*(crush|chopped|grated)|(crush|chopped|grated).*(cashew|kaju)/, "cashews-crushed"],
  [/almond.*(crush|chopped|grated)|(crush|chopped|grated).*almond|badam.*(crush|chopped|grated)/, "almond-crushed"],
  [/pista.*(crush|chopped|grated)|(crush|chopped|grated).*pista/, "pista-crushed"],
  [/organic.*jaggery|jaggery.*organic/, "jaggery-organic"],
  [/black\s*(tal|til|sesame)|kali\s*(tal|til)/, "black-tal"],
  [/\b(tal|til)\b|sesame/, "white-tal"],
  [/cashew|kaju/, "cashews"],
  [/almond|badam/, "almond"],
  [/pista|pistachio/, "pista"],
  [/jaggery|\bgur\b/, "jaggery"],
  [/\bghee\b/, "ghee"],
  [/daliya|dalia|broken wheat|bulgur|chana\s*dal/, "daliya"],
  [/mamra|poha|flattened rice|puffed rice/, "mamra"],
  [/coconut|copra|kopra/, "kopra-chhin"],
  [/\b(shing|sing)\b|groundnut|peanut/, "shing"],
  [/butter\s*paper|parchment|baking paper/, "butter-paper"],
  [/silica/, "silica-bag"],
  [/(plastic|poly).*small|small.*(plastic|poly)/, "plastic-bag-small"],
  [/(plastic|poly|carry).*(big|large)|(big|large).*(plastic|poly|carry)/, "plastic-bag-big"],
  [/(plastic|poly)\s*bag|carry\s*bag/, "plastic-bag-small"],
  [/box.*250/, "box-250gm"],
  [/box.*500/, "box-500gm"],
  [/box|carton/, "box-250gm"],
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
