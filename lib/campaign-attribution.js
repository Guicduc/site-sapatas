// Origem da visita gravada no pedido (atribuicao de campanha primaria, sem depender das
// plataformas de anuncio). Base legal: legitimo interesse para medir quais campanhas trazem
// vendas; a finalidade e o prazo estao em /privacidade.
//
// - Campanha (utm_*, caminho de entrada e dominio de referencia): primeira e ultima origem
//   externa, em localStorage, por ATTRIBUTION_TTL_DAYS. Nao ha identificador do visitante.
// - Cliques de anuncio (gclid/gbraid/wbraid/fbclid): identificadores das plataformas, so
//   gravados com a categoria "marketing" aceita e apagados na revogacao. Servem para importar
//   no Google Ads as compras aprovadas fora do navegador (Pix/boleto).
// - client_id do GA4: so lido do cookie _ga com a categoria "analytics" aceita.
//
// O servidor saneia tudo de novo (sanitizeOrderAttribution) antes de gravar em
// orders.metadata.attribution.

export const ATTRIBUTION_STORAGE_KEY = "baseforma-attribution";
export const AD_CLICKS_STORAGE_KEY = "baseforma-ad-clicks";
export const ATTRIBUTION_TTL_DAYS = 30;
export const AD_CLICKS_TTL_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const UTM_FIELDS = {
  utm_source: "source",
  utm_medium: "medium",
  utm_campaign: "campaign",
  utm_term: "term",
  utm_content: "content",
  utm_id: "id"
};
const TOUCH_TEXT_FIELDS = ["source", "medium", "campaign", "term", "content", "id"];
const CLICK_ID_FIELDS = ["gclid", "gbraid", "wbraid", "fbclid"];
const CLICK_ID_PATTERN = /^[A-Za-z0-9._-]{4,200}$/;
const CHANNELS = new Set([
  "google_ads",
  "meta_ads",
  "paid_other",
  "organic_search",
  "social",
  "email",
  "referral",
  "campaign"
]);
const SEARCH_HOSTS = /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|yandex|baidu)\./;
const SOCIAL_HOSTS = /(^|\.)(facebook|instagram|fb|t|twitter|x|linkedin|pinterest|tiktok|youtube|whatsapp|wa)\.(com|me|co|net|br)/;
const PAID_MEDIUMS = /^(cpc|ppc|paid|paid_social|paidsocial|cpm|display|ads?)$/;

// Campanha nunca deve carregar dado pessoal (ex.: ferramenta de e-mail que poe o endereco
// no utm). Numeros puros sao aceitos: IDs de campanha do Google/Meta ({campaignid}) sao so
// digitos; CPF/CNPJ/telefone so sao reconhecidos formatados.
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const DOCUMENT_PATTERN = /\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
const PHONE_PATTERN = /\(\d{2}\)\s?9?\d{4}-?\d{4}|\+55\s?\d{2}\s?9?\d{4}-?\d{4}/;

// ---------- Leitura da URL de entrada (pura) ----------

/**
 * Monta a origem de uma entrada no site. Retorna null para navegacao interna ou acesso
 * direto sem campanha: so origens externas substituem a ultima origem gravada.
 */
export function buildCampaignTouch({ href, referrer = "", now = new Date() } = {}) {
  let url;
  try {
    url = new URL(String(href || ""));
  } catch {
    return null;
  }

  const touch = {};
  for (const [param, field] of Object.entries(UTM_FIELDS)) {
    const value = cleanCampaignText(url.searchParams.get(param));
    if (value) touch[field] = value;
  }

  const clicks = readClickIds(url);
  const referrerHost = readReferrerHost(referrer, url.hostname);
  const hasCampaign = Object.keys(touch).length > 0;

  if (!hasCampaign && !clicks.gclid && !clicks.gbraid && !clicks.wbraid && !clicks.fbclid && !referrerHost) {
    return null;
  }

  touch.channel = inferChannel({ touch, clicks, referrerHost });
  touch.landingPath = cleanPath(url.pathname);
  if (referrerHost) touch.referrerHost = referrerHost;
  touch.capturedAt = toIso(now);
  return touch;
}

