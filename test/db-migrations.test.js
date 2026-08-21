import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runMigrations } from "../lib/db-migrations.js";

test("aplica migrations em ordem uma vez e rejeita alteração posterior", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "baseforma-migrations-"));
  const database = fakeMigrationPool();
  try {
    await writeFile(path.join(directory, "20260822_second.sql"), "select 2;\n");
    await writeFile(path.join(directory, "20260821_first.sql"), "select 1;\n");

    const first = await runMigrations(database.pool, { directory });
    assert.deepEqual(first.applied, ["20260821_first.sql", "20260822_second.sql"]);
    assert.deepEqual(database.executedSql, ["select 1;", "select 2;"]);

    const second = await runMigrations(database.pool, { directory });
    assert.deepEqual(second.applied, []);
    assert.deepEqual(second.skipped, ["20260821_first.sql", "20260822_second.sql"]);

    await writeFile(path.join(directory, "20260821_first.sql"), "select 99;\n");
    await assert.rejects(
      runMigrations(database.pool, { directory }),
      (error) => error.code === "migration_checksum_mismatch"
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("faz rollback e nao registra migration que falha", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "baseforma-migrations-fail-"));
  const database = fakeMigrationPool({ failSql: "select broken;" });
  try {
    await writeFile(path.join(directory, "20260821_broken.sql"), "select broken;\n");
    await assert.rejects(runMigrations(database.pool, { directory }), /migration failed/);
    assert.equal(database.applied.size, 0);
    assert.equal(database.rollbacks, 1);
    assert.equal(database.releases, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function fakeMigrationPool({ failSql = "" } = {}) {
  const applied = new Map();
  const executedSql = [];
  let rollbacks = 0;
  let releases = 0;
  const client = {
    async query(sql, params = []) {
      const normalized = String(sql).trim();
      if (normalized.startsWith("select checksum from schema_migrations")) {
        return { rows: applied.has(params[0]) ? [{ checksum: applied.get(params[0]) }] : [] };
      }
      if (normalized.startsWith("insert into schema_migrations")) {
        applied.set(params[0], params[1]);
        return { rows: [] };
      }
      if (normalized === "rollback") {
        rollbacks += 1;
        return { rows: [] };
      }
      if (normalized.startsWith("select pg_advisory_")
        || normalized.startsWith("create table if not exists schema_migrations")
        || normalized === "begin"
        || normalized === "commit") {
        return { rows: [] };
      }
      executedSql.push(normalized);
      if (normalized === failSql) throw new Error("migration failed");
      return { rows: [] };
    },
    release() {
      releases += 1;
    }
  };
  return {
    pool: { async connect() { return client; } },
    applied,
    executedSql,
    get rollbacks() { return rollbacks; },
    get releases() { return releases; }
  };
}
