import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// Resolve Next.js aliases while running the real account module in Node.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/lib/")) {
      return nextResolve(new URL(`../lib/${specifier.slice(6)}.js`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  }
});
const { updatePassword, verifyPassword } = await import("../lib/account-auth.js");
const { getOrCreateCustomerAccount, findCustomerAccount } = await import("../lib/order-store.js");
hooks.deregister();

test("updatePassword persists a hash, replaces the password, and rejects invalid updates", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "baseforma-password-update-"));
  const originalEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    ORDER_STORE_LOCAL_PATH: process.env.ORDER_STORE_LOCAL_PATH,
    NODE_ENV: process.env.NODE_ENV
  };
  t.after(async () => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  });
  process.env.DATABASE_URL = "";
  process.env.ORDER_STORE_LOCAL_PATH = path.join(directory, "orders.json");
  process.env.NODE_ENV = "test";

  const email = "password-update@example.com";
  const account = await getOrCreateCustomerAccount(email);
  const password = "minha primeira senha longa";
  const created = await updatePassword(account.id, password);
  const stored = await findCustomerAccount(email);
  assert.equal(created.id, account.id);
  assert.equal(created.passwordHash, stored.passwordHash);
  assert.match(stored.passwordHash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(stored.passwordHash, password), true);
  assert.ok(stored.passwordSetAt);
  assert.ok(stored.passwordChangedAt);

  const replacement = "minha nova senha com café";
  await updatePassword(account.id, replacement);
  const updated = await findCustomerAccount(email);
  assert.equal(await verifyPassword(updated.passwordHash, replacement), true);
  assert.equal(await verifyPassword(updated.passwordHash, password), false);
  assert.equal(updated.passwordSetAt, stored.passwordSetAt);

  await assert.rejects(updatePassword(account.id, "curta"), /pelo menos 15 caracteres/);
  assert.deepEqual(await findCustomerAccount(email), updated);
});
