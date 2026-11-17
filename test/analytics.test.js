import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  COOKIE_INVENTORY_REVISION_GA4,
  getAnalyticsCookieNames,
  getCookieInventoryRevision,
  isAnalyticsExcludedPath,
  normalizeMeasurementId
} from "../lib/analytics-config.js";
import {
  PURCHASE_LOG_STORAGE_KEY,
  buildItemsEvent,
  buildPurchaseEvent,
  clearAnalyticsData,
  configureAnalytics,
  getCookieDomainVariants,
  hasLoggedPurchase,
  looksLikePii,
  resetAnalyticsRuntime,
  sanitizeEventParams,
  sanitizePageLocation,
  sanitizeReferrer,
  setAnalyticsStatus,
  trackAddShippingInfo,
  trackAddToCart,
  trackEvent,
  trackGenerateLead,
  trackPurchase,
  trackViewItem
} from "../lib/analytics.js";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  createCookieConsent
} from "../lib/cookie-consent.js";

const MEASUREMENT_ID = "G-TEST000000";
const NOW = new Date();

const cartItem = {
  categorySlug: "sapata-base-lisa",
  categoryName: "Sapata base lisa",
  formatSlug: "redonda",
  formatName: "Redonda",
  sku: "BF-RD-PI-D28-H6",
  quantity: 4,
  unitPriceBrl: 12.5,
  priceBrl: 50
};

const approvedOrder = {
  id: "8b5f3f7e-0000-4000-8000-000000000001",
  orderNumber: "BF-20261117-0001",
  paymentStatus: "approved",
  status: "awaiting_production",
  boleto: null,
  demo: false,
  totalBrl: 75.9,
  customer: { name: "Maria Souza", email: "maria@example.com", contact: "(11) 99999-0000" },
  shippingAddress: { postalCode: "01001-000", street: "Praça da Sé", city: "São Paulo" },
  items: [{ ...cartItem, unitPriceBrl: 12.5, totalPriceBrl: 50, priceBrl: undefined }],
  commerce: {
    itemsSubtotalBrl: 50,
    discount: { applied: true, code: "TRACO10", amountBrl: 5, type: "percent" },
    shipping: { amountBrl: 30.9, serviceName: "PAC" },
    totalBrl: 75.9
  }
};

let calls;

beforeEach(() => {
  calls = [];
  resetAnalyticsRuntime();
  configureAnalytics({ measurementId: MEASUREMENT_ID });
  installWindow({ consent: true });
  setAnalyticsStatus("ready");
});

afterEach(() => {
  resetAnalyticsRuntime();
  delete globalThis.window;
});

test("sem ID configurado nenhum evento e enviado", () => {
  resetAnalyticsRuntime();
  setAnalyticsStatus("ready");

  assert.equal(trackAddToCart(cartItem), false);
  assert.equal(calls.length, 0);
});

test("sem consentimento analytics nenhum evento e enviado", () => {
  installWindow({ consent: false });
  assert.equal(trackAddToCart(cartItem), false);

  installWindow({ consent: null });
  assert.equal(trackAddToCart(cartItem), false);
  assert.equal(calls.length, 0);
});

test("consentimento de outra revisao do inventario nao libera o GA", () => {
  installWindow({ consent: true, revision: "base" });
  assert.equal(trackAddToCart(cartItem), false);
  assert.equal(calls.length, 0);
});

test("runtime bloqueado (demonstracao) descarta eventos e a fila", () => {
  resetAnalyticsRuntime();
  configureAnalytics({ measurementId: MEASUREMENT_ID });
  assert.equal(trackAddToCart(cartItem), true, "enfileira enquanto o carregador decide");
  setAnalyticsStatus("blocked");
  setAnalyticsStatus("ready");

  assert.equal(calls.length, 0);
  setAnalyticsStatus("blocked");
  assert.equal(trackAddToCart(cartItem), false);
  assert.equal(calls.length, 0);
});

test("parametro de demonstracao na URL e rotas administrativas nao medem", () => {
  installWindow({ consent: true, href: "https://www.baseforma.com.br/pedido-confirmado?orderId=x&payment=success&demo=1" });
  assert.equal(trackPurchase(approvedOrder), false);

  installWindow({ consent: true, href: "https://www.baseforma.com.br/admin/pedidos" });
  assert.equal(trackAddToCart(cartItem), false);
  assert.equal(calls.length, 0);

  assert.equal(isAnalyticsExcludedPath("/admin"), true);
  assert.equal(isAnalyticsExcludedPath("/demonstracao/abc"), true);
  assert.equal(isAnalyticsExcludedPath("/administrador"), false);
  assert.equal(isAnalyticsExcludedPath("/carrinho"), false);
});

