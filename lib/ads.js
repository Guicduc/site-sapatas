// Tags de anuncio (Google Ads e Meta Pixel). Espelha as regras de lib/analytics.js, mas
// com gate proprio: so envia com a categoria "marketing" aceita, fora de /admin e da
// demonstracao, e somente para as tags configuradas por variavel de ambiente.
//
// Os eventos chegam ja montados no formato de e-commerce do GA4 (lib/analytics.js chama
// forwardAdsEvent a partir das mesmas funcoes track*), entao o allowlist e o filtro de
// PII sao os mesmos. Nenhum dado pessoal e enviado e nao ha correspondencia avancada.

import { getConfiguredAdsTags, hasAdsTags } from "./ads-config.js";
import {
  getConfiguredMeasurementId,
  getCookieInventoryRevision,
  isAnalyticsExcludedPath
} from "./analytics-config.js";
import { hasCookieConsentCategory, readCookieConsent } from "./cookie-consent.js";

export const ADS_PURCHASE_LOG_STORAGE_KEY = "baseforma-ads-purchases";

const PURCHASE_LOG_LIMIT = 50;
const QUEUE_LIMIT = 30;

// Parametros de clique de anuncio que as tags precisam ler na URL de entrada.
export const AD_CLICK_PARAMS = ["gclid", "gbraid", "wbraid", "fbclid"];
const CAMPAIGN_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "formato",
  ...AD_CLICK_PARAMS
]);

const runtime = {
  status: "unknown",
  tags: null,
  queue: []
};

export function configureAds(tags) {
  runtime.tags = tags ? { ...tags } : null;
}

export function getAdsTags() {
  return runtime.tags || getConfiguredAdsTags();
}

export function getAdsStatus() {
  return runtime.status;
}

export function setAdsStatus(status, win = getWindow()) {
  runtime.status = status;

  if (status === "ready") {
    const pending = runtime.queue.splice(0);
    pending.forEach((entry) => dispatchAdsEvent(entry, win));
    return;
  }

  if (status === "blocked") {
    runtime.queue.length = 0;
  }
}

export function resetAdsRuntime() {
  runtime.status = "unknown";
  runtime.tags = null;
  runtime.queue.length = 0;
}

export function canCollectAds(win = getWindow()) {
  const tags = getAdsTags();
  if (!win || !hasAdsTags(tags)) return false;
  if (isAnalyticsExcludedPath(win.location?.pathname)) return false;
  if (hasDemoMarker(win.location?.search)) return false;

  try {
    const revision = getCookieInventoryRevision(getConfiguredMeasurementId(), tags);
    return hasCookieConsentCategory(
      readCookieConsent(win.localStorage, new Date(), { revision }),
      "marketing"
    );
  } catch {
    return false;
  }
}

// Recebe um evento GA4 (nome + payload ja saneado) e o repassa as tags de anuncio.
export function forwardAdsEvent(name, payload = {}, options = {}, win = getWindow()) {
  if (!name || runtime.status === "blocked" || !canCollectAds(win)) return false;

  const entry = { name, payload: payload || {}, once: options.once || "" };

  if (runtime.status !== "ready") {
    if (options.priority) runtime.queue.unshift(entry);
    else if (runtime.queue.length < QUEUE_LIMIT) runtime.queue.push(entry);
    return true;
  }

  return dispatchAdsEvent(entry, win);
}

function dispatchAdsEvent(entry, win) {
  if (!canCollectAds(win)) return false;

  if (entry.once) {
    // Registro proprio dos anuncios: uma compra nao medida aqui (sem aceite) ainda pode ser
    // enviada depois, mesmo que o GA4 ja a tenha contado.
    if (hasLoggedAdsPurchase(win.localStorage, entry.once)) return false;
    logAdsPurchase(win.localStorage, entry.once);
  }

  const tags = getAdsTags();
  let sent = false;

  for (const call of buildGoogleAdsCalls(entry.name, entry.payload, tags)) {
    if (typeof win.gtag === "function") {
      win.gtag(...call);
      sent = true;
    }
  }

  for (const call of buildMetaPixelCalls(entry.name, entry.payload, tags)) {
    if (typeof win.fbq === "function") {
      win.fbq(...call);
      sent = true;
    }
  }

  return sent;
}

