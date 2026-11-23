// Modulo unico de medicao (Google Analytics 4). Todas as funcoes publicas viram
// no-op quando nao ha ID configurado, quando a categoria "analytics" do
// consentimento nao foi aceita, em rotas excluidas (/admin, /demonstracao) e em
// sessao de demonstracao (o carregador marca o runtime como bloqueado).
//
// Nenhum dado pessoal (nome, e-mail, CPF/CNPJ, telefone, endereco) entra em
// eventos: os payloads sao montados por allowlist e ainda passam por um filtro
// defensivo. URLs enviadas ao GA perdem parametros de consulta fora da allowlist.

import {
  getAnalyticsCookieNames,
  getConfiguredMeasurementId,
  getCookieInventoryRevision,
  isAnalyticsExcludedPath,
  normalizeMeasurementId
} from "./analytics-config.js";
import { forwardAdsEvent, getLandingUrl, mergeLandingCampaign } from "./ads.js";
import { hasCookieConsentCategory, readCookieConsent } from "./cookie-consent.js";

export const ANALYTICS_CURRENCY = "BRL";
export const PURCHASE_LOG_STORAGE_KEY = "baseforma-analytics-purchases";

const PURCHASE_LOG_LIMIT = 50;
const QUEUE_LIMIT = 30;
const APPROVED_PAYMENT_STATUS = "approved";

// Unicos parametros de consulta preservados em page_location/page_referrer.
const SAFE_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "formato"
]);

// Cliques de anuncio do Google: so ficam em page_location com a categoria "marketing"
// aceita (sem ela o GA4 nao deve ligar a visita ao clique).
const AD_CLICK_QUERY_PARAMS = new Set(["gclid", "gbraid", "wbraid"]);

// Chaves que nunca podem aparecer em parametros de evento.
const PII_KEYS = new Set([
  "email",
  "e_mail",
  "name",
  "first_name",
  "last_name",
  "full_name",
  "customer",
  "customer_name",
  "contact",
  "phone",
  "phone_number",
  "telephone",
  "whatsapp",
  "document",
  "cpf",
  "cnpj",
  "tax_id",
  "address",
  "street",
  "number",
  "complement",
  "district",
  "city",
  "postal_code",
  "postalcode",
  "zip",
  "cep",
  "user_data",
  "user_id"
]);

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const CPF_PATTERN = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const CNPJ_PATTERN = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
const PHONE_PATTERN = /(\+55\s?)?\(\d{2}\)\s?9?\d{4}-?\d{4}/;
const BARE_DOCUMENT_PATTERN = /^\d{11}$|^\d{14}$/;
// Cupons publicos sao palavras com sufixo numerico curto (ex.: TRACO10). Codigos
// privados/unicos (com hifen ou hash) nao sao enviados.
const PUBLIC_COUPON_PATTERN = /^[A-Z]{3,20}[0-9]{0,3}$/;

const runtime = {
  // unknown: carregador ainda nao decidiu; pending: aguardando checagem de demo;
  // ready: eventos sao enviados; blocked: eventos sao descartados.
  status: "unknown",
  measurementId: "",
  queue: [],
  // O primeiro page_view da navegacao herda utm_*/gclid da URL de entrada.
  landingCampaignSent: false
};

export function configureAnalytics({ measurementId } = {}) {
  runtime.measurementId = normalizeMeasurementId(measurementId);
}

export function getAnalyticsMeasurementId() {
  return runtime.measurementId || getConfiguredMeasurementId();
}

export function getAnalyticsStatus() {
  return runtime.status;
}

export function setAnalyticsStatus(status, win = getWindow()) {
  runtime.status = status;

  if (status === "ready") {
    const pending = runtime.queue.splice(0);
    pending.forEach((entry) => dispatchEvent(entry, win));
    return;
  }

  if (status === "blocked") {
    runtime.queue.length = 0;
  }
}

export function resetAnalyticsRuntime() {
  runtime.status = "unknown";
  runtime.measurementId = "";
  runtime.queue.length = 0;
  runtime.landingCampaignSent = false;
}

export function canCollectAnalytics(win = getWindow()) {
  if (!win || !getAnalyticsMeasurementId()) return false;
  if (isAnalyticsExcludedPath(win.location?.pathname)) return false;
  if (hasDemoMarker(win.location?.search)) return false;

  try {
    const revision = getCookieInventoryRevision(getAnalyticsMeasurementId());
    return hasCookieConsentCategory(
      readCookieConsent(win.localStorage, new Date(), { revision }),
      "analytics"
    );
  } catch {
    return false;
  }
}

