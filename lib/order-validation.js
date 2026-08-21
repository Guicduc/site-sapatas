import {
  buildConfigurationSku,
  calculateLeadTime,
  calculatePriceBreakdown,
  getCategoryBySlug,
  getFormat,
  getInitialValues,
  validateConfiguration
} from "./configurator-data.js";
import {
  getBrTaxDocumentValidationMessage,
  normalizeBrTaxDocument
} from "./br-tax-document.js";
import { calculateCommerceAdjustments } from "./commerce-adjustments.js";
import { assertOrderPayloadLimits, ORDER_TEXT_LIMITS } from "./order-limits.js";
import { ORDER_STATUS, PAYMENT_STATUS } from "./order-status.js";
import { quoteShipping } from "./shipping.js";
import { evaluatePromotion, publicPromotionResult } from "./promotion-policy.js";

export async function buildOrderDraft(payload = {}) {
  assertOrderPayloadLimits(payload);
  const now = new Date();
  const source = payload.source || "configurator";
  const customer = normalizeCustomer(payload.customer || payload);
  const shippingAddress = normalizeShippingAddress(payload.shippingAddress);
  const documentValidationMessage = getBrTaxDocumentValidationMessage(customer.document, {
    required: source !== "special_request"
  });

  if (documentValidationMessage) {
    throw new Error(documentValidationMessage);
  }

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
  const promotion = await evaluatePromotion({
    couponCode: payload.couponCode,
    subtotalBrl: itemsSubtotalBrl,
    shipping: shippingQuote,
    customer
  });
  const commerce = calculateCommerceAdjustments({
    itemsSubtotalBrl,
    shippingAddress,
    promotion: publicPromotionResult(promotion),
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
    notes: cleanText(payload.notes, ORDER_TEXT_LIMITS.notes),
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
    ...(promotion?.claim && promotion.applied ? { promotionClaim: promotion.claim } : {})
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
    notes: cleanText(payload.notes || specialRequest.notes, ORDER_TEXT_LIMITS.notes),
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
  const quantity = Number(item.quantity ?? 1);
  const formatIssues = format ? validateConfiguration(format, values) : [];
  const priceBreakdown = format
    ? calculatePriceBreakdown(format, values, quantity)
    : { unitPriceBrl: 0, totalPriceBrl: 0 };
  const pricingIssues = priceBreakdown.pricingAvailable === false
    ? [priceBreakdown.pricingUnavailableReason]
    : [];
  const leadTimeDays = format ? calculateLeadTime(format, quantity) : 0;
  const sku = format
    ? buildConfigurationSku(format, values, { color: cleanText(item.color) })
    : cleanText(item.sku);

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
  const name = cleanText(customer.name, ORDER_TEXT_LIMITS.customerName);
  const contact = cleanText(customer.contact, ORDER_TEXT_LIMITS.customerContact);
  const email = cleanText(customer.email || inferEmail(contact), ORDER_TEXT_LIMITS.customerEmail);
  const document = normalizeBrTaxDocument(customer.document);

  return {
    id: crypto.randomUUID(),
    name,
    contact,
    email,
    document
  };
}

function normalizeShippingAddress(address = {}) {
  return {
    postalCode: cleanText(address.postalCode, 16),
    street: cleanText(address.street, ORDER_TEXT_LIMITS.addressLine),
    number: cleanText(address.number, ORDER_TEXT_LIMITS.addressNumber),
    complement: cleanText(address.complement, ORDER_TEXT_LIMITS.addressComplement),
    district: cleanText(address.district, ORDER_TEXT_LIMITS.addressDistrict),
    city: cleanText(address.city, ORDER_TEXT_LIMITS.addressCity),
    state: cleanText(address.state).toUpperCase().slice(0, 2)
  };
}

function validateShippingAddress(address) {
  const errors = [];
  if (address.postalCode.replace(/\D/g, "").length !== 8) {
    errors.push("Informe um CEP de entrega válido com 8 dígitos.");
  }
  if (!address.street) errors.push("Informe o endereço de entrega.");
  if (!address.number) errors.push("Informe o número do endereço.");
  if (!address.district) errors.push("Informe o bairro de entrega.");
  if (!address.city) errors.push("Informe a cidade de entrega.");
  if (address.state.length !== 2) errors.push("Informe a UF de entrega.");
  return errors;
}

function normalizeSpecialRequest(data = {}) {
  const result = {
    family: cleanText(data.family, ORDER_TEXT_LIMITS.itemLabel),
    familyName: cleanText(data.familyName, ORDER_TEXT_LIMITS.itemLabel),
    application: cleanText(data.application, ORDER_TEXT_LIMITS.specialRequestField),
    dimensions: cleanText(data.dimensions, ORDER_TEXT_LIMITS.specialRequestField),
    quantity: cleanText(data.quantity, ORDER_TEXT_LIMITS.itemLabel),
    color: cleanText(data.color, ORDER_TEXT_LIMITS.itemOption),
    finish: cleanText(data.finish, ORDER_TEXT_LIMITS.itemOption),
    notes: cleanText(data.notes, ORDER_TEXT_LIMITS.specialRequestField)
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

function cleanText(value, maximum = ORDER_TEXT_LIMITS.itemLabel) {
  return String(value || "").trim().slice(0, maximum);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

