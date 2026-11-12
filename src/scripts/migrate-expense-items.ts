/**
 * One-off stock-list migration for the owner's exact expense-desk list
 * (Black tal first, Sticker last; Salary is a non-stock shortcut, not a row).
 *
 * The expense desk reads its tiles from the database, so renaming the shipped
 * seed list alone never reaches the live records. This script renames the
 * existing items in place (stock levels and purchase history stay attached),
 * retires the generic items the list replaced, and adds the missing ones.
 * It recognises both the original names and the intermediate November names,
 * including case and dash variants. It refuses to write when two rows claim
 * the same canonical name, and it is safe to run twice.
 *
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-expense-items.ts --dry-run
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-expense-items.ts
 */
import { randomUUID } from "node:crypto";
import { closeDatabase, getDb } from "../lib/db";
import { nowIso } from "../lib/dates";
import { EXPENSE_CATALOG } from "../lib/expense-catalog";
import type { InventoryItem } from "../lib/types";

type InventoryRow = Omit<InventoryItem, "id"> & { _id: string };

// Every spelling the kitchen has used, mapped to the canonical name.
const ALIASES: [string, string][] = [
  ["Black sesame", "Black tal"],
  ["Black Tal", "Black tal"],
  ["White sesame", "White tal"],
  ["White Tal", "White tal"],
  ["Groundnuts", "Shing"],
  ["Desiccated coconut", "Kopra nu chhin"],
  ["Kopra Chhin", "Kopra nu chhin"],
  ["Cashews", "Cashew"],
  ["Cashews - crushed", "Cashew – grated"],
  ["Cashew - grated", "Cashew – grated"],
  ["Almond - Crushed", "Almond – grated"],
  ["Almond - grated", "Almond – grated"],
  ["Pista - Crushed", "Pista – grated"],
  ["Pista - grated", "Pista – grated"],
  ["Jaggery - Organic", "Jaggery – organic"],
  ["Mamra (flattened rice)", "Mamra"],
  ["Box - 250gm", "Box – 250 gm"],
  ["Box - 250 gm", "Box – 250 gm"],
  ["Box - 500gm", "Box – 500 gm"],
  ["Box - 500 gm", "Box – 500 gm"],
  ["Silica bag", "Silica"],
  ["Plastic bag - Small", "Plastic bag – small"],
  ["Plastic bag - Big", "Plastic bag – big"],
];

const RETIRE = ["Dry fruit mix", "Packaging boxes", "Wrapping paper and labels"];

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ");
}

const TARGET_BY_ALIAS = new Map<string, string>();
for (const [from, to] of ALIASES) TARGET_BY_ALIAS.set(normalizeName(from), to);
for (const item of EXPENSE_CATALOG) TARGET_BY_ALIAS.set(normalizeName(item.name), item.name);

const dryRun = process.argv.includes("--dry-run");
let findings = 0;

function say(line: string): void {
  findings += 1;
  console.log(line);
}

async function main() {
  const db = await getDb();
  const collection = db.collection<InventoryRow>("inventory_items");
  const rows = await collection.find({}).toArray();
  console.log(
    dryRun
      ? `Preview on ${db.databaseName} — nothing is written. ${rows.length} stock item(s) found.`
      : `Updating ${db.databaseName} — records change in place. ${rows.length} stock item(s) found.`,
  );

  // Preflight: every row that maps to a canonical name joins that name's
  // group. Two rows in one group means stock/history could be split or lost,
  // so stop before writing anything and let the owner reconcile.
  const groups = new Map<string, InventoryRow[]>();
  for (const row of rows) {
    const target = TARGET_BY_ALIAS.get(normalizeName(row.name));
    if (!target) continue;
    const group = groups.get(target) ?? [];
    group.push(row);
    groups.set(target, group);
  }
  const conflicts = [...groups.entries()].filter(([, group]) => group.length > 1);
  if (conflicts.length > 0) {
    console.error("Cannot migrate safely — these names map to more than one stock item:");
    for (const [target, group] of conflicts) {
      console.error(
        `  ${target}: ${group
          .map((row) => `"${row.name}" (${row.currentQuantity} ${row.unit}, ${row.active ? "active" : "archived"})`)
          .join(" vs ")}`,
      );
    }
    console.error("Merge or rename the duplicates in Inventory first, then run again.");
    process.exitCode = 1;
    return;
  }

  const save = async (row: InventoryRow, set: Partial<InventoryRow>, verb: string) => {
    say(`${dryRun ? "Would " : ""}${verb}`);
    if (!dryRun) {
      await collection.updateOne({ _id: row._id }, { $set: { ...set, updatedAt: nowIso() } });
    }
    Object.assign(row, set);
  };

  for (const item of EXPENSE_CATALOG) {
    const group = groups.get(item.name);
    if (!group) continue;
    const row = group[0];
    if (row.name !== item.name) {
      // The _id stays, so stock and movement history follow the new name.
      await save(row, { name: item.name }, `rename ${row.name} → ${item.name}`);
    }
  }

  for (const name of RETIRE) {
    const row = rows.find((entry) => normalizeName(entry.name) === normalizeName(name));
    if (!row || !row.active) continue;
    await save(row, { active: false }, `archive ${row.name} — replaced by the itemised list`);
  }

  const now = nowIso();
  for (const item of EXPENSE_CATALOG) {
    if (groups.has(item.name)) continue;
    const row: InventoryRow = {
      _id: randomUUID(),
      ...item,
      active: true,
      currentQuantity: 0,
      createdAt: now,
      updatedAt: now,
    };
    say(`${dryRun ? "Would add" : "Added"} ${item.name} (${item.unit}, ${item.category})`);
    if (!dryRun) await collection.insertOne(row);
    rows.push(row);
  }

  const active = rows.filter((row) => row.active);
  console.log(
    `\n${findings} change(s). ${active.length} active item(s): ${active.map((row) => row.name).join(", ")}.`,
  );
  console.log(dryRun ? "No changes written." : "Done.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
