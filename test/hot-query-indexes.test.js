import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../docs/ops/migrations/20261009_hot_query_indexes.sql", import.meta.url);
const snapshotUrl = new URL("../docs/ops/database.sql", import.meta.url);

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, "");
}

function normalize(sql) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

test("migration de indices de consultas quentes e apenas create index idempotente", async () => {
  const sql = stripComments(await readFile(migrationUrl, "utf8"));
  const statements = sql.split(";").map(normalize).filter(Boolean);

  assert.ok(statements.length >= 6);
  for (const statement of statements) {
    assert.match(statement, /^create index if not exists [a-z0-9_]+ on [a-z_]+\s*\(/);
    assert.doesNotMatch(statement, /\bconcurrently\b/);
    assert.doesNotMatch(statement, /\bunique\b/);
  }
});

test("snapshot database.sql contem os mesmos indices da migration", async () => {
  const migration = stripComments(await readFile(migrationUrl, "utf8"));
  const snapshot = normalize(stripComments(await readFile(snapshotUrl, "utf8")));
  const statements = migration.split(";").map(normalize).filter(Boolean);

  for (const statement of statements) {
    assert.ok(snapshot.includes(statement), `snapshot sem: ${statement}`);
  }
});
