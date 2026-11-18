import {
  COOKIE_INVENTORY_REVISION_BASE,
  getCookieInventoryRevision
} from "./analytics-config.js";

export const COOKIE_CONSENT_STORAGE_KEY = "baseforma-cookie-consent";
export const COOKIE_CONSENT_CHANGED_EVENT = "baseforma:cookie-consent-changed";
export const COOKIE_PREFERENCES_OPEN_EVENT = "baseforma:open-cookie-preferences";
// Versao da estrutura salva. Mudancas no inventario de ferramentas opcionais usam a
// revisao (`revision`), que invalida escolhas anteriores sem mudar a estrutura.
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_DURATION_DAYS = 180;

const COOKIE_CONSENT_DURATION_MS = COOKIE_CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000;

export function getCurrentCookieConsentRevision() {
  return getCookieInventoryRevision();
}

export function createCookieConsent(analytics, now = new Date(), options = {}) {
  const savedAt = normalizeDate(now);
  const revision = normalizeRevision(options.revision ?? getCurrentCookieConsentRevision());

  return {
    version: COOKIE_CONSENT_VERSION,
    revision,
    necessary: true,
    analytics: Boolean(analytics),
    updatedAt: savedAt.toISOString(),
    expiresAt: new Date(savedAt.getTime() + COOKIE_CONSENT_DURATION_MS).toISOString()
  };
}

export function parseCookieConsent(value, now = new Date(), options = {}) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const currentTime = normalizeDate(now).getTime();
    const updatedAt = new Date(parsed?.updatedAt);
    const expiresAt = new Date(parsed?.expiresAt);
    const expectedRevision = normalizeRevision(options.revision ?? getCurrentCookieConsentRevision());
    // Escolhas gravadas antes da revisao existir valem para o inventario base.
    const storedRevision = parsed?.revision === undefined
      ? COOKIE_INVENTORY_REVISION_BASE
      : parsed.revision;

    if (
      parsed?.version !== COOKIE_CONSENT_VERSION ||
      storedRevision !== expectedRevision ||
      parsed?.necessary !== true ||
      typeof parsed?.analytics !== "boolean" ||
      !Number.isFinite(updatedAt.getTime()) ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= currentTime
    ) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      revision: expectedRevision,
      necessary: true,
      analytics: parsed.analytics,
      updatedAt: updatedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(storage, now = new Date(), options = {}) {
  try {
    return parseCookieConsent(storage?.getItem(COOKIE_CONSENT_STORAGE_KEY), now, options);
  } catch {
    return null;
  }
}

export function writeCookieConsent(storage, consent) {
  try {
    storage?.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    return consent;
  } catch {
    return null;
  }
}

export function hasCookieConsentCategory(consent, category) {
  if (category === "necessary") return true;
  if (category === "analytics") return consent?.analytics === true;
  return false;
}

function normalizeRevision(value) {
  const revision = String(value || "").trim();
  return revision || COOKIE_INVENTORY_REVISION_BASE;
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}
