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
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";

export function buildOrderDraft(payload = {}) {
  const now = new Date();
  const source = payload.source || "configurator";
  const customer = normalizeCustomer(payload.customer || payload);

  if (source === "special_request") {
    return buildSpecialRequestDraft(payload, customer, now);
  }

  const incomingItems = Array.isArray(payload.items) ? payload.items : [];
  const errors = validateCustomer(customer);

  if (!incomingItems.length) {
    errors.push("Inclua ao menos um item no pedido.");
  }

  const items = incomingItems.map((item) => normalizeConfiguredItem(item));
  const allIssues = items.flatMap((item) => item.validationIssues);
  const needsTechnicalReview = errors.length > 0 || allIssues.length > 0;
  const totalBrl = roundMoney(items.reduce((sum, item) => sum + item.totalPriceBrl, 0));
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
        "Briefing especial aguardando avaliacao tecnica.",
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
    validationIssues.push("Categoria nao encontrada.");
  }

  if (!format) {
    validationIssues.push("Formato nao encontrado.");
  }

  const values = format ? normalizeValues(format, item.values || {}) : item.values || {};
  const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
  const formatIssues = format ? validateConfiguration(format, values) : [];
  const priceBreakdown = format
    ? calculatePriceBreakdown(format, values, quantity)
    : { unitPriceBrl: 0, totalPriceBrl: 0 };
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
    status: formatIssues.length ? ORDER_STATUS.NEEDS_TECHNICAL_REVIEW : "valid",
    validationIssues: [...validationIssues, ...formatIssues],
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
      `Familia: ${result.familyName || result.family || "Nao informada"}`,
      `Aplicacao: ${result.application || "Nao informada"}`,
      `Medidas: ${result.dimensions || "Nao informadas"}`,
      `Quantidade: ${result.quantity || "Nao informada"}`,
      `Cor: ${result.color || "Nao informada"}`,
      `Acabamento: ${result.finish || "Nao informado"}`,
      `Notas: ${result.notes || "Nao informadas"}`
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
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `TB-${stamp}-${suffix}`;
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