// Envia (ou enfileira, enquanto o carregador decide) um evento GA4.
// Retorna true quando o evento foi enviado ou enfileirado.
export function trackEvent(name, params = {}, options = {}, win = getWindow()) {
  if (!name || runtime.status === "blocked" || !canCollectAnalytics(win)) return false;

  const entry = {
    name,
    params: sanitizeEventParams(params),
    once: options.once || "",
    landing: options.landing === true
  };

  if (runtime.status !== "ready") {
    if (options.priority) runtime.queue.unshift(entry);
    else if (runtime.queue.length < QUEUE_LIMIT) runtime.queue.push(entry);
    return true;
  }

  return dispatchEvent(entry, win);
}

function dispatchEvent(entry, win) {
  if (!canCollectAnalytics(win) || typeof win.gtag !== "function") return false;

  if (entry.once) {
    if (hasLoggedPurchase(win.localStorage, entry.once)) return false;
    logPurchase(win.localStorage, entry.once);
  }

  let pageLocation = buildAnalyticsPageLocation(win.location?.href, win);

  if (entry.landing && !runtime.landingCampaignSent) {
    runtime.landingCampaignSent = true;
    pageLocation = mergeLandingCampaign(
      pageLocation,
      buildAnalyticsPageLocation(getLandingUrl(), win)
    );
  }

  win.gtag("event", entry.name, {
    ...entry.params,
    page_location: pageLocation,
    send_to: getAnalyticsMeasurementId()
  });
  return true;
}

// page_location do GA4: allowlist de campanha e, com "marketing" aceito, o gclid.
export function buildAnalyticsPageLocation(href, win = getWindow()) {
  return sanitizePageLocation(href, { keepAdClickIds: hasMarketingConsent(win) });
}

function hasMarketingConsent(win) {
  try {
    return hasCookieConsentCategory(readCookieConsent(win?.localStorage), "marketing");
  } catch {
    return false;
  }
}

// Envia o evento ao GA4 e, separadamente, as tags de anuncio. Cada destino tem o proprio
// consentimento: recusar a medicao nao impede a conversao de anuncio e vice-versa.
function emitEvent(name, payload, options = {}) {
  const sentToAnalytics = trackEvent(name, payload, options);
  const sentToAds = forwardAdsEvent(name, sanitizeEventParams(payload), options);
  return sentToAnalytics || sentToAds;
}

// ---------- Eventos de e-commerce ----------

export function trackPageView(win = getWindow()) {
  if (!win) return false;
  // Prioridade: na primeira carga o page_view sai antes dos eventos enfileirados.
  // Titulo vazio (navegacao SPA antes do metadata) fica a cargo do proprio gtag.
  const title = String(win.document?.title || "").trim();
  return trackEvent(
    "page_view",
    title ? { page_title: title } : {},
    { priority: true, landing: true },
    win
  );
}

export function trackViewItem({ category, format, unitPriceBrl } = {}) {
  const payload = buildViewItemEvent({ category, format, unitPriceBrl });
  return payload ? emitEvent("view_item", payload) : false;
}

export function trackAddToCart(item) {
  const payload = buildItemsEvent([item]);
  return payload ? emitEvent("add_to_cart", payload) : false;
}

export function trackViewCart(items) {
  const payload = buildItemsEvent(items);
  return payload ? emitEvent("view_cart", payload) : false;
}

export function trackBeginCheckout(items, commerce) {
  const payload = buildItemsEvent(items, commerce);
  return payload ? emitEvent("begin_checkout", payload) : false;
}

export function trackAddShippingInfo(items, commerce) {
  // Sem UF/CEP o frete ainda nao foi escolhido: nao e add_shipping_info.
  const shippingStatus = commerce?.shipping?.status;
  if (!commerce?.shipping || shippingStatus === "pending_address" || shippingStatus === "error") return false;
  const payload = buildItemsEvent(items, commerce);
  if (!payload) return false;
  const tier = String(commerce?.shipping?.serviceName || "").trim();
  return emitEvent("add_shipping_info", tier ? { ...payload, shipping_tier: tier } : payload);
}

