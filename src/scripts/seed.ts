import { randomUUID } from "node:crypto";
import { closeDatabase, getDb } from "../lib/db";
import { defaultSettings, getSettings, updateSettings } from "../lib/settings";
import { ensureOwnerUser } from "../lib/users";
import { DEFAULT_CONTENT } from "../lib/content-schema";
import { ensureDefaultTemplates } from "../lib/message-templates";
import { CONTENT_PAGES } from "../lib/types";
import type { BusinessSettings, InventoryItem, WebsiteContent } from "../lib/types";
import type { ProductDoc } from "../lib/products";
import { nowIso } from "../lib/dates";
import { EXPENSE_CATALOG } from "../lib/expense-catalog";

interface SeedProduct {
  slug: string;
  name: string;
  description: string;
  tastingNote: string;
  displayOrder: number;
  /** Owner-supplied, one item per line. Absent means we have nothing verified. */
  ingredients?: string;
  nutritionHighlights?: string;
}

const PRODUCTS: SeedProduct[] = [
  {
    slug: "groundnut-chikki",
    name: "Groundnut Chikki",
    description:
      "Our founding variety. Groundnuts are roasted slowly and set in a dark, caramelised base, then cut into thick pieces with a clean snap. Nutty, warm and unmistakably handmade.",
    tastingNote: "Deep roasted, toasty, with a bittersweet edge.",
    displayOrder: 1,
    ingredients: "Premium groundnuts (peanuts)\nPure jaggery\nAmul cow ghee",
    nutritionHighlights: "Protein\nVitamin E\nMagnesium",
  },
  {
    slug: "white-til-chikki",
    name: "White Til Chikki",
    description:
      "White sesame, toasted just until fragrant, set in a pale, delicate base. Lighter on the palate than the nut varieties, with a fine, even crunch.",
    tastingNote: "Fragrant, delicate, a clean finish.",
    displayOrder: 2,
    ingredients: "Premium white sesame seeds\nPure jaggery\nAmul cow ghee",
    nutritionHighlights: "Calcium\nIron\nDietary Fibre\nMagnesium",
  },
  {
    slug: "black-til-chikki",
    name: "Black Til Chikki",
    description:
      "Black sesame brings an earthier, deeper note. The set is dark, the crunch is fine, and the sweetness stays in the background.",
    tastingNote: "Earthy, intense, quietly sweet.",
    displayOrder: 3,
    ingredients: "Premium black sesame seeds\nPure jaggery\nAmul cow ghee",
    nutritionHighlights: "Calcium\nIron\nAntioxidants",
  },
  {
    slug: "dry-fruit-chikki",
    name: "Dry Fruit Chikki",
    description:
      "A richer chikki built around a mix of dry fruits. Heavier, more textured and made in smaller quantities than the everyday varieties.",
    tastingNote: "Rich, layered, celebratory.",
    displayOrder: 4,
    ingredients:
      "Premium cashews\nPremium almonds\nPremium pistachios\nPure jaggery\nAmul cow ghee",
    nutritionHighlights: "Protein\nVitamin E\nMagnesium",
  },
  {
    slug: "coconut-chikki",
    name: "Coconut Chikki",
    description:
      "Dried coconut folded through the base for a softer, chewier bite. A gentler sweetness, closer to a home-style sweet than a hard candy.",
    tastingNote: "Soft, fragrant, gently sweet.",
    displayOrder: 5,
    ingredients: "Premium coconut\nPure jaggery\nAmul cow ghee",
    nutritionHighlights: "Dietary Fibre\nHealthy Fats\nManganese\nCopper",
  },
  {
    slug: "mamra-chikki",
    name: "Mamra Chikki",
    description:
      "Mamra — flattened rice — is folded through the hot base, so the set is light and airy rather than dense. It has a melt-in-the-mouth finish and is the most delicate of the varieties we make.",
    tastingNote: "Light, toasty, barely sweet.",
    displayOrder: 6,
  },
  {
    slug: "daliya-chikki",
    name: "Daliya Chikki",
    description:
      "Cracked wheat gives this chikki its rustic texture. Hearty, less sweet than the nut varieties, and a different kind of crunch altogether.",
    tastingNote: "Rustic, hearty, mellow.",
    displayOrder: 7,
    ingredients: "Premium daliya (broken wheat)\nPure jaggery\nAmul cow ghee",
    nutritionHighlights:
      "Dietary Fibre\nComplex Carbohydrates\nPlant-based Protein\nIron",
  },
];

