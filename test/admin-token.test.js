import assert from "node:assert/strict";
import test from "node:test";

import { matchesAdminToken, normalizeAdminToken } from "../lib/admin-token.js";

test("token administrativo correto é aceito", () => {
  assert.equal(matchesAdminToken("segredo-forte", { expected: "segredo-forte", nodeEnv: "production" }), true);
});

test("token administrativo incorreto ou de tamanho diferente é recusado", () => {
  const options = { expected: "segredo-forte", nodeEnv: "production" };
  assert.equal(matchesAdminToken("segredo-fraco", options), false);
  assert.equal(matchesAdminToken("segredo", options), false);
  assert.equal(matchesAdminToken("segredo-forte-extra", options), false);
});

test("env com BOM, espaços ou quebra de linha ainda casa com token digitado", () => {
  assert.equal(matchesAdminToken("segredo-forte", { expected: "\uFEFFsegredo-forte\r\n", nodeEnv: "production" }), true);
  assert.equal(matchesAdminToken("  segredo-forte\n", { expected: "segredo-forte", nodeEnv: "production" }), true);
  assert.equal(normalizeAdminToken("\uFEFF abc \n"), "abc");
});

test("token vazio nunca casa em produção", () => {
  assert.equal(matchesAdminToken("", { expected: "segredo-forte", nodeEnv: "production" }), false);
  assert.equal(matchesAdminToken("   ", { expected: "segredo-forte", nodeEnv: "production" }), false);
  assert.equal(matchesAdminToken("", { expected: "", nodeEnv: "production" }), false);
  assert.equal(matchesAdminToken("", { expected: "\uFEFF\n", nodeEnv: "production" }), false);
  assert.equal(matchesAdminToken("qualquer", { expected: undefined, nodeEnv: "production" }), false);
});

test("sem token configurado, desenvolvimento local mantém acesso liberado", () => {
  assert.equal(matchesAdminToken("", { expected: "", nodeEnv: "development" }), true);
});
