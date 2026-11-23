import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  ADS_PURCHASE_LOG_STORAGE_KEY,
  buildFbcCookieValue,
  buildGoogleAdsCalls,
  buildMetaPixelCalls,
  clearAdsData,
  configureAds,
  forwardAdsEvent,
  mergeLandingCampaign,
  readAdClickIds,
  resetAdsRuntime,
  sanitizeAdsPageLocation,
  setAdsStatus,
  trackAdsPageView
} from "../lib/ads.js";
import {
  hasAdsTags,
  normalizeGoogleAdsId,
  normalizeGoogleAdsLabel,
  normalizeMetaPixelId
} from "../lib/ads-config.js";
import {
  COOKIE_INVENTORY_REVISION_ADS,
  COOKIE_INVENTORY_REVISION_GA4,
  getCookieInventoryRevision
} from "../lib/analytics-config.js";
import {
  configureAnalytics,
  resetAnalyticsRuntime,
  sanitizePageLocation,
  setAnalyticsStatus,
  trackAddToCart,
  trackPurchase
} from "../lib/analytics.js";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  createCookieConsent,
  hasCookieConsentCategory,
  parseCookieConsent
} from "../lib/cookie-consent.js";

const NOW = new Date();
const TAGS = {
  googleAdsId: "AW-123456789",
  googleAdsPurchaseLabel: "AbC-dEf_123",
  googleAdsLeadLabel: "LeadLabel1",
  metaPixelId: "1234567890123456"
};
const ADS_REVISION = getCookieInventoryRevision("", TAGS);

const cartItem = {
  categorySlug: "ponteira-interna-tubo",
  categoryName: "Ponteira interna",
  formatSlug: "quadrada",
  formatName: "Quadrada",
  sku: "BF-PI-Q20",
  quantity: 4,
  unitPriceBrl: 2.5,
  priceBrl: 10
};

const approvedOrder = {
  orderNumber: "BF-20261123-0001",
  paymentStatus: "approved",
  boleto: null,
  demo: false,
  totalBrl: 40.9,
  customer: { name: "Maria Souza", email: "maria@example.com" },
  items: [{ ...cartItem, totalPriceBrl: 10, priceBrl: undefined }],
  commerce: {
    itemsSubtotalBrl: 10,
    discount: { applied: false },
    shipping: { amountBrl: 30.9 },
    totalBrl: 40.9
  }
};

let gtagCalls;
let fbqCalls;

beforeEach(() => {
  gtagCalls = [];
  fbqCalls = [];
  resetAdsRuntime();
  resetAnalyticsRuntime();
  configureAds(TAGS);
  installWindow({ consent: { analytics: false, marketing: true } });
  setAdsStatus("ready");
});

afterEach(() => {
  resetAdsRuntime();
  resetAnalyticsRuntime();
  delete globalThis.window;
});

test("revisao do inventario muda ao ligar as tags de anuncio", () => {
  assert.equal(getCookieInventoryRevision("", {}), "base");
  assert.equal(getCookieInventoryRevision("G-TEST000000", {}), COOKIE_INVENTORY_REVISION_GA4);
  assert.equal(getCookieInventoryRevision("", TAGS), COOKIE_INVENTORY_REVISION_ADS);
  assert.equal(
    getCookieInventoryRevision("G-TEST000000", { metaPixelId: TAGS.metaPixelId }),
    `${COOKIE_INVENTORY_REVISION_GA4}+${COOKIE_INVENTORY_REVISION_ADS}`
  );

  // Quem aceitou so o GA4 e perguntado de novo quando os anuncios entram.
  const gaOnly = createCookieConsent(true, NOW, { revision: COOKIE_INVENTORY_REVISION_GA4 });
  assert.equal(parseCookieConsent(gaOnly, NOW, { revision: "ga4-1+ads-1" }), null);
});

test("consentimento separa medicao e publicidade", () => {
  const onlyAds = createCookieConsent({ analytics: false, marketing: true }, NOW);
  assert.equal(hasCookieConsentCategory(onlyAds, "analytics"), false);
  assert.equal(hasCookieConsentCategory(onlyAds, "marketing"), true);

  const all = createCookieConsent(true, NOW);
  assert.equal(all.marketing, true);
  assert.equal(createCookieConsent(false, NOW).marketing, false);

  // Escolha antiga, sem o campo, nunca autoriza anuncios.
  const legacy = { ...createCookieConsent(true, NOW, { revision: "base" }) };
  delete legacy.marketing;
  assert.equal(parseCookieConsent(legacy, NOW, { revision: "base" })?.marketing, false);
  assert.equal(parseCookieConsent({ ...legacy, marketing: "sim" }, NOW, { revision: "base" }), null);
});

