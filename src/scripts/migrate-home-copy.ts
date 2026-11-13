/**
 * One-off copy migration for the November 2026 home + process wording.
 *
 * The website reads stored content on top of the shipped defaults, so a wording
 * change in code does not reach a database that already holds the old sentence.
 * This script only resets a stored value when it still matches a previously
 * shipped default exactly (either the legacy snapshot or the wording shipped
 * immediately before this change); anything the Owner edited is left alone and
 * reported. Resetting a field lets the new shipped default show through.
 *
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-home-copy.ts --dry-run
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-home-copy.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { closeDatabase, getDb } from "../lib/db";
import { env } from "../lib/env";
import { nowIso } from "../lib/dates";
import type { WebsiteContent } from "../lib/types";

type ContentDoc = Omit<WebsiteContent, "page"> & { _id: string; page: string };

const LEGACY_DEFAULTS = JSON.parse(
  readFileSync(path.join(process.cwd(), "src", "scripts", "legacy-content-defaults.json"), "utf8"),
) as Record<string, Record<string, unknown>>;

/** The wording shipped immediately before this change (what the live site reads). */
const PREV_HOME: Record<string, unknown> = {
  heroTitle: "Chikki,",
  heroTitleAccent: "cut by hand.",
  heroIntro:
    "Seven varieties made by sisters Gopi and Himani in a family kitchen in Ahmedabad — pure jaggery and cow ghee, without added refined sugar or glucose.",
  collectionIntro:
    "Seven varieties, each with its own character — some nuttier, some softer, all made by hand.",
  storyHeading: "Two sisters, one kitchen",
  storyBody: [
    "GH Chikkis began with a simple family habit: making chikki for the people around us. What started in a home kitchen became a collection of varieties, shared with families, shops and businesses in and around Ahmedabad.",
    "Gopi Shah and Himani Shah are the people behind the recipes, the wrapping and the decisions.",
    "We are a homemade brand, not a factory. Every order is made with hands, time and attention — and the details are best confirmed with us directly.",
  ],
  processIntro:
    "Chikki is a study in timing. These are the stages of our kitchen: heat, patience, pressure and a clean cut.",
  giftingHeading: "Made to be given",
  giftingIntro:
    "From a box for a festival to a considered corporate gift, we work directly with you on varieties, packaging and quantities.",
  finalCtaHeading: "Tell us what you need",
  finalCtaBody:
    "Share the variety, quantity and date you have in mind. We will confirm availability, packaging and price with you directly.",
};

const PREV_PROCESS_STEPS = [
  {
    title: "The cook",
    body: "The base is brought to the right point over heat. The window is narrow; this stage is judged by eye, by aroma and by experience.",
  },
  {
    title: "The pour",
    body: "The hot base is poured over the nuts or other ingredients and spread quickly, before it begins to set.",
  },
  {
    title: "The press",
    body: "The mixture is pressed and rolled to an even thickness. An uneven press shows up later, in the bite.",
  },
  {
    title: "The cut",
    body: "While the set is still warm, it is marked and cut. The clean edge is the part we check first.",
  },
  {
    title: "The wrap",
    body: "Once cool, the pieces are broken along the cuts, sorted and packed. Every box is checked by hand.",
  },
];

const HOME_KEYS = Object.keys(PREV_HOME);
const PROCESS_KEYS = ["steps"];

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

/** Previously shipped wordings for a field, oldest first, deduplicated. */
function oldVariants(page: string, key: string): unknown[] {
  const variants: unknown[] = [];
  const legacy = LEGACY_DEFAULTS[page]?.[key];
  if (legacy !== undefined) variants.push(legacy);
  const prev = page === "home" ? PREV_HOME[key] : key === "steps" ? PREV_PROCESS_STEPS : undefined;
  if (prev !== undefined && !variants.some((v) => deepEqual(v, prev))) variants.push(prev);
  return variants;
}

async function migratePage(page: string, keys: string[]): Promise<void> {
  const db = await getDb();
  const collection = db.collection<ContentDoc>("website_content");
  const doc = await collection.findOne({ page });
  if (!doc) {
    say(`No stored "${page}" page — the new shipped wording is already the default.`);
    return;
  }

  const unset: Record<string, ""> = {};
  for (const key of keys) {
    const variants = oldVariants(page, key);
    for (const slot of ["draft", "published"] as const) {
      const stored = (doc[slot] as Record<string, unknown> | undefined)?.[key];
      if (stored === undefined) continue;
      if (variants.some((variant) => deepEqual(stored, variant))) {
        unset[`${slot}.${key}`] = "";
      } else {
        say(`Kept ${page} ${slot}.${key} — edited in the admin, not a shipped default.`);
      }
    }
  }

  if (Object.keys(unset).length === 0) {
    say(`"${page}" already reads the new wording (or was edited); nothing to reset.`);
    return;
  }
  say(
    `${dryRun ? "Would reset" : "Reset"} ${page} to the shipped wording: ${Object.keys(unset).join(", ")}`,
  );
  if (!dryRun) {
    await collection.updateOne(
      { _id: doc._id },
      {
        $unset: unset,
        $set: { updatedAt: nowIso(), updatedBy: "migration", updatedByName: "Copy migration" },
      },
    );
  }
}

async function main() {
  const isLocal = /127\.0\.0\.1|localhost/.test(env.mongodbUri);
  console.log(
    `Connected to database "${env.mongodbDb}" on ${isLocal ? "localhost" : "a remote host"}.`,
  );
  console.log(
    dryRun
      ? "Migration preview — nothing is written."
      : "Migration running — records are updated in place.",
  );
  await migratePage("home", HOME_KEYS);
  await migratePage("process", PROCESS_KEYS);
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