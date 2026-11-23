import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AD_CLICKS_STORAGE_KEY,
  ATTRIBUTION_STORAGE_KEY,
  buildCampaignTouch,
  buildOrderAttributionPayload,
  clearStoredAdClicks,
  readGaClientId,
  readStoredAdClicks,
  readStoredAttribution,
  recordAdClicks,
  recordCampaignTouch,
  sanitizeOrderAttribution
} from "../lib/campaign-attribution.js";
import {
  buildCampaignReport,
  buildGoogleAdsOfflineConversionsCsv,
  formatSaoPauloTime
} from "../lib/campaign-report.js";

const NOW = new Date("2026-11-23T15:00:00.000Z");
const SITE = "https://www.baseforma.com.br";

test("entrada por anuncio do Google gera origem com canal google_ads", () => {
  const touch = buildCampaignTouch({
    href: `${SITE}/familias/sapata-tubo-quadrado?utm_source=google&utm_medium=cpc&utm_campaign=search-ponteira-tubo&utm_term=ponteira%20metalon%2020x20&gclid=Cj0KCQ-abc_123`,
    referrer: "https://www.google.com/",
    now: NOW
  });

  assert.deepEqual(touch, {
    source: "google",
    medium: "cpc",
    campaign: "search-ponteira-tubo",
    term: "ponteira metalon 20x20",
    channel: "google_ads",
    landingPath: "/familias/sapata-tubo-quadrado",
    referrerHost: "www.google.com",
    capturedAt: NOW.toISOString()
  });
  assert.equal("gclid" in touch, false, "a origem de campanha nao carrega o identificador do clique");
});

test("canais inferidos sem utm e navegacao interna sem origem", () => {
  assert.equal(buildCampaignTouch({ href: `${SITE}/`, referrer: "https://www.google.com/", now: NOW }).channel, "organic_search");
  assert.equal(buildCampaignTouch({ href: `${SITE}/`, referrer: "https://l.instagram.com/", now: NOW }).channel, "social");
  assert.equal(buildCampaignTouch({ href: `${SITE}/?utm_source=instagram&utm_medium=paid_social&fbclid=IwAR1x`, now: NOW }).channel, "meta_ads");
  assert.equal(buildCampaignTouch({ href: `${SITE}/?utm_source=parceiro`, now: NOW }).channel, "campaign");
  assert.equal(buildCampaignTouch({ href: `${SITE}/catalogo`, referrer: `${SITE}/`, now: NOW }), null);
  assert.equal(buildCampaignTouch({ href: `${SITE}/catalogo`, referrer: "", now: NOW }), null);
  assert.equal(
    buildCampaignTouch({ href: `${SITE}/pedido-confirmado`, referrer: "https://www.mercadopago.com.br/checkout", now: NOW }),
    null,
    "retorno do checkout nao substitui a origem"
  );
});

test("utm com e-mail, CPF ou telefone formatado e descartado; IDs numericos ficam", () => {
  const touch = buildCampaignTouch({
    href: `${SITE}/?utm_source=newsletter&utm_content=maria%40example.com&utm_term=123.456.789-09&utm_campaign=(11)%2099999-0000&utm_id=21234567890`,
    now: NOW
  });

  assert.equal(touch.source, "newsletter");
  assert.equal(touch.content, undefined);
  assert.equal(touch.term, undefined);
  assert.equal(touch.campaign, undefined);
  assert.equal(touch.id, "21234567890");
});

test("primeira origem fica, ultima origem e substituida, e expira em 30 dias", () => {
  const storage = createMemoryStorage();
  const first = buildCampaignTouch({ href: `${SITE}/?utm_source=google&utm_medium=cpc`, now: NOW });
  const later = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000);
  const second = buildCampaignTouch({ href: `${SITE}/?utm_source=instagram&utm_medium=paid_social`, now: later });

  recordCampaignTouch(storage, first, NOW);
  recordCampaignTouch(storage, second, later);

  const stored = readStoredAttribution(storage, later);
  assert.equal(stored.firstTouch.source, "google");
  assert.equal(stored.lastTouch.source, "instagram");
  assert.equal(readStoredAttribution(storage, new Date(later.getTime() + 31 * 24 * 60 * 60 * 1000)), null);
  assert.ok(storage.getItem(ATTRIBUTION_STORAGE_KEY));
});

