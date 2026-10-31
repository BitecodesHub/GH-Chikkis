import { runBackup } from "../lib/backups";
import { closeDatabase } from "../lib/db";
import { formatDateTime } from "../lib/dates";

async function main() {
  const run = await runBackup("cli");
  console.log(
    `Backup verified: ${run.fileName} · ${run.documentCount ?? 0} documents · ${run.sizeBytes ?? 0} bytes · ${formatDateTime(run.finishedAt)}`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