test("normaliza IDs e rotulos das tags", () => {
  assert.equal(normalizeGoogleAdsId(" aw-123456789 "), "AW-123456789");
  assert.equal(normalizeGoogleAdsId("G-TEST000000"), "");
  assert.equal(normalizeGoogleAdsLabel("AbC-dEf_123"), "AbC-dEf_123");
  assert.equal(normalizeGoogleAdsLabel("rotulo com espaco"), "");
  assert.equal(normalizeMetaPixelId("1234567890123456"), "1234567890123456");
  assert.equal(normalizeMetaPixelId("abc"), "");
  assert.equal(hasAdsTags({}), false);
  assert.equal(hasAdsTags({ metaPixelId: "1234567890123456" }), true);
});

test("sem aceite de publicidade nenhuma tag de anuncio recebe eventos", () => {
  installWindow({ consent: { analytics: true, marketing: false } });
  assert.equal(trackAddToCart(cartItem), false, "GA4 sem ID configurado e anuncios sem aceite");
  assert.equal(gtagCalls.length + fbqCalls.length, 0);

  installWindow({ consent: null });
  assert.equal(forwardAdsEvent("page_view", {}), false);
  assert.equal(gtagCalls.length + fbqCalls.length, 0);
});

test("aceite so de publicidade envia aos anuncios sem ligar o GA4", () => {
  configureAnalytics({ measurementId: "G-TEST000000" });
  setAnalyticsStatus("ready");

  trackAddToCart(cartItem);

  assert.equal(gtagCalls.length, 0, "Google Ads nao recebe add_to_cart e o GA4 nao tem aceite");
  assert.equal(fbqCalls.length, 1);
  assert.deepEqual(fbqCalls[0], ["trackSingle", TAGS.metaPixelId, "AddToCart", {
    content_type: "product",
    content_ids: ["ponteira-interna-tubo/quadrada"],
    contents: [{ id: "ponteira-interna-tubo/quadrada", quantity: 4, item_price: 2.5 }],
    value: 10,
    currency: "BRL"
  }]);
});

test("compra aprovada vira conversao no Google Ads e Purchase no Meta, uma vez", () => {
  assert.equal(trackPurchase(approvedOrder), true);
  assert.equal(trackPurchase(approvedOrder), false, "deduplicado pelo registro dos anuncios");

  assert.deepEqual(gtagCalls, [["event", "conversion", {
    send_to: "AW-123456789/AbC-dEf_123",
    value: 10,
    currency: "BRL",
    transaction_id: "BF-20261123-0001"
  }]]);
  assert.equal(fbqCalls.length, 1);
  assert.equal(fbqCalls[0][2], "Purchase");
  assert.equal(fbqCalls[0][3].num_items, 4);
  assert.deepEqual(fbqCalls[0][4], { eventID: "purchase-BF-20261123-0001" });

  const serialized = JSON.stringify([gtagCalls, fbqCalls]);
  assert.equal(serialized.includes("maria"), false);
  assert.equal(serialized.includes("Maria"), false);
  assert.ok(JSON.parse(window.localStorage.getItem(ADS_PURCHASE_LOG_STORAGE_KEY)).includes("BF-20261123-0001"));
});

test("compra pendente, boleto ou demonstracao nao vira conversao", () => {
  trackPurchase({ ...approvedOrder, paymentStatus: "pending" });
  trackPurchase({ ...approvedOrder, boleto: { url: "x" } });
  trackPurchase({ ...approvedOrder, demo: true });
  assert.equal(gtagCalls.length + fbqCalls.length, 0);
});

test("eventos esperam o carregador e respeitam rotas excluidas", () => {
  resetAdsRuntime();
  configureAds(TAGS);
  assert.equal(trackAdsPageView(), true, "enfileira enquanto o carregador decide");
  assert.equal(gtagCalls.length + fbqCalls.length, 0);
  setAdsStatus("ready");
  assert.deepEqual(gtagCalls, [["event", "page_view", { send_to: "AW-123456789" }]]);
  assert.deepEqual(fbqCalls, [["trackSingle", TAGS.metaPixelId, "PageView"]]);

  installWindow({ consent: { marketing: true }, href: "https://www.baseforma.com.br/admin/pedidos" });
  assert.equal(trackAdsPageView(), false);
  installWindow({ consent: { marketing: true }, href: "https://www.baseforma.com.br/?demo=1" });
  assert.equal(trackAdsPageView(), false);

  setAdsStatus("blocked");
  installWindow({ consent: { marketing: true } });
  assert.equal(trackAdsPageView(), false);
});