export function trackAddPaymentInfo(items, commerce, paymentType = "mercado_pago") {
  const payload = buildItemsEvent(items, commerce);
  return payload ? emitEvent("add_payment_info", { ...payload, payment_type: paymentType }) : false;
}

export function trackPurchase(order) {
  const payload = buildPurchaseEvent(order);
  return payload ? emitEvent("purchase", payload, { once: payload.transaction_id }) : false;
}

export function trackGenerateLead(leadSource) {
  return emitEvent("generate_lead", { lead_source: String(leadSource || "site") });
}

// ---------- Montagem de payloads (puras, testaveis) ----------

export function toAnalyticsItem(item, index) {
  if (!item || typeof item !== "object") return null;

  const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
  const categorySlug = cleanSlug(item.categorySlug);
  const formatSlug = cleanSlug(item.formatSlug);
  const itemId = categorySlug && formatSlug
    ? `${categorySlug}/${formatSlug}`
    : cleanText(item.sku);

  if (!itemId) return null;

  const categoryName = cleanText(item.categoryName);
  const formatName = cleanText(item.formatName);
  const result = {
    item_id: itemId,
    item_name: [categoryName, formatName].filter(Boolean).join(" ") || itemId,
    quantity
  };

  if (categoryName) result.item_category = categoryName;
  if (cleanText(item.sku)) result.item_variant = cleanText(item.sku);

  const price = resolveUnitPrice(item, quantity);
  if (price !== null) result.price = price;
  if (Number.isInteger(index)) result.index = index;

  return result;
}

export function buildViewItemEvent({ category, format, unitPriceBrl } = {}) {
  if (!category?.slug || !format?.slug) return null;

  const item = toAnalyticsItem({
    categorySlug: category.slug,
    categoryName: category.name,
    formatSlug: format.slug,
    formatName: format.name,
    quantity: 1,
    unitPriceBrl
  }, 0);

  if (!item) return null;

  return {
    currency: ANALYTICS_CURRENCY,
    value: item.price ?? 0,
    items: [item]
  };
}

export function buildItemsEvent(items, commerce) {
  const analyticsItems = (Array.isArray(items) ? items : [])
    .map((item, index) => toAnalyticsItem(item, index))
    .filter(Boolean);

  if (!analyticsItems.length) return null;

  const payload = {
    currency: ANALYTICS_CURRENCY,
    value: resolveCommerceValue(commerce, analyticsItems),
    items: analyticsItems
  };

  const coupon = resolvePublicCoupon(commerce);
  if (coupon) payload.coupon = coupon;

  return payload;
}

// Purchase so conta pagamento aprovado de pedido real. Boleto pendente, Pix em
// processamento, revisao tecnica sem pagamento e demonstracao ficam de fora.
export function buildPurchaseEvent(order) {
  if (!order || typeof order !== "object") return null;
  if (order.demo || order.metadata?.demo) return null;
  if (order.paymentStatus !== APPROVED_PAYMENT_STATUS) return null;
  if (order.boleto) return null;

  const transactionId = cleanText(order.orderNumber);
  if (!transactionId) return null;

  const commerce = order.commerce || null;
  const base = buildItemsEvent(order.items, commerce) || {
    currency: ANALYTICS_CURRENCY,
    value: roundMoney(order.totalBrl),
    items: []
  };

  const payload = {
    ...base,
    transaction_id: transactionId,
    shipping: roundMoney(commerce?.shipping?.amountBrl || 0)
  };

  if (!commerce && Number.isFinite(Number(order.totalBrl))) {
    payload.value = roundMoney(order.totalBrl);
  }

  return payload;
}

// ---------- URLs ----------

export function sanitizePageLocation(href, { keepAdClickIds = false } = {}) {
  try {
    const url = new URL(String(href || ""));
    const safeParams = new URLSearchParams();

    url.searchParams.forEach((value, key) => {
      const allowed = SAFE_QUERY_PARAMS.has(key) || (keepAdClickIds && AD_CLICK_QUERY_PARAMS.has(key));
      if (allowed && value && !looksLikePii(value)) {
        safeParams.append(key, value);
      }
    });

    const query = safeParams.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "";
  }
}

