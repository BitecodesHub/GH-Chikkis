import { MongoClient, type Document } from "mongodb";
import { decodeBackupFile, listBackupFiles } from "../lib/backups";
import { closeDatabase } from "../lib/db";

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? "";
}

function usage(): never {
  console.error(
    [
      "Usage: npm run restore -- --target <sandbox-db> --confirm [--file <backup-file>]",
      "",
      "Restores an encrypted backup into a separate database whose name contains",
      '"restore" or "test". This script never writes to the live database.',
      "The file name is optional; the newest backup in BACKUP_LOCAL_DIR is used.",
      "",
      "After checking the restored data, change MONGODB_DB to the restored database",
      "only during a planned cutover with the app stopped.",
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  const target = argument("--target");
  const file = argument("--file");
  const confirmed = process.argv.includes("--confirm");
  if (!target || !confirmed) usage();

  const targetName = target.trim();
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(targetName)) {
    console.error("The target database name can only contain letters, digits, _ and -.");
    process.exit(1);
  }
  const sourceDb = process.env.MONGODB_DB || "ghchikkis";
  if (targetName === sourceDb) {
    console.error("Refusing to restore over the live database. Choose a separate target database.");
    process.exit(1);
  }
  if (!/restore|test/i.test(targetName)) {
    console.error(
      'The target database name must contain "restore" or "test" so a safe environment is used first.',
    );
    process.exit(1);
  }

  let fileName = file;
  if (!fileName) {
    const files = await listBackupFiles();
    if (files.length === 0) {
      console.error("No backup files were found in the backup directory.");
      process.exit(1);
    }
    fileName = files[0].name;
  }

  const decoded = await decodeBackupFile(fileName);
  console.log(
    `Restoring ${decoded.fileName} (created ${decoded.verification.createdAt}) from ${decoded.verification.sourceDb} into "${targetName}".`,
  );

  const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
  await client.connect();
  try {
    const db = client.db(targetName);
    const existing = (await db.listCollections().toArray()).map((info) => info.name);
    for (const name of existing) {
      if (!name.startsWith("system.")) await db.collection(name).drop();
    }

    let total = 0;
    for (const [name, docs] of Object.entries(decoded.payload.collections)) {
      if (!Array.isArray(docs) || docs.length === 0) continue;
      await db.collection(name).insertMany(docs as Document[], { ordered: true });
      total += docs.length;
      const stored = await db.collection(name).countDocuments({});
      if (stored !== docs.length) {
        throw new Error(`Count mismatch in ${name}: expected ${docs.length}, found ${stored}.`);
      }
    }
    if (total !== decoded.verification.documentCount) {
      throw new Error(
        `Total count mismatch: expected ${decoded.verification.documentCount}, restored ${total}.`,
      );
    }
    console.log(
      `Restore verified: ${total} documents across ${
        Object.keys(decoded.payload.collections).length
      } collections in "${targetName}".`,
    );
    console.log(
      `To inspect it, start the app with MONGODB_DB=${targetName}. To cut over, stop the app and change MONGODB_DB only after this check.`,
    );
  } finally {
    await closeDatabase();
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
