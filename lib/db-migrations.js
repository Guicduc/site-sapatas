import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const migrationPattern = /^\d{8}_[a-z0-9_]+\.sql$/;
const advisoryLockId = 42616830;

export async function listMigrationFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && migrationPattern.test(entry.name))
    .map((entry) => ({ name: entry.name, path: path.join(directory, entry.name) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function migrationChecksum(sql) {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}

export async function runMigrations(pool, { directory }) {
  const client = await pool.connect();
  const applied = [];
  const skipped = [];

  try {
    await client.query("select pg_advisory_lock($1)", [advisoryLockId]);
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    for (const migration of await listMigrationFiles(directory)) {
      const sql = await fs.readFile(migration.path, "utf8");
      const checksum = migrationChecksum(sql);
      const existing = await client.query(
        "select checksum from schema_migrations where name = $1",
        [migration.name]
      );

      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) {
          const error = new Error(`Migration já aplicada foi alterada: ${migration.name}`);
          error.code = "migration_checksum_mismatch";
          throw error;
        }
        skipped.push(migration.name);
        continue;
      }

      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into schema_migrations (name, checksum) values ($1, $2)",
          [migration.name, checksum]
        );
        await client.query("commit");
        applied.push(migration.name);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    return { applied, skipped };
  } finally {
    await client.query("select pg_advisory_unlock($1)", [advisoryLockId]).catch(() => {});
    client.release();
  }
}