test("payload do pedido so leva cliques com publicidade e client_id com medicao", () => {
  const storage = createMemoryStorage();
  recordCampaignTouch(storage, buildCampaignTouch({ href: `${SITE}/?utm_source=google&utm_medium=cpc`, now: NOW }), NOW);
  recordAdClicks(storage, { gclid: "Cj0KCQ-abc_123", evil: "x" }, NOW);
  const cookie = "_ga=GA1.1.1234567890.1700000000; outro=1";

  const none = buildOrderAttributionPayload({ storage, cookie, consent: {}, now: NOW });
  assert.equal(none.lastTouch.source, "google");
  assert.equal(none.adClicks, undefined);
  assert.equal(none.gaClientId, undefined);

  const all = buildOrderAttributionPayload({ storage, cookie, consent: { analytics: true, marketing: true }, now: NOW });
  assert.equal(all.adClicks.gclid, "Cj0KCQ-abc_123");
  assert.equal(all.adClicks.evil, undefined);
  assert.equal(all.gaClientId, "1234567890.1700000000");

  clearStoredAdClicks(storage);
  assert.equal(readStoredAdClicks(storage, NOW), null);
  assert.equal(storage.getItem(AD_CLICKS_STORAGE_KEY), null);
  assert.equal(buildOrderAttributionPayload({ storage: createMemoryStorage(), consent: {} }), null);
  assert.equal(readGaClientId("_ga=lixo"), "");
});

test("servidor saneia a atribuicao recebida", () => {
  const clean = sanitizeOrderAttribution({
    firstTouch: { source: "<script>google</script>", channel: "hacker", landingPath: "/x?y=<z>", referrerHost: "evil host" },
    lastTouch: { source: "google", medium: "cpc", channel: "google_ads", capturedAt: NOW.toISOString(), extra: "nao" },
    adClicks: { gclid: "abc def", fbclid: "IwAR1_valid", capturedAt: NOW.toISOString() },
    gaClientId: "drop table",
    customer: { email: "x@y.com" }
  });

  assert.deepEqual(clean, {
    firstTouch: { source: "scriptgoogle/script", channel: "campaign", landingPath: "/xyz" },
    lastTouch: { source: "google", medium: "cpc", channel: "google_ads", capturedAt: NOW.toISOString() },
    adClicks: { fbclid: "IwAR1_valid", capturedAt: NOW.toISOString() }
  });
  assert.equal(sanitizeOrderAttribution(null), null);
  assert.equal(sanitizeOrderAttribution("x"), null);
  assert.equal(sanitizeOrderAttribution({}), null);
});

const paidGoogleOrder = {
  id: "1",
  orderNumber: "BF-1",
  source: "configurator",
  paymentStatus: "approved",
  createdAt: "2026-11-20T13:30:05.000Z",
  metadata: {
    commerce: { itemsSubtotalBrl: 120, discount: { amountBrl: 12 }, shipping: { amountBrl: 25 }, totalBrl: 133 },
    attribution: {
      lastTouch: { source: "google", medium: "cpc", campaign: "search-ponteira-tubo", channel: "google_ads" },
      adClicks: { gclid: "Cj0KCQ-abc_123" }
    }
  }
};

test("relatorio agrupa pedidos pela ultima origem com valor sem frete", () => {
  const report = buildCampaignReport([
    paidGoogleOrder,
    { ...paidGoogleOrder, id: "2", paymentStatus: "pending" },
    { id: "3", source: "configurator", paymentStatus: "approved", createdAt: "2026-11-21T10:00:00.000Z", metadata: { commerce: { itemsSubtotalBrl: 50 } } },
    { id: "4", source: "special_request", paymentStatus: "pending", createdAt: "2026-11-21T10:00:00.000Z" },
    { ...paidGoogleOrder, id: "5", createdAt: "2026-09-01T10:00:00.000Z" }
  ], { now: NOW });

  assert.equal(report.rows.length, 2);
  assert.deepEqual(report.rows[0], {
    key: "google_ads|google|cpc|search-ponteira-tubo",
    channel: "google_ads",
    channelLabel: "Google Ads",
    source: "google",
    medium: "cpc",
    campaign: "search-ponteira-tubo",
    ordersCount: 2,
    approvedOrdersCount: 1,
    approvedValueBrl: 108
  });
  assert.equal(report.rows[1].channel, "direct");
  assert.equal(report.attributedOrders, 2);
  assert.equal(report.ordersWithClick, 2);
});

