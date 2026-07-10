import {
  buildConfigurationSku,
  calculatePriceBreakdown,
  getCategoryBySlug,
  getFormat
} from "@/lib/configurator-data";
import { calculateCommerceAdjustments } from "@/lib/commerce-adjustments";

const melhorEnvioProductionBaseUrl = "https://www.melhorenvio.com.br/api/v2";
const melhorEnvioSandboxBaseUrl = "https://sandbox.melhorenvio.com.br/api/v2";
const maximumMelhorEnvioProducts = 30;
const manualPostingFulfillment = {
  fulfillmentMode: "manual_posting",
  fulfillmentLabel: "Postagem manual"
};

export function sanitizePostalCode(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export function hasRealShippingProvider() {
  return getShippingProvider() === "melhor_envio";
}

export async function quoteShippingForCheckout({ items = [], shippingAddress = {}, couponCode = "" } = {}) {
  const normalizedItems = normalizeShippingItems(items);
  const itemsSubtotalBrl = roundMoney(
    normalizedItems.reduce((sum, item) => sum + Number(item.totalPriceBrl || 0), 0)
  );
  const quote = await quoteShipping({ items: normalizedItems, shippingAddress, itemsSubtotalBrl });
  const commerce = calculateCommerceAdjustments({
    itemsSubtotalBrl,
    shippingAddress,
    couponCode,
    shippingQuote: quote
  });

  return { quote, commerce, items: normalizedItems };
}

export async function quoteShipping({ items = [], shippingAddress = {}, itemsSubtotalBrl = 0 } = {}) {
  const provider = getShippingProvider();
  const fallback = calculateCommerceAdjustments({
    itemsSubtotalBrl,
    shippingAddress,
    couponCode: ""
  }).shipping;

  if (provider !== "melhor_envio") {
    return {
      ...fallback,
      provider: "manual",
      source: "manual",
      mode: "estimated_manual",
      ...manualPostingFulfillment
    };
  }

  if (sanitizePostalCode(shippingAddress?.postalCode).length !== 8) {
    return {
      ...fallback,
      provider,
      source: "melhor_envio",
      status: "pending_address",
      ...manualPostingFulfillment,
      message: "Informe o CEP de entrega para calcular o frete."
    };
  }

  if (!process.env.MELHOR_ENVIO_ACCESS_TOKEN || !sanitizePostalCode(process.env.SHIPPING_ORIGIN_POSTAL_CODE)) {
    return {
      ...fallback,
      provider,
      source: "manual_fallback",
      status: "provider_not_configured",
      ...manualPostingFulfillment,
      message: "Frete estimado por UF para postagem manual via Correios. Configure MELHOR_ENVIO_ACCESS_TOKEN e SHIPPING_ORIGIN_POSTAL_CODE para cotacao real."
    };
  }

  try {
    return await quoteMelhorEnvio({ items, shippingAddress });
  } catch (error) {
    return {
      ...fallback,
      provider,
      source: "manual_fallback",
      status: "provider_error",
      ...manualPostingFulfillment,
      error: {
        code: error.code || "shipping_provider_error",
        message: error.message || "Falha ao cotar frete no provedor."
      },
      message: "Frete estimado por UF para postagem manual via Correios; nao foi possivel consultar o provedor agora."
    };
  }
}

async function quoteMelhorEnvio({ items, shippingAddress }) {
  const payload = buildMelhorEnvioPayload({ items, shippingAddress });
  const response = await fetch(`${getMelhorEnvioBaseUrl()}/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MELHOR_ENVIO_ACCESS_TOKEN}`,
      "User-Agent": getMelhorEnvioUserAgent()
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(readProviderError(data) || "Melhor Envio rejeitou a cotacao de frete.");
    error.code = "melhor_envio_quote_failed";
    error.status = response.status;
    error.raw = data;
    throw error;
  }

  const services = normalizeMelhorEnvioQuotes(data);
  const selected = selectShippingService(services);

  if (!selected) {
    const error = new Error(readUnavailableServices(data) || "Melhor Envio nao retornou servico de frete disponivel.");
    error.code = "melhor_envio_no_service";
    error.raw = data;
    throw error;
  }

  return {
    ...selected,
    alternatives: services
      .filter((service) => service.quoteId !== selected.quoteId)
      .map(stripQuoteRawData),
    request: {
      fromPostalCode: payload.from.postal_code,
      toPostalCode: payload.to.postal_code,
      productCount: payload.products.length,
      services: payload.options?.services || ""
    }
  };
}

export function buildMelhorEnvioPayload({ items = [], shippingAddress = {} } = {}) {
  const products = buildMelhorEnvioProducts(items);

  if (!products.length) {
    const error = new Error("Inclua ao menos um item para cotar o frete.");
    error.code = "shipping_items_required";
    throw error;
  }

  return {
    from: { postal_code: sanitizePostalCode(process.env.SHIPPING_ORIGIN_POSTAL_CODE) },
    to: { postal_code: sanitizePostalCode(shippingAddress.postalCode) },
    products,
    options: buildMelhorEnvioOptions()
  };
}

function buildMelhorEnvioProducts(items) {
  return (Array.isArray(items) ? items : []).slice(0, maximumMelhorEnvioProducts).map((item) => {
    const dimensions = shippingDimensionsForItem(item);
    const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
    // O peso existe somente no payload efemero enviado ao provedor de frete.
    // Nao e devolvido nem persistido como dado operacional do pedido.
    const weightKg = calculateShippingWeightKg(item);
    const insuranceValue = roundMoney(item.unitPriceBrl || item.totalPriceBrl || 0);

    return {
      id: cleanText(item.sku || item.id, 120),
      width: dimensions.widthCm,
      height: dimensions.heightCm,
      length: dimensions.lengthCm,
      weight: weightKg,
      insurance_value: Math.max(0.01, insuranceValue),
      quantity
    };
  });
}

function buildMelhorEnvioOptions() {
  const services = String(process.env.MELHOR_ENVIO_SERVICE_IDS || "")
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);

  return {
    receipt: false,
    own_hand: false,
    collect: false,
    ...(services.length ? { services: services.join(",") } : {})
  };
}

