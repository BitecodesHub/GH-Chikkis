/**
 * One-off data migration for the November 2026 catalogue and copy changes.
 *
 * The website reads stored content on top of the shipped defaults, and the seed
 * script stored a full copy of those defaults in every page, so a wording change
 * in code does not reach a database that already holds the old sentence. This
 * script only touches a stored value when it still matches the old default
 * exactly; anything the Owner has edited is left alone and reported.
 *
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-mamra.ts --dry-run
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-mamra.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { closeDatabase, getDb } from "../lib/db";
import { DEFAULT_CONTENT } from "../lib/content-schema";
import { nowIso } from "../lib/dates";
import type { ProductDoc } from "../lib/products";
import type { AppSettings, InventoryItem, WebsiteContent } from "../lib/types";

type ContentDoc = Omit<WebsiteContent, "page"> & { _id: string; page: string };
type InventoryRow = Omit<InventoryItem, "id"> & { _id: string };

const LEGACY_DEFAULTS = JSON.parse(
  readFileSync(path.join(process.cwd(), "src", "scripts", "legacy-content-defaults.json"), "utf8"),
) as Record<string, Record<string, unknown>>;

const OLD_PRODUCT = {
  slug: "mawa-chikki",
  name: "Mawa Chikki",
  description:
    "Mawa gives this variety a milk-rich depth and a softer set. It is made less often and is best treated as a seasonal or special-order variety.",
  tastingNote: "Milk-rich, rounded, tender.",
};

const NEW_PRODUCT = {
  slug: "mamra-chikki",
  name: "Mamra Chikki",
  description:
    "Mamra — flattened rice — is folded through the hot base, so the set is light and airy rather than dense. It has a melt-in-the-mouth finish and is the most delicate of the varieties we make.",
  tastingNote: "Light, toasty, barely sweet.",
};

const OLD_INVENTORY_NAME = "Mawa";
const NEW_INVENTORY_NAME = "Mamra (flattened rice)";

const OLD_TAGLINE = "Ghar ki Gud";
const NEW_TAGLINE = "Ghar ki Gud-crafted Chikki's";

const dryRun = process.argv.includes("--dry-run");
const report: string[] = [];

function say(line: string): void {
  report.push(line);
  console.log(line);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => deepEqual(left[key], right[key]));
  }
  return false;
}

/** Keys whose shipped default changed between the old snapshot and today. */
function changedKeys(page: string): string[] {
  const legacy = LEGACY_DEFAULTS[page];
  const current = DEFAULT_CONTENT[page as keyof typeof DEFAULT_CONTENT] as unknown as Record<
    string,
    unknown
  >;
  if (!legacy || !current) return [];
  return Object.keys(legacy).filter((key) => !deepEqual(legacy[key], current[key]));
}

async function migrateContent(): Promise<void> {
  const db = await getDb();
  const collection = db.collection<ContentDoc>("website_content");
  const docs = await collection.find({}).toArray();

  for (const doc of docs) {
    const keys = changedKeys(doc.page);
    if (keys.length === 0) continue;
    const unset: Record<string, ""> = {};
    for (const key of keys) {
      for (const slot of ["draft", "published"] as const) {
        const stored = (doc[slot] as Record<string, unknown> | undefined)?.[key];
        if (stored === undefined) continue;
        if (deepEqual(stored, LEGACY_DEFAULTS[doc.page]?.[key])) {
          unset[`${slot}.${key}`] = "";
        } else {
          say(`Kept ${doc.page} ${slot}.${key} — edited in the admin, not a default.`);
        }
      }
    }
    if (Object.keys(unset).length === 0) continue;
    say(
      `${dryRun ? "Would reset" : "Reset"} ${doc.page} to the shipped wording: ${Object.keys(unset).join(", ")}`,
    );
    if (!dryRun) {
      await collection.updateOne(
        { _id: doc._id },
        { $unset: unset, $set: { updatedAt: nowIso(), updatedBy: "migration", updatedByName: "Data migration" } },
      );
    }
  }
}

