export const INVOICE_PROVIDERS = {
  MANUAL: "manual",
  MERCADO_PAGO_SYSTEM: "mercado_pago_system",
  MERCADO_PAGO: "mercado_pago"
};

const PROVIDER_LABELS = {
  [INVOICE_PROVIDERS.MANUAL]: "Manual",
  [INVOICE_PROVIDERS.MERCADO_PAGO_SYSTEM]: "Mercado Pago Sistema de Gestao",
  [INVOICE_PROVIDERS.MERCADO_PAGO]: "Mercado Pago (API fiscal)"
};

export function getInvoiceConfig() {
  const provider = normalizeInvoiceProvider(process.env.INVOICE_PROVIDER);

  return {
    provider,
    providerLabel: PROVIDER_LABELS[provider] || provider,
    issuerCnpj: onlyDigits(process.env.INVOICE_ISSUER_CNPJ || "42616830000198"),
    documentModel: cleanText(process.env.INVOICE_DOCUMENT_MODEL || "nfe").toLowerCase(),
    environment: cleanText(process.env.INVOICE_ENV || "production").toLowerCase(),
    operationNature: cleanText(process.env.INVOICE_OPERATION_NATURE || "Venda de producao propria"),
    cfop: cleanText(process.env.INVOICE_CFOP),
    ncm: cleanText(process.env.INVOICE_NCM || "3926.30.00"),
    productOrigin: cleanText(process.env.INVOICE_PRODUCT_ORIGIN || "0"),
    cancellationWindowDays: positiveInteger(process.env.INVOICE_CANCEL_WINDOW_DAYS, 7)
  };
}

export function normalizeInvoiceProvider(value) {
  const provider = cleanText(value || INVOICE_PROVIDERS.MANUAL).toLowerCase();
  return Object.values(INVOICE_PROVIDERS).includes(provider) ? provider : provider || INVOICE_PROVIDERS.MANUAL;
}

export function isSupportedInvoiceProvider(provider) {
  return Object.values(INVOICE_PROVIDERS).includes(normalizeInvoiceProvider(provider));
}

export function isAutomatedInvoiceProvider(provider) {
  return normalizeInvoiceProvider(provider) === INVOICE_PROVIDERS.MERCADO_PAGO;
}

function onlyDigits(value) {
  return cleanText(value).replace(/\D/g, "");
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanText(value) {
  return String(value || "").trim();
}