function normalizeMelhorEnvioQuotes(data) {
  return (Array.isArray(data) ? data : [])
    .filter((service) => !service.error)
    .map((service) => {
      const amount = Number(service.custom_price ?? service.price ?? service.discount ?? 0);
      const deliveryTime = Number(service.custom_delivery_time ?? service.delivery_time ?? 0);
      const serviceId = String(service.id || "");
      const serviceName = service.name || "Frete";
      const companyName = service.company?.name || "";
      return {
        status: "quoted",
        provider: "melhor_envio",
        source: "melhor_envio",
        mode: "real_time",
        ...manualPostingFulfillment,
        serviceId,
        serviceName,
        companyName,
        amountBrl: roundMoney(amount),
        originalAmountBrl: roundMoney(amount),
        deliveryTimeDays: Number.isFinite(deliveryTime) && deliveryTime > 0 ? deliveryTime : null,
        quoteId: serviceId
          ? `melhor_envio:${serviceId}:${roundMoney(amount)}:${deliveryTime || 0}`
          : "",
        raw: {
          id: serviceId,
          name: serviceName,
          company: companyName,
          currency: service.currency,
          price: service.price,
          custom_price: service.custom_price,
          discount: service.discount,
          delivery_time: service.delivery_time,
          custom_delivery_time: service.custom_delivery_time
        },
        message: formatShippingMessage(service, amount, deliveryTime)
      };
    })
    .filter((service) => service.amountBrl > 0);
}

function selectShippingService(services) {
  const preferredIds = String(process.env.MELHOR_ENVIO_PREFERRED_SERVICE_IDS || "")
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);

  if (preferredIds.length) {
    const preferred = services
      .filter((service) => preferredIds.includes(service.serviceId))
      .sort((left, right) => left.amountBrl - right.amountBrl)[0];
    if (preferred) return preferred;
  }

  return services.sort((left, right) => left.amountBrl - right.amountBrl)[0] || null;
}

function stripQuoteRawData(service) {
  const { raw: _raw, alternatives: _alternatives, ...safeService } = service;
  return safeService;
}

export function normalizeShippingItems(items = []) {
  return (Array.isArray(items) ? items : []).slice(0, 30).map((item) => {
    const categorySlug = cleanText(item.categorySlug, 80);
    const formatSlug = cleanText(item.formatSlug, 80);
    const category = getCategoryBySlug(categorySlug);
    const format = category ? getFormat(category, formatSlug) : null;
    const values = normalizeValues(item.values);
    const quantity = Math.max(1, Math.min(999, Math.floor(Number(item.quantity || 1))));
    const priceBreakdown = format ? calculatePriceBreakdown(format, values, quantity) : item.priceBreakdown || {};

    return {
      id: cleanText(item.id, 80),
      categorySlug,
      categoryName: category?.name || cleanText(item.categoryName, 120),
      formatSlug,
      formatName: format?.name || cleanText(item.formatName, 120),
      sku: format ? buildConfigurationSku(format, values) : cleanText(item.sku, 120),
      values,
      quantity,
      unitPriceBrl: roundMoney(priceBreakdown.unitPriceBrl ?? item.unitPriceBrl),
      totalPriceBrl: roundMoney(priceBreakdown.totalPriceBrl ?? item.totalPriceBrl ?? item.priceBrl),
      priceBreakdown
    };
  });
}

