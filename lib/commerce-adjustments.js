const freeShippingThresholdBrl = 250;

const shippingRatesByState = {
  SP: 18,
  RJ: 28,
  MG: 28,
  ES: 28,
  PR: 28,
  SC: 28,
  RS: 28
};

const defaultShippingRateBrl = 42;
const defaultManualDeliveryTimeDays = 10;

const manualDeliveryTimeDaysByState = {
  SP: 5,
  RJ: 7,
  MG: 7,
  ES: 7,
  PR: 7,
  SC: 8,
  RS: 8
};

export function normalizeCouponCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function calculateCommerceAdjustments({
  itemsSubtotalBrl = 0,
  shippingAddress = {},
  promotion = null,
  shippingQuote = null
} = {}) {
  const subtotal = roundMoney(Math.max(0, Number(itemsSubtotalBrl || 0)));
  const shipping = normalizeShippingQuote(shippingQuote) || calculateShipping({ subtotal, shippingAddress });
  const discount = normalizePromotionResult(promotion);
  const shippingAmount = discount.type === "free_shipping" && discount.applied
    ? 0
    : shipping.amountBrl;
  const total = roundMoney(Math.max(0, subtotal - discount.amountBrl + shippingAmount));

  return {
    itemsSubtotalBrl: subtotal,
    discount,
    shipping: {
      ...shipping,
      amountBrl: shippingAmount,
      originalAmountBrl: shipping.originalAmountBrl ?? shipping.amountBrl,
      freeShippingApplied: shipping.freeShippingApplied || (discount.type === "free_shipping" && discount.applied)
    },
    totalBrl: total
  };
}

function calculateShipping({ subtotal, shippingAddress }) {
  const state = normalizeState(shippingAddress?.state);

  if (!state) {
    return {
      status: "pending_address",
      serviceName: "Frete a calcular",
      state: "",
      amountBrl: 0,
      freeShippingApplied: false,
      message: "Informe a UF para calcular o frete."
    };
  }

  const baseAmount = shippingRatesByState[state] ?? defaultShippingRateBrl;
  const freeShippingApplied = subtotal >= freeShippingThresholdBrl;

  return {
    status: "estimated",
    provider: "manual",
    source: "manual",
    mode: "estimated_manual",
    fulfillmentMode: "manual_posting",
    fulfillmentLabel: "Postagem manual",
    serviceName: "Correios manual",
    companyName: "Correios",
    state,
    amountBrl: freeShippingApplied ? 0 : baseAmount,
    originalAmountBrl: baseAmount,
    deliveryTimeDays: manualDeliveryTimeDaysByState[state] ?? defaultManualDeliveryTimeDays,
    freeShippingApplied,
    message: freeShippingApplied
      ? `Frete gratuito acima de R$ ${freeShippingThresholdBrl}; postagem pelos Correios sera conferida pela operacao.`
      : "Frete estimado por UF para postagem manual via Correios, sujeito a conferencia operacional antes do envio."
  };
}

function normalizeShippingQuote(quote) {
  if (!quote || typeof quote !== "object") {
    return null;
  }

  const amountBrl = roundMoney(quote.amountBrl);
  const status = String(quote.status || "");

  if (!status) {
    return null;
  }

  return {
    status,
    provider: String(quote.provider || quote.source || "manual"),
    source: String(quote.source || quote.provider || "manual"),
    mode: String(quote.mode || ""),
    serviceId: String(quote.serviceId || ""),
    serviceName: String(quote.serviceName || "Frete"),
    companyName: String(quote.companyName || ""),
    fulfillmentMode: String(quote.fulfillmentMode || ""),
    fulfillmentLabel: String(quote.fulfillmentLabel || ""),
    quoteId: String(quote.quoteId || ""),
    state: String(quote.state || "").toUpperCase().slice(0, 2),
    amountBrl,
    originalAmountBrl: roundMoney(quote.originalAmountBrl ?? amountBrl),
    deliveryTimeDays: Number.isFinite(Number(quote.deliveryTimeDays)) ? Number(quote.deliveryTimeDays) : null,
    freeShippingApplied: Boolean(quote.freeShippingApplied),
    alternatives: Array.isArray(quote.alternatives) ? quote.alternatives : [],
    request: quote.request || null,
    error: quote.error || null,
    raw: quote.raw || null,
    message: String(quote.message || "Frete calculado.")
  };
}

function normalizePromotionResult(promotion) {
  if (!promotion || typeof promotion !== "object") {
    return emptyDiscount("Informe um cupom se houver.");
  }

  return {
    code: normalizeCouponCode(promotion.code),
    label: String(promotion.label || ""),
    type: String(promotion.type || "none"),
    status: String(promotion.status || "none"),
    applied: Boolean(promotion.applied),
    amountBrl: roundMoney(Math.max(0, promotion.amountBrl || 0)),
    message: String(promotion.message || "")
  };
}

function emptyDiscount(message) {
  return {
    code: "",
    label: "",
    type: "none",
    status: "none",
    applied: false,
    amountBrl: 0,
    message
  };
}

function normalizeState(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
