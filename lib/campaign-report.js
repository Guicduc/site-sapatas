// Relatorios de origem dos pedidos (orders.metadata.attribution) e exportacao de conversoes
// offline para o Google Ads. Funcoes puras: a rota/pagina do admin busca os pedidos.

import { PAYMENT_STATUS } from "./order-status.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_OFFLINE_CONVERSION_NAME = "Compra (importacao)";
// Brasil sem horario de verao desde 2019: offset fixo de Sao Paulo.
const SAO_PAULO_OFFSET_MINUTES = -180;

export const CHANNEL_LABELS = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  paid_other: "Outra mídia paga",
  organic_search: "Busca orgânica",
  social: "Social (orgânico)",
  email: "E-mail",
  referral: "Referência",
  campaign: "Campanha (utm)",
  direct: "Direto / sem origem"
};

/**
 * Agrupa pedidos dos ultimos `days` dias pela ultima origem externa registrada.
 * Receita aprovada = produtos - desconto (sem frete), o mesmo valor enviado como conversao.
 */
export function buildCampaignReport(orders = [], { now = new Date(), days = 30 } = {}) {
  const since = now.getTime() - days * DAY_MS;
  const rows = new Map();
  let attributedOrders = 0;
  let ordersWithClick = 0;

  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order || order.source === "special_request") continue;
    const createdAt = new Date(order.createdAt || 0).getTime();
    if (!Number.isFinite(createdAt) || createdAt < since) continue;

    const attribution = order.metadata?.attribution || null;
    const touch = attribution?.lastTouch || null;
    if (touch) attributedOrders += 1;
    if (attribution?.adClicks) ordersWithClick += 1;

    const channel = touch?.channel || "direct";
    const source = touch?.source || touch?.referrerHost || "";
    const medium = touch?.medium || "";
    const campaign = touch?.campaign || "";
    const key = [channel, source, medium, campaign].join("|");
    const row = rows.get(key) || {
      key,
      channel,
      channelLabel: CHANNEL_LABELS[channel] || channel,
      source,
      medium,
      campaign,
      ordersCount: 0,
      approvedOrdersCount: 0,
      approvedValueBrl: 0
    };

    row.ordersCount += 1;
    if (order.paymentStatus === PAYMENT_STATUS.APPROVED) {
      row.approvedOrdersCount += 1;
      row.approvedValueBrl = roundMoney(row.approvedValueBrl + conversionValue(order));
    }
    rows.set(key, row);
  }

  const sorted = [...rows.values()].sort((left, right) => {
    return right.approvedValueBrl - left.approvedValueBrl
      || right.ordersCount - left.ordersCount
      || left.key.localeCompare(right.key);
  });

  return { days, rows: sorted, attributedOrders, ordersWithClick };
}

/**
 * CSV de importacao de conversoes offline por clique (Google Ads > Metas > Conversoes >
 * Uploads). Uma linha por pedido aprovado com gclid, dentro de `days` dias (o Google
 * aceita cliques de ate 90 dias).
 */
export function buildGoogleAdsOfflineConversionsCsv(orders = [], {
  now = new Date(),
  days = 90,
  conversionName = DEFAULT_OFFLINE_CONVERSION_NAME
} = {}) {
  const since = now.getTime() - days * DAY_MS;
  const name = sanitizeCsvText(conversionName) || DEFAULT_OFFLINE_CONVERSION_NAME;
  const lines = [
    "Parameters:TimeZone=-0300",
    "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency"
  ];
  let count = 0;

  const eligible = (Array.isArray(orders) ? orders : [])
    .filter((order) => order?.paymentStatus === PAYMENT_STATUS.APPROVED && !order.demo && !order.metadata?.demo)
    .filter((order) => /^[A-Za-z0-9._-]{4,200}$/.test(String(order.metadata?.attribution?.adClicks?.gclid || "")))
    .filter((order) => {
      const createdAt = new Date(order.createdAt || 0).getTime();
      return Number.isFinite(createdAt) && createdAt >= since;
    })
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));

  for (const order of eligible) {
    lines.push([
      order.metadata.attribution.adClicks.gclid,
      csvCell(name),
      formatSaoPauloTime(order.createdAt),
      conversionValue(order).toFixed(2),
      "BRL"
    ].join(","));
    count += 1;
  }

  return { csv: `${lines.join("\n")}\n`, count };
}

export function conversionValue(order) {
  const commerce = order?.metadata?.commerce || {};
  const subtotal = Number(commerce.itemsSubtotalBrl);
  const discount = Number(commerce.discount?.amountBrl || 0);

  if (Number.isFinite(subtotal)) return roundMoney(Math.max(0, subtotal - discount));

  const items = Array.isArray(order?.items) ? order.items : [];
  return roundMoney(items.reduce((sum, item) => sum + Number(item.totalPriceBrl || 0), 0));
}

export function formatSaoPauloTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() + SAO_PAULO_OFFSET_MINUTES * 60 * 1000);
  const pad = (number) => String(number).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
}

function sanitizeCsvText(value) {
  return String(value || "").replace(/[\r\n]/g, " ").trim().slice(0, 100);
}

function csvCell(value) {
  const text = String(value);
  // Evita injecao de formula em planilhas e escapa aspas.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function roundMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}