async function migrateProduct(): Promise<void> {
  const db = await getDb();
  const collection = db.collection<ProductDoc>("products");
  const legacy = await collection.findOne({ slug: OLD_PRODUCT.slug });
  const target = await collection.findOne({ slug: NEW_PRODUCT.slug });

  if (!legacy) {
    say(
      target
        ? `Product already migrated: ${target.name}.`
        : `No ${OLD_PRODUCT.name} product found, and no ${NEW_PRODUCT.name} either — run the seed first.`,
    );
    return;
  }
  if (target) {
    say(
      `Both ${OLD_PRODUCT.name} and ${NEW_PRODUCT.name} exist. Left both alone — retire the old one in the admin.`,
    );
    return;
  }

  const set: Record<string, unknown> = { slug: NEW_PRODUCT.slug, updatedAt: nowIso() };
  for (const field of ["name", "description", "tastingNote"] as const) {
    if (deepEqual(legacy[field], OLD_PRODUCT[field])) {
      set[field] = NEW_PRODUCT[field];
    } else {
      say(`Kept the admin wording for ${OLD_PRODUCT.name} ${field} — rename it in the admin too.`);
    }
  }
  say(`${dryRun ? "Would rename" : "Renamed"} ${legacy.name} → ${NEW_PRODUCT.name}, same record.`);
  if (!dryRun) await collection.updateOne({ _id: legacy._id }, { $set: set });
}

async function migrateInventory(): Promise<void> {
  const db = await getDb();
  const collection = db.collection<InventoryRow>("inventory_items");
  const legacy = await collection.findOne({ name: OLD_INVENTORY_NAME });
  if (!legacy) {
    say(
      (await collection.findOne({ name: NEW_INVENTORY_NAME }))
        ? `Inventory already renamed: ${NEW_INVENTORY_NAME}.`
        : `No ${OLD_INVENTORY_NAME} inventory item found — add ${NEW_INVENTORY_NAME} in the admin if you track it.`,
    );
    return;
  }
  const target = await collection.findOne({ name: NEW_INVENTORY_NAME });
  if (target) {
    say(`${NEW_INVENTORY_NAME} already exists; left ${OLD_INVENTORY_NAME} for you to retire.`);
    return;
  }
  // The _id stays, so stock levels and movement history follow the new name.
  say(
    `${dryRun ? "Would rename" : "Renamed"} inventory item ${OLD_INVENTORY_NAME} → ${NEW_INVENTORY_NAME}, stock kept.`,
  );
  if (!dryRun) {
    await collection.updateOne(
      { _id: legacy._id },
      { $set: { name: NEW_INVENTORY_NAME, updatedAt: nowIso() } },
    );
  }
}

async function migrateSettings(): Promise<void> {
  const db = await getDb();
  const collection = db.collection<AppSettings & { _id: string }>("system_settings");
  const doc = await collection.findOne({ _id: "global" });
  if (!doc) {
    say("No saved settings yet — the new tagline is already the default.");
    return;
  }
  if (doc.business.tagline === NEW_TAGLINE) {
    say(`Business tagline already reads ${NEW_TAGLINE}.`);
    return;
  }
  if (doc.business.tagline !== OLD_TAGLINE) {
    say(
      `Kept the tagline saved in the admin (“${doc.business.tagline}”). Update it on Settings if you want the new wording.`,
    );
    return;
  }
  say(`${dryRun ? "Would update" : "Updated"} the business tagline to “${NEW_TAGLINE}”.`);
  if (!dryRun) {
    await collection.updateOne(
      { _id: "global" },
      { $set: { "business.tagline": NEW_TAGLINE, updatedAt: nowIso() } },
    );
  }
}

async function main() {
  console.log(
    dryRun
      ? "Migration preview — nothing is written."
      : "Migration running — records are updated in place.",
  );
  await migrateProduct();
  await migrateInventory();
  await migrateSettings();
  await migrateContent();
  console.log(`\n${report.length} finding(s). ${dryRun ? "No changes written." : "Done."}`);
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