const INVENTORY_ITEMS = EXPENSE_CATALOG;

async function seedProducts(): Promise<number> {
  const db = await getDb();
  const products = db.collection<ProductDoc>("products");
  let created = 0;
  const now = nowIso();

  for (const product of PRODUCTS) {
    const existing = await products.findOne({ slug: product.slug });
    if (existing) {
      // Keep Owner edits. Repair the listing order, and fill ingredient detail
      // only where the record has none at all — never over what was typed here.
      const blank = (value: unknown) => value === undefined || value === null || value === "";
      const fill: Record<string, unknown> = {
        displayOrder: product.displayOrder,
        updatedAt: now,
      };
      if (product.ingredients && blank(existing.ingredients)) {
        fill.ingredients = product.ingredients;
        fill.ingredientsVerified = true;
      }
      if (product.nutritionHighlights && blank(existing.nutritionHighlights)) {
        fill.nutritionHighlights = product.nutritionHighlights;
      }
      await products.updateOne({ _id: existing._id }, { $set: fill });
      continue;
    }
    await products.insertOne({
      _id: randomUUID(),
      slug: product.slug,
      name: product.name,
      description: product.description,
      tastingNote: product.tastingNote,
      ingredients: product.ingredients,
      nutritionHighlights: product.nutritionHighlights,
      ingredientsVerified: Boolean(product.ingredients),
      active: true,
      media: [],
      displayOrder: product.displayOrder,
      packaging: [
        {
          id: randomUUID(),
          label: "250 g",
          grams: 250,
          standardPricePaise: null,
        },
        {
          id: randomUUID(),
          label: "500 g",
          grams: 500,
          standardPricePaise: null,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }
  return created;
}

async function seedContent(): Promise<number> {
  const db = await getDb();
  const content = db.collection<Omit<WebsiteContent, "page"> & { _id: string; page: string }>(
    "website_content",
  );
  let created = 0;
  const now = nowIso();

  for (const page of CONTENT_PAGES) {
    const existing = await content.findOne({ page });
    if (existing) continue;
    await content.insertOne({
      _id: randomUUID(),
      page,
      draft: DEFAULT_CONTENT[page],
      published: DEFAULT_CONTENT[page],
      version: 1,
      updatedAt: now,
      updatedBy: "seed",
      updatedByName: "Initial content",
      publishedAt: now,
      publishedBy: "seed",
    });
    created += 1;
  }
  return created;
}

async function seedInventory(): Promise<number> {
  const db = await getDb();
  const items = db.collection<Omit<InventoryItem, "id"> & { _id: string }>("inventory_items");
  let created = 0;
  const now = nowIso();

  for (const item of INVENTORY_ITEMS) {
    const existing = await items.findOne({ name: item.name });
    if (existing) continue;
    await items.insertOne({
      _id: randomUUID(),
      name: item.name,
      category: item.category,
      unit: item.unit,
      active: true,
      currentQuantity: 0,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }
  return created;
}

/**
 * The Owner's real contact links. Settings merge stored documents over the
 * defaults, so a record saved before these existed would keep showing blanks.
 */
async function seedBusinessLinks(): Promise<number> {
  const settings = await getSettings();
  const defaults = defaultSettings().business;
  const business: Partial<BusinessSettings> = {};
  for (const key of ["email", "instagramUrl", "googleReviewUrl"] as const) {
    if (!settings.business[key]?.trim()) business[key] = defaults[key];
  }
  const filled = Object.keys(business).length;
  if (filled > 0) await updateSettings({ business }, "seed");
  return filled;
}

async function main() {
  console.log("Seeding GH Chikkis…");
  await getSettings();

  const owner = await ensureOwnerUser();
  const products = await seedProducts();
  const content = await seedContent();
  const inventory = await seedInventory();
  const links = await seedBusinessLinks();
  await ensureDefaultTemplates();

  console.log(
    [
      owner ? `Owner account ready: ${owner.email}` : "No OWNER_EMAIL set; owner account skipped.",
      `${products} product(s) created.`,
      `${content} content page(s) created.`,
      `${inventory} inventory item(s) created.`,
      `${links} business link(s) filled in.`,
      "WhatsApp templates ready.",
    ].join("\n"),
  );
  console.log("Seed complete. Existing records were left untouched.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