export function readClickIds(urlOrHref) {
  let url = urlOrHref;
  try {
    if (!(url instanceof URL)) url = new URL(String(urlOrHref || ""));
  } catch {
    return {};
  }

  const result = {};
  for (const field of CLICK_ID_FIELDS) {
    const value = String(url.searchParams.get(field) || "").trim();
    if (CLICK_ID_PATTERN.test(value)) result[field] = value;
  }
  return result;
}

function inferChannel({ touch, clicks, referrerHost }) {
  if (clicks.gclid || clicks.gbraid || clicks.wbraid) return "google_ads";
  if (clicks.fbclid && PAID_MEDIUMS.test(String(touch.medium || "").toLowerCase())) return "meta_ads";

  const source = String(touch.source || "").toLowerCase();
  const medium = String(touch.medium || "").toLowerCase();

  if (PAID_MEDIUMS.test(medium)) {
    if (/google/.test(source)) return "google_ads";
    if (/(meta|facebook|instagram|fb|ig)/.test(source)) return "meta_ads";
    return "paid_other";
  }
  if (medium === "email" || source === "email") return "email";
  if (medium === "social" || /(meta|facebook|instagram|whatsapp)/.test(source)) return "social";
  if (Object.keys(touch).length > 0) return "campaign";
  if (clicks.fbclid) return "social";
  if (referrerHost && SEARCH_HOSTS.test(referrerHost)) return "organic_search";
  if (referrerHost && SOCIAL_HOSTS.test(referrerHost)) return "social";
  return "referral";
}

function readReferrerHost(referrer, ownHost) {
  try {
    if (!referrer) return "";
    const host = new URL(String(referrer)).hostname.toLowerCase();
    const own = String(ownHost || "").toLowerCase().replace(/^www\./, "");
    if (!host || host.replace(/^www\./, "") === own) return "";
    // Retorno do checkout nao e origem de campanha.
    if (/(^|\.)(mercadopago|mercadolivre|mercadolibre)\./.test(host)) return "";
    return host.slice(0, 100);
  } catch {
    return "";
  }
}

// ---------- Armazenamento no navegador ----------

export function recordCampaignTouch(storage, touch, now = new Date()) {
  if (!storage || !touch) return null;

  const current = readStoredAttribution(storage, now);
  const next = {
    firstTouch: current?.firstTouch || touch,
    lastTouch: touch,
    expiresAt: new Date(toDate(now).getTime() + ATTRIBUTION_TTL_DAYS * DAY_MS).toISOString()
  };

  try {
    storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return null;
  }
  return next;
}

export function readStoredAttribution(storage, now = new Date()) {
  try {
    const parsed = JSON.parse(storage?.getItem(ATTRIBUTION_STORAGE_KEY) || "null");
    if (!parsed || new Date(parsed.expiresAt).getTime() <= toDate(now).getTime()) return null;
    return {
      firstTouch: sanitizeTouch(parsed.firstTouch),
      lastTouch: sanitizeTouch(parsed.lastTouch)
    };
  } catch {
    return null;
  }
}

// So com a categoria "marketing" aceita (quem chama verifica o consentimento).
export function recordAdClicks(storage, clicks, now = new Date()) {
  const clean = sanitizeClickIds(clicks);
  if (!storage || !clean) return null;

  const next = {
    ...clean,
    capturedAt: toIso(now),
    expiresAt: new Date(toDate(now).getTime() + AD_CLICKS_TTL_DAYS * DAY_MS).toISOString()
  };

  try {
    storage.setItem(AD_CLICKS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return null;
  }
  return next;
}

export function readStoredAdClicks(storage, now = new Date()) {
  try {
    const parsed = JSON.parse(storage?.getItem(AD_CLICKS_STORAGE_KEY) || "null");
    if (!parsed || new Date(parsed.expiresAt).getTime() <= toDate(now).getTime()) return null;
    const clean = sanitizeClickIds(parsed);
    return clean ? { ...clean, capturedAt: toIso(parsed.capturedAt) } : null;
  } catch {
    return null;
  }
}

export function clearStoredAdClicks(storage) {
  try {
    storage?.removeItem(AD_CLICKS_STORAGE_KEY);
  } catch {
    // Storage indisponivel nao impede a revogacao.
  }
}

// client_id do GA4 a partir do cookie `_ga` (GA1.1.<aleatorio>.<timestamp>).
export function readGaClientId(cookieHeader) {
  const match = String(cookieHeader || "").match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d{1,20}\.\d{1,20})(?:;|$)/);
  return match ? match[1] : "";
}