// page_view das tags de anuncio, enviado pelo carregador a cada troca de rota.
export function trackAdsPageView(win = getWindow()) {
  return forwardAdsEvent("page_view", {}, { priority: true }, win);
}

// ---------- Traducao dos eventos (puras, testaveis) ----------

// Google Ads: page_view alimenta o remarketing; purchase e generate_lead viram conversoes
// quando o rotulo correspondente esta configurado. Demais eventos de funil nao sao enviados
// ao Ads (o GA4 ja os mede e pode importa-los como conversoes secundarias).
export function buildGoogleAdsCalls(name, payload = {}, tags = getAdsTags()) {
  const adsId = tags?.googleAdsId;
  if (!adsId) return [];

  if (name === "page_view") {
    return [["event", "page_view", { send_to: adsId }]];
  }

  if (name === "purchase" && tags.googleAdsPurchaseLabel && payload.transaction_id) {
    return [["event", "conversion", {
      send_to: `${adsId}/${tags.googleAdsPurchaseLabel}`,
      value: toMoney(payload.value),
      currency: payload.currency || "BRL",
      transaction_id: String(payload.transaction_id)
    }]];
  }

  if (name === "generate_lead" && tags.googleAdsLeadLabel) {
    return [["event", "conversion", {
      send_to: `${adsId}/${tags.googleAdsLeadLabel}`
    }]];
  }

  return [];
}

const META_EVENT_NAMES = {
  page_view: "PageView",
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  generate_lead: "Lead"
};

