import assert from "node:assert/strict";
import test from "node:test";

import {
  COOKIE_CONSENT_DURATION_DAYS,
  createCookieConsent,
  hasCookieConsentCategory,
  parseCookieConsent,
  readCookieConsent,
  writeCookieConsent
} from "./cookie-consent.js";

const NOW = new Date("2026-07-13T12:00:00.000Z");

test("persiste a escolha de aceitar cookies opcionais", () => {
  const storage = createMemoryStorage();
  const consent = createCookieConsent(true, NOW);

  writeCookieConsent(storage, consent);

  assert.deepEqual(readCookieConsent(storage, NOW), consent);
  assert.equal(hasCookieConsentCategory(consent, "necessary"), true);
  assert.equal(hasCookieConsentCategory(consent, "analytics"), true);
});

test("persiste a recusa e mantem somente a categoria necessaria", () => {
  const consent = createCookieConsent(false, NOW);

  assert.equal(consent.necessary, true);
  assert.equal(consent.analytics, false);
  assert.equal(hasCookieConsentCategory(consent, "necessary"), true);
  assert.equal(hasCookieConsentCategory(consent, "analytics"), false);
  assert.equal(hasCookieConsentCategory(consent, "unknown"), false);
});

test("considera a escolha expirada depois do prazo de revisao", () => {
  const consent = createCookieConsent(true, NOW);
  const afterExpiration = new Date(
    NOW.getTime() + (COOKIE_CONSENT_DURATION_DAYS + 1) * 24 * 60 * 60 * 1000
  );

  assert.equal(parseCookieConsent(consent, afterExpiration), null);
});

test("rejeita preferencias invalidas ou de outra versao", () => {
  assert.equal(parseCookieConsent("nao e json", NOW), null);
  assert.equal(
    parseCookieConsent({ ...createCookieConsent(true, NOW), version: 2 }, NOW),
    null
  );
});

test("falha de armazenamento nao impede a escolha em memoria", () => {
  const consent = createCookieConsent(false, NOW);
  const unavailableStorage = {
    setItem() {
      throw new Error("storage unavailable");
    }
  };

  assert.equal(writeCookieConsent(unavailableStorage, consent), null);
});

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}