// Referencia externa (ex.: retorno do Mercado Pago) vira apenas origem + caminho.
export function sanitizeReferrer(referrer) {
  try {
    if (!referrer) return "";
    const url = new URL(String(referrer));
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

// ---------- Filtro de PII ----------

export function sanitizeEventParams(params) {
  if (!params || typeof params !== "object" || Array.isArray(params)) return {};

  const result = {};

  for (const [key, value] of Object.entries(params)) {
    if (PII_KEYS.has(String(key).toLowerCase())) continue;

    if (key === "items" && Array.isArray(value)) {
      result.items = value
        .map((item) => sanitizeEventParams(item))
        .filter((item) => Object.keys(item).length > 0);
      continue;
    }

    if (typeof value === "string") {
      if (!looksLikePii(value)) result[key] = value.slice(0, 100);
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) result[key] = value;
    } else if (typeof value === "boolean") {
      result[key] = value;
    }
  }

  return result;
}

export function looksLikePii(value) {
  const text = String(value || "");
  return EMAIL_PATTERN.test(text)
    || CPF_PATTERN.test(text)
    || CNPJ_PATTERN.test(text)
    || PHONE_PATTERN.test(text)
    || BARE_DOCUMENT_PATTERN.test(text.trim());
}

// ---------- Revogacao ----------

// Remove cookies _ga* em todos os dominios possiveis (o GA grava no dominio de
// nivel mais alto disponivel) e o registro local de compras medidas.
export function clearAnalyticsData(win = getWindow(), measurementId = getAnalyticsMeasurementId()) {
  if (!win?.document) return;

  const known = new Set(getAnalyticsCookieNames(measurementId));
  const existing = String(win.document.cookie || "")
    .split(";")
    .map((part) => part.split("=")[0].trim())
    .filter((name) => known.has(name) || /^_ga(_|$)/.test(name) || /^_gid$|^_gat/.test(name));
  const names = new Set([...known, ...existing]);
  const domains = getCookieDomainVariants(win.location?.hostname);

  for (const name of names) {
    for (const domain of domains) {
      win.document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }

  try {
    win.localStorage?.removeItem(PURCHASE_LOG_STORAGE_KEY);
  } catch {
    // Storage indisponivel nao impede a revogacao.
  }
}

export function getCookieDomainVariants(hostname) {
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

// ---------- Registro de compras medidas ----------

export function hasLoggedPurchase(storage, transactionId) {
  return readPurchaseLog(storage).includes(String(transactionId));
}

function logPurchase(storage, transactionId) {
  try {
    const log = readPurchaseLog(storage).filter((id) => id !== String(transactionId));
    log.push(String(transactionId));
    storage?.setItem(PURCHASE_LOG_STORAGE_KEY, JSON.stringify(log.slice(-PURCHASE_LOG_LIMIT)));
  } catch {
    // Sem storage a deduplicacao fica a cargo do transaction_id no GA4.
  }
}

function readPurchaseLog(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(PURCHASE_LOG_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// ---------- Utilitarios ----------

function resolveCommerceValue(commerce, analyticsItems) {
  const total = Number(commerce?.totalBrl);
  if (commerce && Number.isFinite(total)) {
    const shipping = Number(commerce.shipping?.amountBrl) || 0;
    return roundMoney(Math.max(0, total - shipping));
  }

  return roundMoney(analyticsItems.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.quantity,
    0
  ));
}

function resolvePublicCoupon(commerce) {
  const discount = commerce?.discount;
  if (!discount?.applied) return "";
  const code = String(discount.code || "").trim().toUpperCase();
  return PUBLIC_COUPON_PATTERN.test(code) ? code : "";
}

function resolveUnitPrice(item, quantity) {
  const unit = Number(item.unitPriceBrl);
  if (item.unitPriceBrl !== undefined && item.unitPriceBrl !== null && Number.isFinite(unit) && unit >= 0) {
    return roundMoney(unit);
  }

  const total = Number(item.priceBrl ?? item.totalPriceBrl);
  if (Number.isFinite(total) && total >= 0) return roundMoney(total / quantity);

  return null;
}

function hasDemoMarker(search) {
  try {
    const params = new URLSearchParams(String(search || ""));
    return params.get("demo") === "1" || params.has("demonstracao");
  } catch {
    return false;
  }
}

function cleanSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
}

function cleanText(value) {
  return String(value || "").trim().slice(0, 100);
}

function roundMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function getWindow() {
  return typeof window === "undefined" ? undefined : window;
}