export function buildMetaPixelCalls(name, payload = {}, tags = getAdsTags()) {
  const pixelId = tags?.metaPixelId;
  const metaName = META_EVENT_NAMES[name];
  if (!pixelId || !metaName) return [];

  if (name === "page_view") {
    return [["trackSingle", pixelId, "PageView"]];
  }

  if (name === "generate_lead") {
    return [["trackSingle", pixelId, "Lead", { content_name: String(payload.lead_source || "site") }]];
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const params = {
    content_type: "product",
    content_ids: items.map((item) => String(item.item_id)).filter(Boolean),
    contents: items
      .filter((item) => item.item_id)
      .map((item) => ({
        id: String(item.item_id),
        quantity: Number(item.quantity) || 1,
        ...(Number.isFinite(Number(item.price)) ? { item_price: toMoney(item.price) } : {})
      })),
    value: toMoney(payload.value),
    currency: payload.currency || "BRL"
  };

  if (name === "begin_checkout" || name === "purchase") {
    params.num_items = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  }

  if (name === "purchase" && payload.transaction_id) {
    // eventID permite deduplicar com uma futura Conversions API (servidor).
    return [["trackSingle", pixelId, "Purchase", params, { eventID: `purchase-${payload.transaction_id}` }]];
  }

  return [["trackSingle", pixelId, metaName, params]];
}

// ---------- URL de entrada e cliques de anuncio ----------

// URL da primeira pagina carregada, guardada so em memoria. Se o aceite vier depois de uma
// navegacao interna, as tags ainda recebem o gclid/fbclid da entrada (sem gravar nada no
// navegador antes do consentimento).
let landingHref = "";

export function rememberLandingUrl(href) {
  if (!landingHref && href) landingHref = String(href);
  return landingHref;
}

export function getLandingUrl() {
  return landingHref;
}

export function resetLandingUrl() {
  landingHref = "";
}

// Mantem apenas campanha (utm_*), cliques de anuncio e `formato`; remove identificadores
// de pedido e de pagamento (ex.: retorno do Mercado Pago).
export function sanitizeAdsPageLocation(href) {
  try {
    const url = new URL(String(href || ""));
    const safeParams = new URLSearchParams();

    url.searchParams.forEach((value, key) => {
      if (CAMPAIGN_PARAMS.has(key) && value && value.length <= 200 && !/[@\s]/.test(value)) {
        safeParams.append(key, value);
      }
    });

    const query = safeParams.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "";
  }
}

// Se a pagina atual nao tem utm_* nem clique de anuncio, herda os da URL de entrada (ja
// saneada). `formato` e o caminho continuam sendo os da pagina atual.
export function mergeLandingCampaign(currentLocation, landingLocation) {
  try {
    if (!currentLocation || !landingLocation) return currentLocation || "";
    const current = new URL(currentLocation);
    const landing = new URL(landingLocation);
    const isCampaignKey = (key) => key.startsWith("utm_") || AD_CLICK_PARAMS.includes(key);

    if ([...current.searchParams.keys()].some(isCampaignKey)) return currentLocation;

    let merged = false;
    landing.searchParams.forEach((value, key) => {
      if (isCampaignKey(key)) {
        current.searchParams.append(key, value);
        merged = true;
      }
    });

    return merged ? current.toString() : currentLocation;
  } catch {
    return currentLocation || "";
  }
}

export function readAdClickIds(href) {
  try {
    const url = new URL(String(href || ""));
    const result = {};

    for (const key of AD_CLICK_PARAMS) {
      const value = String(url.searchParams.get(key) || "").trim();
      if (value && value.length <= 200 && /^[A-Za-z0-9._-]+$/.test(value)) result[key] = value;
    }

    return result;
  } catch {
    return {};
  }
}

// Cookie _fbc no formato documentado pela Meta (fb.<subdominio>.<ms>.<fbclid>). O pixel so
// o cria sozinho quando o fbclid ainda esta na URL; depois de uma navegacao interna ele e
// recriado a partir da URL de entrada guardada em memoria.
export function buildFbcCookieValue(fbclid, now = Date.now()) {
  const value = String(fbclid || "").trim();
  return value ? `fb.1.${Math.round(now)}.${value}` : "";
}

// ---------- Revogacao ----------

export function clearAdsData(win = getWindow()) {
  if (!win?.document) return;

  const existing = String(win.document.cookie || "")
    .split(";")
    .map((part) => part.split("=")[0].trim())
    .filter((name) => /^_gcl_/.test(name) || name === "_fbp" || name === "_fbc");
  const names = new Set(["_gcl_au", "_gcl_aw", "_gcl_gb", "_fbp", "_fbc", ...existing]);
  const domains = getCookieDomainVariants(win.location?.hostname);

  for (const name of names) {
    for (const domain of domains) {
      win.document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }

  try {
    win.localStorage?.removeItem(ADS_PURCHASE_LOG_STORAGE_KEY);
  } catch {
    // Storage indisponivel nao impede a revogacao.
  }
}

function getCookieDomainVariants(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  const variants = [""];
  if (!host || /^[\d.]+$/.test(host) || host === "localhost") return variants;

  const parts = host.split(".");
  for (let index = 0; index < parts.length - 1; index += 1) {
    const domain = parts.slice(index).join(".");
    variants.push(domain, `.${domain}`);
  }

  return variants;
}

// ---------- Registro de compras enviadas aos anuncios ----------

export function hasLoggedAdsPurchase(storage, transactionId) {
  return readPurchaseLog(storage).includes(String(transactionId));
}

function logAdsPurchase(storage, transactionId) {
  try {
    const log = readPurchaseLog(storage).filter((id) => id !== String(transactionId));
    log.push(String(transactionId));
    storage?.setItem(ADS_PURCHASE_LOG_STORAGE_KEY, JSON.stringify(log.slice(-PURCHASE_LOG_LIMIT)));
  } catch {
    // Sem storage a deduplicacao fica a cargo do transaction_id/eventID nas plataformas.
  }
}

function readPurchaseLog(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(ADS_PURCHASE_LOG_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// ---------- Utilitarios ----------

function hasDemoMarker(search) {
  try {
    const params = new URLSearchParams(String(search || ""));
    return params.get("demo") === "1" || params.has("demonstracao");
  } catch {
    return false;
  }
}

function toMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function getWindow() {
  return typeof window === "undefined" ? undefined : window;
}
