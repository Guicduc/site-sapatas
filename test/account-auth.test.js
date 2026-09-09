import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { hashPassword, validatePassword, verifyPassword } from "../lib/password-policy.js";
import { getSessionByToken, issueAccountSession, revokeAccountSession } from "../lib/account-auth.js";
import { getOrCreateCustomerAccount } from "../lib/order-store.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
const localDirectory = await mkdtemp(path.join(os.tmpdir(), "baseforma-account-auth-"));
process.env.DATABASE_URL = "";
process.env.ORDER_STORE_LOCAL_PATH = path.join(localDirectory, "orders.json");

test.after(async () => {
  restoreEnvironment("DATABASE_URL", originalDatabaseUrl);
  restoreEnvironment("ORDER_STORE_LOCAL_PATH", originalStorePath);
  await rm(localDirectory, { recursive: true, force: true });
});

test("password policy accepts long unicode passphrases and rejects short/common values", async () => {
  assert.equal(validatePassword("curta"), "A senha precisa ter pelo menos 15 caracteres.");
  assert.match(validatePassword("123456789012345"), /menos comum/);
  const password = "  minha senha longa com acentos: maçã e café  ";
  const hash = await hashPassword(password);
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(hash, password), true);
  assert.equal(await verifyPassword(hash, "outra senha longa completamente"), false);
  assert.equal(await verifyPassword("hash-invalido", password), false);
  assert.equal(await verifyPassword(hash, "x".repeat(129)), false);
});

test("logout revokes only the current opaque session and remains idempotent", async () => {
  const account = await getOrCreateCustomerAccount("cliente@example.com");
  const currentToken = await issueAccountSession(account.id);
  const otherDeviceToken = await issueAccountSession(account.id);

  assert.equal((await getSessionByToken(currentToken))?.accountId, account.id);
  assert.equal((await getSessionByToken(otherDeviceToken))?.accountId, account.id);

  await revokeAccountSession(account.id, currentToken);
  assert.equal(await getSessionByToken(currentToken), null);
  assert.equal((await getSessionByToken(otherDeviceToken))?.accountId, account.id);

  await revokeAccountSession(account.id, currentToken);
  assert.equal(await getSessionByToken(currentToken), null);
  assert.equal((await getSessionByToken(otherDeviceToken))?.accountId, account.id);
});

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