test("eventos enfileirados antes da decisao saem quando o runtime fica pronto", () => {
  resetAnalyticsRuntime();
  configureAnalytics({ measurementId: MEASUREMENT_ID });
  trackViewItem({
    category: { slug: "sapata-base-lisa", name: "Sapata base lisa" },
    format: { slug: "redonda", name: "Redonda" },
    unitPriceBrl: 10
  });
  assert.equal(calls.length, 0);

  setAnalyticsStatus("ready");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "view_item");
  assert.deepEqual(calls[0][2].items[0], {
    item_id: "sapata-base-lisa/redonda",
    item_name: "Sapata base lisa Redonda",
    quantity: 1,
    item_category: "Sapata base lisa",
    price: 10,
    index: 0
  });
});

test("add_to_cart usa parametros oficiais em BRL", () => {
  trackAddToCart(cartItem);

  const [command, name, params] = calls[0];
  assert.equal(command, "event");
  assert.equal(name, "add_to_cart");
  assert.equal(params.currency, "BRL");
  assert.equal(params.value, 50);
  assert.equal(params.send_to, MEASUREMENT_ID);
  assert.deepEqual(params.items[0], {
    item_id: "sapata-base-lisa/redonda",
    item_name: "Sapata base lisa Redonda",
    quantity: 4,
    item_category: "Sapata base lisa",
    item_variant: "BF-RD-PI-D28-H6",
    price: 12.5,
    index: 0
  });
});

test("purchase so e montado para pagamento aprovado de pedido real", () => {
  const payload = buildPurchaseEvent(approvedOrder);
  assert.equal(payload.transaction_id, "BF-20261117-0001");
  assert.equal(payload.value, 45);
  assert.equal(payload.shipping, 30.9);
  assert.equal(payload.coupon, "TRACO10");
  assert.equal(payload.currency, "BRL");

  assert.equal(buildPurchaseEvent({ ...approvedOrder, paymentStatus: "pending" }), null);
  assert.equal(
    buildPurchaseEvent({ ...approvedOrder, paymentStatus: "pending", boleto: { url: "https://x" } }),
    null,
    "boleto pendente nao conta como purchase"
  );
  assert.equal(buildPurchaseEvent({ ...approvedOrder, boleto: { url: "https://x" } }), null);
  assert.equal(buildPurchaseEvent({ ...approvedOrder, demo: true }), null);
  assert.equal(buildPurchaseEvent({ ...approvedOrder, orderNumber: "" }), null);
  assert.equal(buildPurchaseEvent(null), null);
});

test("purchase e deduplicado por pedido entre recarregamentos", () => {
  assert.equal(trackPurchase(approvedOrder), true);
  assert.equal(trackPurchase(approvedOrder), false);
  assert.equal(calls.filter((call) => call[1] === "purchase").length, 1);
  assert.equal(hasLoggedPurchase(window.localStorage, approvedOrder.orderNumber), true);

  // Simula recarregar a pagina: runtime novo, mesmo localStorage.
  resetAnalyticsRuntime();
  configureAnalytics({ measurementId: MEASUREMENT_ID });
  setAnalyticsStatus("ready");
  assert.equal(trackPurchase(approvedOrder), false);

  // Duas chamadas enfileiradas tambem resultam em um unico envio.
  window.localStorage.removeItem(PURCHASE_LOG_STORAGE_KEY);
  resetAnalyticsRuntime();
  configureAnalytics({ measurementId: MEASUREMENT_ID });
  trackPurchase(approvedOrder);
  trackPurchase(approvedOrder);
  setAnalyticsStatus("ready");
  assert.equal(calls.filter((call) => call[1] === "purchase").length, 2);
});

test("nenhum evento carrega PII do pedido", () => {
  trackPurchase(approvedOrder);
  trackEvent("custom", {
    email: "maria@example.com",
    name: "Maria",
    note: "contato maria@example.com",
    doc: "529.982.247-25",
    cnpj_like: "11.222.333/0001-81",
    bare: "52998224725",
    phone_like: "(11) 99999-0000",
    ok: "sapata"
  });

  const serialized = JSON.stringify(calls);
  for (const forbidden of ["maria", "Maria", "529.982", "52998224725", "11.222.333", "99999", "Sé", "01001"]) {
    assert.equal(serialized.includes(forbidden), false, `vazou ${forbidden}`);
  }
  assert.equal(calls[1][2].ok, "sapata");
});

test("cupom privado nao e enviado", () => {
  const payload = buildItemsEvent([cartItem], {
    ...approvedOrder.commerce,
    discount: { applied: true, code: "FRETE-AF951F412D", amountBrl: 0 }
  });
  assert.equal(payload.coupon, undefined);
  assert.equal(buildItemsEvent([cartItem], { ...approvedOrder.commerce, discount: { applied: false, code: "TRACO10" } }).coupon, undefined);
});