export function shippingDimensionsForItem(item = {}) {
  const values = item.values || {};
  const widthMm = firstPositive([
    values.tamanhoBaseX,
    values.largura,
    values.larguraInterna,
    values.diametro,
    values.diametroBase
  ]);
  const lengthMm = firstPositive([
    values.tamanhoBaseY,
    values.comprimento,
    values.alturaInterna,
    values.diametro,
    values.diametroBase,
    widthMm
  ]);
  const heightMm = firstPositive([
    values.alturaBase,
    values.altura,
    values.alturaApoio,
    6
  ]) + firstPositive([
    values.pescoco ? values.alturaPescoco : 0,
    item.categorySlug === "ponteira-interna-tubo" ? values.alturaPescoco : 0,
    0
  ]);
  const paddingCm = getPackagingPaddingCm();

  return {
    widthCm: normalizeDimensionCm(widthMm / 10 + paddingCm),
    lengthCm: normalizeDimensionCm(lengthMm / 10 + paddingCm),
    heightCm: normalizeDimensionCm(heightMm / 10 + paddingCm)
  };
}

function normalizeDimensionCm(value) {
  const minimum = getMinimumProductDimensionCm();
  return roundMetric(Math.max(minimum, Number(value || minimum)), 2);
}

function firstPositive(values) {
  const found = values.find((value) => Number(value) > 0);
  return Number(found || 0);
}

function normalizeValues(values = {}) {
  return Object.fromEntries(
    Object.entries(values || {})
      .slice(0, 20)
      .map(([key, value]) => [cleanText(key, 60), normalizeValue(value)])
  );
}

function normalizeValue(value) {
  if (typeof value === "boolean") return value;
  const number = Number(value);
  return Number.isFinite(number) ? number : cleanText(value, 60);
}

function getShippingProvider() {
  return String(process.env.SHIPPING_PROVIDER || "manual").trim().toLowerCase();
}

function getMelhorEnvioBaseUrl() {
  if (process.env.MELHOR_ENVIO_ENV === "production") {
    return process.env.MELHOR_ENVIO_API_BASE_URL || melhorEnvioProductionBaseUrl;
  }
  return process.env.MELHOR_ENVIO_API_BASE_URL || melhorEnvioSandboxBaseUrl;
}

function getMelhorEnvioUserAgent() {
  return process.env.MELHOR_ENVIO_USER_AGENT || "Baseforma (tecnico@baseforma.com.br)";
}

function getPackagingPaddingCm() {
  return safeNumber(process.env.SHIPPING_PRODUCT_PADDING_CM, 0.5);
}

function getPackagingWeightGrams() {
  return safeNumber(process.env.SHIPPING_PACKAGING_WEIGHT_GRAMS, 20);
}

function getMinimumProductDimensionCm() {
  return safeNumber(process.env.SHIPPING_MIN_PRODUCT_DIMENSION_CM, 1);
}

function getMinimumProductWeightKg() {
  return safeNumber(process.env.SHIPPING_MIN_PRODUCT_WEIGHT_KG, 0.01);
}

function formatShippingMessage(service, amount, deliveryTime) {
  const company = service.company?.name ? `${service.company.name} ` : "";
  const prazo = Number(deliveryTime) > 0 ? `, prazo ${deliveryTime} dia(s)` : "";
  return `${company}${service.name || "Frete"} cotado em R$ ${roundMoney(amount)}${prazo}. Postagem manual pela operacao.`;
}

function calculateShippingWeightKg(item) {
  const productWeightGrams = Math.max(0, Number(item.priceBreakdown?.materialGrams || 0));
  return Math.max(
    getMinimumProductWeightKg(),
    roundMetric((productWeightGrams + getPackagingWeightGrams()) / 1000, 3)
  );
}

function readProviderError(data) {
  if (!data) return "";
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  if (data.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(" ");
  }
  return "";
}

function readUnavailableServices(data) {
  if (!Array.isArray(data)) return "";
  const errors = data
    .map((service) => service.error || service.warning || "")
    .filter(Boolean)
    .map((message) => String(message).trim());

  return errors.length ? errors.join(" ") : "";
}

function safeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function roundMetric(value, precision = 2) {
  const multiplier = 10 ** precision;
  return Math.round(Number(value || 0) * multiplier) / multiplier;
}
