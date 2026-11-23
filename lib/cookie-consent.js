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

// `choice` aceita um booleano (aceitar/recusar todos os opcionais) ou um objeto com as
// categorias separadas: `{ analytics, marketing }`. Medicao e publicidade sao finalidades
// distintas e cada uma tem o proprio aceite.
export function createCookieConsent(choice, now = new Date(), options = {}) {
  const savedAt = normalizeDate(now);
  const revision = normalizeRevision(options.revision ?? getCurrentCookieConsentRevision());
  const { analytics, marketing } = normalizeChoice(choice);

  return {
    version: COOKIE_CONSENT_VERSION,
    revision,
    necessary: true,
    analytics,
    marketing,
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
      (parsed?.marketing !== undefined && typeof parsed.marketing !== "boolean") ||
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
      // Escolhas gravadas antes da categoria existir nunca autorizaram anuncios.
      marketing: parsed.marketing === true,
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
  if (category === "marketing") return consent?.marketing === true;
  return false;
}

function normalizeChoice(choice) {
  if (choice && typeof choice === "object") {
    return { analytics: choice.analytics === true, marketing: choice.marketing === true };
  }

  const accepted = Boolean(choice);
  return { analytics: accepted, marketing: accepted };
}

function normalizeRevision(value) {
  const revision = String(value || "").trim();
  return revision || COOKIE_INVENTORY_REVISION_BASE;
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}
