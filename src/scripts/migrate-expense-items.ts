/**
 * One-off stock-list migration for the owner's November 2026 ingredient list.
 *
 * The expense desk reads its tiles from the database, so renaming the shipped
 * seed list alone never reaches the live records. This script renames the
 * existing items in place (stock levels and purchase history stay attached),
 * retires the generic items the list replaced, and adds the missing ones.
 * It is safe to run twice.
 *
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-expense-items.ts --dry-run
 *   npx tsx --env-file-if-exists=.env.local src/scripts/migrate-expense-items.ts
 */
import { randomUUID } from "node:crypto";
import { closeDatabase, getDb } from "../lib/db";
import { nowIso } from "../lib/dates";
import type { InventoryItem } from "../lib/types";

type InventoryRow = Omit<InventoryItem, "id"> & { _id: string };

const RENAMES: [string, string][] = [
  ["White sesame", "White Tal"],
  ["Black sesame", "Black Tal"],
  ["Desiccated coconut", "Kopra Chhin"],
  ["Groundnuts", "Shing"],
  ["Mamra (flattened rice)", "Mamra"],
];

const RETIRE = ["Dry fruit mix", "Packaging boxes", "Wrapping paper and labels"];

const CATALOG: { name: string; category: string; unit: string }[] = [
  { name: "Cashews", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Cashews - crushed", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Almond", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Almond - Crushed", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Pista", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Pista - Crushed", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Black Tal", category: "Ingredients/raw materials", unit: "kg" },
  { name: "White Tal", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Daliya", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Mamra", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Shing", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Kopra Chhin", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Jaggery", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Jaggery - Organic", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Ghee", category: "Ingredients/raw materials", unit: "kg" },
  { name: "Box - 250gm", category: "Packaging", unit: "pieces" },
  { name: "Box - 500gm", category: "Packaging", unit: "pieces" },
  { name: "Butter paper", category: "Packaging", unit: "pieces" },
  { name: "Silica bag", category: "Packaging", unit: "pieces" },
  { name: "Plastic bag - Small", category: "Packaging", unit: "pieces" },
  { name: "Plastic bag - Big", category: "Packaging", unit: "pieces" },
];

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

  const find = (name: string) =>
    rows.find((row) => row.name.trim().toLowerCase() === name.trim().toLowerCase());

  const save = async (row: InventoryRow, set: Partial<InventoryRow>, verb: string) => {
    say(`${dryRun ? "Would " : ""}${verb}`);
    if (!dryRun) {
      await collection.updateOne({ _id: row._id }, { $set: { ...set, updatedAt: nowIso() } });
    }
    Object.assign(row, set);
  };

  for (const [from, to] of RENAMES) {
    const legacy = find(from);
    const target = find(to);
    if (!legacy) {
      if (!target) console.log(`— ${from} not found; nothing to rename.`);
      continue;
    }
    if (target && target._id !== legacy._id) {
      await save(
        legacy,
        { active: false },
        `archive ${legacy.name} — ${target.name} already exists`,
      );
      continue;
    }
    // The _id stays, so stock and movement history follow the new name.
    await save(legacy, { name: to }, `rename ${legacy.name} → ${to}`);
  }

  for (const name of RETIRE) {
    const item = find(name);
    if (!item) continue;
    if (!item.active) {
      console.log(`— ${name} already archived.`);
      continue;
    }
    await save(item, { active: false }, `archive ${name} — replaced by the itemised list`);
  }

  const now = nowIso();
  for (const entry of CATALOG) {
    if (find(entry.name)) continue;
    const row: InventoryRow = {
      _id: randomUUID(),
      ...entry,
      active: true,
      currentQuantity: 0,
      createdAt: now,
      updatedAt: now,
    };
    say(`${dryRun ? "Would add" : "Added"} ${entry.name} (${entry.unit}, ${entry.category})`);
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