/**
 * Payload enviado em POST /api/orders. `consent` diz quais categorias estao aceitas agora:
 * cliques so vao com marketing e o client_id do GA4 so com analytics.
 */
export function buildOrderAttributionPayload({ storage, cookie = "", consent = {}, now = new Date() } = {}) {
  const stored = readStoredAttribution(storage, now);
  const clicks = consent.marketing ? readStoredAdClicks(storage, now) : null;
  const gaClientId = consent.analytics ? readGaClientId(cookie) : "";

  const payload = {
    ...(stored?.firstTouch ? { firstTouch: stored.firstTouch } : {}),
    ...(stored?.lastTouch ? { lastTouch: stored.lastTouch } : {}),
    ...(clicks ? { adClicks: clicks } : {}),
    ...(gaClientId ? { gaClientId } : {})
  };

  return Object.keys(payload).length > 0 ? payload : null;
}

// ---------- Saneamento no servidor ----------

export function sanitizeOrderAttribution(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const firstTouch = sanitizeTouch(input.firstTouch);
  const lastTouch = sanitizeTouch(input.lastTouch);
  const adClicks = sanitizeClickIds(input.adClicks);
  const gaClientId = /^\d{1,20}\.\d{1,20}$/.test(String(input.gaClientId || "")) ? String(input.gaClientId) : "";

  const result = {
    ...(firstTouch ? { firstTouch } : {}),
    ...(lastTouch ? { lastTouch } : {}),
    ...(adClicks ? { adClicks: { ...adClicks, ...(isIsoDate(input.adClicks?.capturedAt) ? { capturedAt: input.adClicks.capturedAt } : {}) } } : {}),
    ...(gaClientId ? { gaClientId } : {})
  };

  return Object.keys(result).length > 0 ? result : null;
}

export function sanitizeTouch(touch) {
  if (!touch || typeof touch !== "object" || Array.isArray(touch)) return null;

  const result = {};
  for (const field of TOUCH_TEXT_FIELDS) {
    const value = cleanCampaignText(touch[field]);
    if (value) result[field] = value;
  }

  const channel = String(touch.channel || "");
  result.channel = CHANNELS.has(channel) ? channel : (Object.keys(result).length ? "campaign" : "referral");

  const landingPath = cleanPath(touch.landingPath);
  if (landingPath) result.landingPath = landingPath;

  const referrerHost = String(touch.referrerHost || "").toLowerCase();
  if (/^[a-z0-9.-]{1,100}$/.test(referrerHost)) result.referrerHost = referrerHost;

  if (isIsoDate(touch.capturedAt)) result.capturedAt = new Date(touch.capturedAt).toISOString();
  return result;
}

function sanitizeClickIds(clicks) {
  if (!clicks || typeof clicks !== "object" || Array.isArray(clicks)) return null;

  const result = {};
  for (const field of CLICK_ID_FIELDS) {
    const value = String(clicks[field] || "").trim();
    if (CLICK_ID_PATTERN.test(value)) result[field] = value;
  }
  return Object.keys(result).length > 0 ? result : null;
}

function cleanCampaignText(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (!text) return "";
  if (EMAIL_PATTERN.test(text) || DOCUMENT_PATTERN.test(text) || PHONE_PATTERN.test(text)) return "";
  return text.replace(/[<>"'`]/g, "");
}

function cleanPath(value) {
  const path = String(value || "").trim();
  if (!path.startsWith("/")) return "";
  return path.replace(/[^A-Za-z0-9/_.-]/g, "").slice(0, 120);
}

function isIsoDate(value) {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function toIso(value) {
  return toDate(value).toISOString();
}
