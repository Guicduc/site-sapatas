import {
  buildConfigurationSku,
  calculateLeadTime,
  calculatePriceBreakdown,
  getCategoryBySlug,
  getFormat,
  getInitialValues,
  validateConfiguration
} from "@/lib/configurator-data";
import { buildInitialCadMetadata } from "@/lib/cad-contract";
import { calculateCommerceAdjustments } from "@/lib/commerce-adjustments";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";
import { quoteShipping } from "@/lib/shipping";

export async function buildOrderDraft(payload = {}) {
  const now = new Date();
  const source = payload.source || "configurator";
  const customer = normalizeCustomer(payload.customer || payload);
  const shippingAddress = normalizeShippingAddress(payload.shippingAddress);

  if (source === "special_request") {
    return buildSpecialRequestDraft(payload, customer, now);
  }

  const incomingItems = Array.isArray(payload.items) ? payload.items : [];
  const errors = validateCustomer(customer);
  errors.push(...validateShippingAddress(shippingAddress));

  if (!incomingItems.length) {
    errors.push("Inclua ao menos um item no pedido.");
  }

  const items = incomingItems.map((item) => normalizeConfiguredItem(item));
  const allIssues = items.flatMap((item) => item.validationIssues);
  const itemsSubtotalBrl = roundMoney(items.reduce((sum, item) => sum + item.totalPriceBrl, 0));
  const shippingQuote = await quoteShipping({
    items,
    shippingAddress,
    itemsSubtotalBrl
  });
  const commerce = calculateCommerceAdjustments({
    itemsSubtotalBrl,
    shippingAddress,
    couponCode: payload.couponCode,
    shippingQuote
  });
  if (commerce.discount.code && !commerce.discount.applied) {
    errors.push(commerce.discount.message || "Cupom inválido.");
  }
  const needsTechnicalReview = errors.length > 0 || allIssues.length > 0;
  const totalBrl = commerce.totalBrl;
  const leadTimeDays = Math.max(0, ...items.map((item) => Number(item.leadTimeDays || 0)));

  const draft = {
    id: crypto.randomUUID(),
    orderNumber: buildOrderNumber(now),
    source,
    customer,
    items,
    status: needsTechnicalReview
      ? ORDER_STATUS.NEEDS_TECHNICAL_REVIEW
      : ORDER_STATUS.PENDING_PAYMENT,
    paymentStatus: PAYMENT_STATUS.PENDING,
    totalBrl,
    leadTimeDays,
    notes: cleanText(payload.notes),
    technicalReview: needsTechnicalReview
      ? {
          status: "open",
          notes: [...errors, ...allIssues].join("\n"),
          payload
        }
      : null,
    validationErrors: errors,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  draft.metadata = {
    validationErrors: errors,
    shippingAddress,
    commerce,
    cad: buildInitialCadMetadata(draft)
  };

  return draft;
}

function buildSpecialRequestDraft(payload, customer, now) {
  const errors = validateCustomer(customer);
  const specialRequest = normalizeSpecialRequest(payload.specialRequest || payload);

  return {
    id: crypto.randomUUID(),
    orderNumber: buildOrderNumber(now),
    source: "special_request",
    customer,
    items: [],
    status: ORDER_STATUS.NEEDS_TECHNICAL_REVIEW,
    paymentStatus: PAYMENT_STATUS.PENDING,
    totalBrl: 0,
    leadTimeDays: 0,
    notes: cleanText(payload.notes || specialRequest.notes),
    technicalReview: {
      status: "open",
      notes: [
        ...errors,
        "Briefing especial aguardando avaliação técnica.",
        specialRequest.summary
      ]
        .filter(Boolean)
        .join("\n"),
      payload: specialRequest
    },
    validationErrors: errors,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

function normalizeConfiguredItem(item = {}) {
  const category = getCategoryBySlug(item.categorySlug);
  const format = category ? getFormat(category, item.formatSlug) : null;
  const validationIssues = [];

  if (!category) {
    validationIssues.push("Categoria não encontrada.");
  }

  if (!format) {
    validationIssues.push("Formato não encontrado.");
  }

  const values = format ? normalizeValues(format, item.values || {}) : item.values || {};
  const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
  const formatIssues = format ? validateConfiguration(format, values) : [];
  const priceBreakdown = format
    ? calculatePriceBreakdown(format, values, quantity)
    : { unitPriceBrl: 0, totalPriceBrl: 0 };
  const pricingIssues = priceBreakdown.pricingAvailable === false
    ? [priceBreakdown.pricingUnavailableReason]
    : [];
  const leadTimeDays = format ? calculateLeadTime(format, quantity) : 0;
  const sku = format ? buildConfigurationSku(format, values) : cleanText(item.sku);

  return {
    id: crypto.randomUUID(),
    categorySlug: category?.slug || cleanText(item.categorySlug),
    categoryName: category?.name || cleanText(item.categoryName),
    formatSlug: format?.slug || cleanText(item.formatSlug),
    formatName: format?.name || cleanText(item.formatName),
    sku,
    values,
    color: cleanText(item.color),
    finish: cleanText(item.finish),
    quantity,
    unitPriceBrl: roundMoney(priceBreakdown.unitPriceBrl),
    totalPriceBrl: roundMoney(priceBreakdown.totalPriceBrl),
    leadTimeDays,
    status: formatIssues.length || pricingIssues.length ? ORDER_STATUS.NEEDS_TECHNICAL_REVIEW : "valid",
    validationIssues: [...validationIssues, ...formatIssues, ...pricingIssues],
    priceBreakdown
  };
}

function normalizeValues(format, incomingValues) {
  const defaults = getInitialValues(format);

  return Object.fromEntries(
    format.parameters.map((parameter) => {
      const rawValue = incomingValues[parameter.key] ?? defaults[parameter.key] ?? "";
      return [parameter.key, rawValue === "" ? "" : Number(rawValue)];
    })
  );
}

function normalizeCustomer(customer = {}) {
  const name = cleanText(customer.name);
  const contact = cleanText(customer.contact);
  const email = cleanText(customer.email || inferEmail(contact));

  return {
    id: crypto.randomUUID(),
    name,
    contact,
    email
  };
}

function normalizeShippingAddress(address = {}) {
  return {
    postalCode: cleanText(address.postalCode),
    street: cleanText(address.street),
    number: cleanText(address.number),
    complement: cleanText(address.complement),
    district: cleanText(address.district),
    city: cleanText(address.city),
    state: cleanText(address.state).toUpperCase().slice(0, 2)
  };
}

function validateShippingAddress(address) {
  const errors = [];
  if (!address.postalCode) errors.push("Informe o CEP de entrega.");
  if (!address.street) errors.push("Informe o endereço de entrega.");
  if (!address.number) errors.push("Informe o número do endereço.");
  if (!address.city) errors.push("Informe a cidade de entrega.");
  if (address.state.length !== 2) errors.push("Informe a UF de entrega.");
  return errors;
}

function normalizeSpecialRequest(data = {}) {
  const result = {
    family: cleanText(data.family),
    familyName: cleanText(data.familyName),
    application: cleanText(data.application),
    dimensions: cleanText(data.dimensions),
    quantity: cleanText(data.quantity),
    color: cleanText(data.color),
    finish: cleanText(data.finish),
    notes: cleanText(data.notes)
  };

  return {
    ...result,
    summary: [
      `Família: ${result.familyName || result.family || "Não informada"}`,
      `Aplicação: ${result.application || "Não informada"}`,
      `Medidas: ${result.dimensions || "Não informadas"}`,
      `Quantidade: ${result.quantity || "Não informada"}`,
      `Cor: ${result.color || "Não informada"}`,
      `Acabamento: ${result.finish || "Não informado"}`,
      `Notas: ${result.notes || "Não informadas"}`
    ].join("\n")
  };
}

function validateCustomer(customer) {
  const errors = [];

  if (!customer.name) {
    errors.push("Informe o nome do cliente.");
  }

  if (!customer.contact) {
    errors.push("Informe um WhatsApp ou email de contato.");
  }

  return errors;
}

function buildOrderNumber(date) {
  const stamp = date
    .toISOString()
    .slice(2, 10)
    .replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();

  return `BF-${stamp}-${suffix}`;
}

function inferEmail(value) {
  return String(value || "").includes("@") ? value : "";
}

function cleanText(value) {
  return String(value || "").trim();
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