test("page_location remove parametros sensiveis e preserva utm", () => {
  assert.equal(
    sanitizePageLocation("https://www.baseforma.com.br/pedido-confirmado?orderId=abc&payment=success&collection_id=1&payment_id=2&external_reference=abc&preference_id=p"),
    "https://www.baseforma.com.br/pedido-confirmado"
  );
  assert.equal(
    sanitizePageLocation("https://www.baseforma.com.br/conta?pedido=BF-1&token=xyz"),
    "https://www.baseforma.com.br/conta"
  );
  assert.equal(
    sanitizePageLocation("https://www.baseforma.com.br/configurar/sapata-base-lisa?formato=redonda&utm_source=newsletter&email=a@b.com"),
    "https://www.baseforma.com.br/configurar/sapata-base-lisa?formato=redonda&utm_source=newsletter"
  );
  assert.equal(
    sanitizePageLocation("https://www.baseforma.com.br/?utm_campaign=maria@example.com"),
    "https://www.baseforma.com.br/"
  );
  assert.equal(
    sanitizeReferrer("https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123&payer=x"),
    "https://www.mercadopago.com.br/checkout/v1/redirect"
  );
  assert.equal(sanitizeReferrer(""), "");
});

test("filtro de PII reconhece formatos brasileiros sem rejeitar SKU ou pedido", () => {
  assert.equal(looksLikePii("cliente@empresa.com.br"), true);
  assert.equal(looksLikePii("529.982.247-25"), true);
  assert.equal(looksLikePii("(11) 98765-4321"), true);
  assert.equal(looksLikePii("BF-20261117-0001"), false);
  assert.equal(looksLikePii("BF-RD-PI-D28-H6"), false);
  assert.deepEqual(sanitizeEventParams({ items: [{ item_id: "a", email: "x@y.z" }], value: Infinity }), {
    items: [{ item_id: "a" }]
  });
});

test("add_shipping_info so com frete cotado", () => {
  assert.equal(trackAddShippingInfo([cartItem], {
    totalBrl: 50,
    shipping: { status: "pending_address", serviceName: "Frete a calcular", amountBrl: 0 }
  }), false);
  assert.equal(trackAddShippingInfo([cartItem], null), false);
  assert.equal(trackAddShippingInfo([cartItem], {
    totalBrl: 80.9,
    shipping: { status: "estimated", serviceName: "Correios manual", amountBrl: 30.9 }
  }), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].shipping_tier, "Correios manual");
  assert.equal(calls[0][2].value, 50);
});

test("generate_lead envia apenas a origem", () => {
  trackGenerateLead("projeto_especial");
  assert.equal(calls[0][1], "generate_lead");
  assert.equal(calls[0][2].lead_source, "projeto_especial");
});

test("revogacao apaga cookies _ga* e o registro de compras", () => {
  const cookieWrites = [];
  installWindow({
    consent: true,
    cookie: "_ga=GA1.1.1; _ga_TEST000000=GS1.1; baseforma-x=1",
    onCookieWrite: (value) => cookieWrites.push(value)
  });
  window.localStorage.setItem(PURCHASE_LOG_STORAGE_KEY, "[\"BF-1\"]");

  clearAnalyticsData(window, MEASUREMENT_ID);

  assert.ok(cookieWrites.some((value) => value.startsWith("_ga=; Max-Age=0") && value.includes("domain=.baseforma.com.br")));
  assert.ok(cookieWrites.some((value) => value.startsWith("_ga_TEST000000=; Max-Age=0")));
  assert.equal(cookieWrites.some((value) => value.startsWith("baseforma-x")), false);
  assert.equal(window.localStorage.getItem(PURCHASE_LOG_STORAGE_KEY), null);
  assert.deepEqual(getCookieDomainVariants("localhost"), [""]);
});

test("configuracao do ID e da revisao do inventario", () => {
  assert.equal(normalizeMeasurementId(" g-test000000 "), MEASUREMENT_ID);
  assert.equal(normalizeMeasurementId("UA-123"), "");
  assert.equal(normalizeMeasurementId(""), "");
  assert.equal(getCookieInventoryRevision(""), "base");
  assert.equal(getCookieInventoryRevision(MEASUREMENT_ID), COOKIE_INVENTORY_REVISION_GA4);
  assert.deepEqual(getAnalyticsCookieNames(MEASUREMENT_ID), ["_ga", "_ga_TEST000000"]);
});

function installWindow({
  consent,
  revision = COOKIE_INVENTORY_REVISION_GA4,
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
  const cookieJar = cookie;
  globalThis.window = {
    localStorage,
    location: { href: url.href, pathname: url.pathname, search: url.search, hostname: url.hostname },
    document: {
      title: "Baseforma",
      get cookie() {
        return cookieJar;
      },
      set cookie(value) {
        onCookieWrite(value);
      }
    },
    gtag: (...args) => calls.push(args)
  };
}
