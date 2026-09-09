import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runtimeStores = [
  new URL("../lib/order-store.js", import.meta.url),
  new URL("../lib/cart-recovery.js", import.meta.url),
  new URL("../lib/print-job-store.js", import.meta.url),
  new URL("../lib/production-handoff-store.js", import.meta.url)
];

test("stores de runtime nao criam nem alteram schema", async () => {
  for (const file of runtimeStores) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /\bcreate\s+(table|index)\b/i);
    assert.doesNotMatch(source, /\balter\s+table\b/i);
    assert.doesNotMatch(source, /ensurePostgresSchema/);
  }
});
