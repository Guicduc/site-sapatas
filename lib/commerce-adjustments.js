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

const coupons = [
  {
    code: "TRACO10",
    label: "10% no pedido",
    type: "percent",
    value: 0.1,
    minimumSubtotalBrl: 80,
    maxDiscountBrl: 60
  },
  {
    code: "PRIMEIRO15",
    label: "15% na primeira compra",
    type: "percent",
    value: 0.15,
    minimumSubtotalBrl: 120,
    maxDiscountBrl: 75
  },
  {
    code: "FRETEGRATIS",
    label: "Frete gratuito",
    type: "free_shipping",
    value: 1,
    minimumSubtotalBrl: 150
  }
];

export function normalizeCouponCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function calculateCommerceAdjustments({
  itemsSubtotalBrl = 0,
  shippingAddress = {},
  couponCode = "",
  shippingQuote = null
} = {}) {
  const subtotal = roundMoney(Math.max(0, Number(itemsSubtotalBrl || 0)));
  const shipping = normalizeShippingQuote(shippingQuote) || calculateShipping({ subtotal, shippingAddress });
  const discount = calculateDiscount({ subtotal, shipping, couponCode });
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
    serviceName: state === "SP" ? "Entrega regional" : "Envio nacional",
    state,
    amountBrl: freeShippingApplied ? 0 : baseAmount,
    originalAmountBrl: baseAmount,
    freeShippingApplied,
    message: freeShippingApplied
      ? `Frete gratuito acima de R$ ${freeShippingThresholdBrl}.`
      : "Frete estimado por UF, sujeito a conferência operacional."
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
    quoteId: String(quote.quoteId || ""),
    state: String(quote.state || "").toUpperCase().slice(0, 2),
    amountBrl,
    originalAmountBrl: roundMoney(quote.originalAmountBrl ?? amountBrl),
    deliveryTimeDays: Number.isFinite(Number(quote.deliveryTimeDays)) ? Number(quote.deliveryTimeDays) : null,
    freeShippingApplied: Boolean(quote.freeShippingApplied),
    error: quote.error || null,
    raw: quote.raw || null,
    message: String(quote.message || "Frete calculado.")
  };
}

function calculateDiscount({ subtotal, shipping, couponCode }) {
  const code = normalizeCouponCode(couponCode);

  if (!code) {
    return emptyDiscount("Informe um cupom se houver.");
  }

  const coupon = coupons.find((item) => item.code === code);

  if (!coupon) {
    return {
      ...emptyDiscount("Cupom não encontrado."),
      code,
      status: "invalid"
    };
  }

  if (subtotal < coupon.minimumSubtotalBrl) {
    return {
      ...emptyDiscount(`Cupom válido para pedidos acima de R$ ${coupon.minimumSubtotalBrl}.`),
      code,
      label: coupon.label,
      status: "not_eligible"
    };
  }

  if (coupon.type === "free_shipping") {
    if (shipping.status === "pending_address") {
      return {
        ...emptyDiscount("Informe a UF para aplicar frete grátis."),
        code,
        label: coupon.label,
        status: "pending_address",
        type: coupon.type
      };
    }

    return {
      code,
      label: coupon.label,
      type: coupon.type,
      status: "applied",
      applied: true,
      amountBrl: 0,
      message: "Frete zerado pelo cupom."
    };
  }

  const rawAmount = coupon.type === "percent"
    ? subtotal * coupon.value
    : coupon.value;
  const amount = roundMoney(Math.min(rawAmount, coupon.maxDiscountBrl || rawAmount, subtotal));

  return {
    code,
    label: coupon.label,
    type: coupon.type,
    status: "applied",
    applied: true,
    amountBrl: amount,
    message: "Cupom aplicado."
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
