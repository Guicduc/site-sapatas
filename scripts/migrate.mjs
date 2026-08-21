import path from "node:path";
import { fileURLToPath } from "node:url";

import { closePool, getPool } from "../lib/db.js";
import { runMigrations } from "../lib/db-migrations.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(repositoryRoot, "docs", "ops", "migrations");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL precisa estar configurada para executar migrations.");
  process.exitCode = 1;
} else {
  try {
    const result = await runMigrations(await getPool(), { directory });
    console.info(JSON.stringify({ event: "database.migrations_complete", ...result }));
  } catch (error) {
    console.error(JSON.stringify({
      event: "database.migrations_failed",
      code: error.code || "migration_failed",
      message: error.message
    }));
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