test("traducao de eventos: Google Ads so converte com rotulo", () => {
  assert.deepEqual(buildGoogleAdsCalls("purchase", { value: 1, transaction_id: "X" }, { googleAdsId: "AW-123456789" }), []);
  assert.deepEqual(buildGoogleAdsCalls("generate_lead", {}, TAGS), [["event", "conversion", { send_to: "AW-123456789/LeadLabel1" }]]);
  assert.deepEqual(buildGoogleAdsCalls("view_item", {}, TAGS), []);
  assert.deepEqual(buildMetaPixelCalls("view_cart", {}, TAGS), []);
  assert.deepEqual(buildMetaPixelCalls("generate_lead", { lead_source: "projeto_especial" }, TAGS), [
    ["trackSingle", TAGS.metaPixelId, "Lead", { content_name: "projeto_especial" }]
  ]);
});

test("URL das tags de anuncio mantem campanha e clique, sem dados do pagamento", () => {
  const href = "https://www.baseforma.com.br/pedido-confirmado?orderId=abc&payment=success&payment_id=123&collection_id=9&external_reference=abc&gclid=Cj0K-x_1&utm_source=google&fbclid=IwAR1";
  assert.equal(
    sanitizeAdsPageLocation(href),
    "https://www.baseforma.com.br/pedido-confirmado?gclid=Cj0K-x_1&utm_source=google&fbclid=IwAR1"
  );
  assert.deepEqual(readAdClickIds(href), { gclid: "Cj0K-x_1", fbclid: "IwAR1" });
  assert.deepEqual(readAdClickIds("https://www.baseforma.com.br/?gclid=<script>"), {});
});

test("GA4 so recebe o gclid com o aceite de publicidade", () => {
  const href = "https://www.baseforma.com.br/catalogo?gclid=abc&utm_source=google";
  assert.equal(sanitizePageLocation(href), "https://www.baseforma.com.br/catalogo?utm_source=google");
  assert.equal(
    sanitizePageLocation(href, { keepAdClickIds: true }),
    "https://www.baseforma.com.br/catalogo?gclid=abc&utm_source=google"
  );
});

test("primeira pagina herda a campanha da URL de entrada", () => {
  const landing = "https://www.baseforma.com.br/familias/x?utm_source=google&gclid=abc";
  assert.equal(
    mergeLandingCampaign("https://www.baseforma.com.br/configurar/y?formato=redonda", landing),
    "https://www.baseforma.com.br/configurar/y?formato=redonda&utm_source=google&gclid=abc"
  );
  assert.equal(
    mergeLandingCampaign("https://www.baseforma.com.br/z?utm_source=meta", landing),
    "https://www.baseforma.com.br/z?utm_source=meta"
  );
  assert.equal(mergeLandingCampaign("https://www.baseforma.com.br/z", ""), "https://www.baseforma.com.br/z");
});

test("revogacao apaga cookies de anuncio e o registro de compras", () => {
  const writes = [];
  installWindow({
    consent: { marketing: true },
    cookie: "_gcl_au=1.1; _fbp=fb.1.2; _fbc=fb.1.3.x; _ga=GA1",
    onCookieWrite: (value) => writes.push(value)
  });
  window.localStorage.setItem(ADS_PURCHASE_LOG_STORAGE_KEY, "[\"BF-1\"]");

  clearAdsData(window);

  for (const name of ["_gcl_au", "_fbp", "_fbc"]) {
    assert.ok(writes.some((value) => value.startsWith(`${name}=; Max-Age=0`) && value.includes("domain=.baseforma.com.br")), name);
  }
  assert.equal(writes.some((value) => value.startsWith("_ga=")), false, "cookies do GA4 seguem a propria categoria");
  assert.equal(window.localStorage.getItem(ADS_PURCHASE_LOG_STORAGE_KEY), null);
  assert.equal(buildFbcCookieValue("IwAR1", 1700000000000), "fb.1.1700000000000.IwAR1");
  assert.equal(buildFbcCookieValue(""), "");
});

function installWindow({
  consent,
  revision = ADS_REVISION,
  href = "https://www.baseforma.com.br/carrinho",
  cookie = "",
  onCookieWrite = () => {}
}) {
  const values = new Map();
  const localStorage = {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };

  if (consent !== null) {
    localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(createCookieConsent(consent, NOW, { revision }))
    );
  }

  const url = new URL(href);
  globalThis.window = {
    localStorage,
    location: { href: url.href, pathname: url.pathname, search: url.search, hostname: url.hostname },
    document: {
      title: "Baseforma",
      get cookie() {
        return cookie;
      },
      set cookie(value) {
        onCookieWrite(value);
      }
    },
    gtag: (...args) => gtagCalls.push(args),
    fbq: (...args) => fbqCalls.push(args)
  };
}
