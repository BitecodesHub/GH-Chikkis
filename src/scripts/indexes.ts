import { closeDatabase, ensureIndexes, getDb } from "../lib/db";
import { env } from "../lib/env";

/**
 * Index creation is off the request path (see `getDb`), so this is how a fresh
 * database gets set up: `npm run indexes` before the first traffic.
 */
async function main() {
  const db = await getDb();
  await ensureIndexes(db);
  console.log(`Indexes ready in ${env.mongodbDb}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void closeDatabase());
