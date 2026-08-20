import test from "node:test";
import assert from "node:assert/strict";

import { hashPassword, validatePassword, verifyPassword } from "../lib/password-policy.js";

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