test("CSV de conversoes offline traz so pedidos pagos com gclid, em horario de Sao Paulo", () => {
  const { csv, count } = buildGoogleAdsOfflineConversionsCsv([
    paidGoogleOrder,
    { ...paidGoogleOrder, id: "2", paymentStatus: "pending" },
    { ...paidGoogleOrder, id: "3", metadata: { ...paidGoogleOrder.metadata, attribution: { adClicks: { fbclid: "IwAR1" } } } },
    { ...paidGoogleOrder, id: "4", demo: true },
    { ...paidGoogleOrder, id: "5", createdAt: "2026-07-01T10:00:00.000Z" }
  ], { now: NOW, conversionName: "=Compra, importada" });

  assert.equal(count, 1);
  assert.equal(csv, [
    "Parameters:TimeZone=-0300",
    "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency",
    "Cj0KCQ-abc_123,\"'=Compra, importada\",2026-11-20 10:30:05,108.00,BRL",
    ""
  ].join("\n"));
  assert.equal(formatSaoPauloTime("2026-01-01T02:00:00.000Z"), "2025-12-31 23:00:00");
});

test("revisao: fbclid organico nao apaga gclid, Gmail conta como e-mail, primeira origem expira", () => {
  const storage = createMemoryStorage();
  const later = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000);
  recordAdClicks(storage, { gclid: "Cj0KCQ-abc_123" }, NOW);
  recordAdClicks(storage, { fbclid: "IwAR1_organico" }, later);
  const clicks = readStoredAdClicks(storage, later);
  assert.equal(clicks.gclid, "Cj0KCQ-abc_123");
  assert.equal(clicks.fbclid, "IwAR1_organico");
  assert.equal(clicks.googleCapturedAt, NOW.toISOString());
  recordAdClicks(storage, { gbraid: "0AAAAAx_gb" }, later);
  assert.equal(readStoredAdClicks(storage, later).gclid, undefined, "novo clique do Google substitui o anterior");
  assert.equal(readStoredAdClicks(storage, later).fbclid, "IwAR1_organico");

  assert.equal(buildCampaignTouch({ href: `${SITE}/conta`, referrer: "https://mail.google.com/", now: NOW }).channel, "email");
  assert.equal(buildCampaignTouch({ href: `${SITE}/conta`, referrer: "android-app://com.google.android.gm/", now: NOW }).channel, "email");
  assert.equal(buildCampaignTouch({ href: `${SITE}/`, referrer: "https://www.google.com.br/", now: NOW }).channel, "organic_search");

  const touches = createMemoryStorage();
  const old = buildCampaignTouch({ href: `${SITE}/?utm_source=google&utm_medium=cpc`, now: NOW });
  recordCampaignTouch(touches, old, NOW);
  for (let day = 20; day <= 40; day += 20) {
    const when = new Date(NOW.getTime() + day * 24 * 60 * 60 * 1000);
    recordCampaignTouch(touches, buildCampaignTouch({ href: `${SITE}/?utm_source=meta&utm_medium=paid_social`, now: when }), when);
  }
  const stored = readStoredAttribution(touches, new Date(NOW.getTime() + 40 * 24 * 60 * 60 * 1000));
  assert.equal(stored.firstTouch.source, "meta", "primeira origem com mais de 30 dias e substituida");

  const sanitized = sanitizeOrderAttribution({ adClicks: { gclid: "Cj0KCQ-abc_123", capturedAt: "1", googleCapturedAt: NOW.toISOString() } });
  assert.deepEqual(sanitized.adClicks, { gclid: "Cj0KCQ-abc_123", googleCapturedAt: NOW.toISOString() });
});

test("relatorio ignora pedidos substituidos ou cancelados", () => {
  const report = buildCampaignReport([
    paidGoogleOrder,
    { ...paidGoogleOrder, id: "2", paymentStatus: "cancelled" },
    { ...paidGoogleOrder, id: "3", paymentStatus: "rejected" }
  ], { now: NOW });
  assert.equal(report.rows[0].ordersCount, 1);
});

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}
