export const INVOICE_PROVIDERS = {
  MANUAL: "manual",
  MERCADO_PAGO_SYSTEM: "mercado_pago_system",
  MERCADO_PAGO: "mercado_pago",
  FOCUS_NFE: "focus_nfe"
};

const PROVIDER_LABELS = {
  [INVOICE_PROVIDERS.MANUAL]: "Manual",
  [INVOICE_PROVIDERS.MERCADO_PAGO_SYSTEM]: "Mercado Pago Sistema de Gestao",
  [INVOICE_PROVIDERS.MERCADO_PAGO]: "Mercado Pago (API fiscal)",
  [INVOICE_PROVIDERS.FOCUS_NFE]: "Focus NFe"
};

const AUTOMATED_PROVIDERS = [INVOICE_PROVIDERS.MERCADO_PAGO, INVOICE_PROVIDERS.FOCUS_NFE];

export function getInvoiceConfig() {
  const provider = normalizeInvoiceProvider(process.env.INVOICE_PROVIDER);

  return {
    provider,
    providerLabel: PROVIDER_LABELS[provider] || provider,
    issuerCnpj: onlyDigits(process.env.INVOICE_ISSUER_CNPJ || "42616830000198"),
    issuerUf: cleanText(process.env.INVOICE_ISSUER_UF || "SP").toUpperCase().slice(0, 2),
    documentModel: cleanText(process.env.INVOICE_DOCUMENT_MODEL || "nfe").toLowerCase(),
    environment: cleanText(process.env.INVOICE_ENV || "production").toLowerCase(),
    operationNature: cleanText(process.env.INVOICE_OPERATION_NATURE || "Venda de producao propria"),
    cfop: cleanText(process.env.INVOICE_CFOP),
    cfopIntrastate: cleanText(process.env.INVOICE_CFOP_INTRASTATE || "5101"),
    cfopInterstate: cleanText(process.env.INVOICE_CFOP_INTERSTATE || "6107"),
    ncm: cleanText(process.env.INVOICE_NCM || "3926.30.00"),
    productOrigin: cleanText(process.env.INVOICE_PRODUCT_ORIGIN || "0"),
    icmsCsosn: cleanText(process.env.INVOICE_ICMS_CSOSN || "102"),
    pisCst: cleanText(process.env.INVOICE_PIS_CST || "49"),
    cofinsCst: cleanText(process.env.INVOICE_COFINS_CST || "49"),
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
  return AUTOMATED_PROVIDERS.includes(normalizeInvoiceProvider(provider));
}

export function resolveCfop(config, destinationUf) {
  if (config.cfop) return config.cfop;
  const uf = cleanText(destinationUf).toUpperCase().slice(0, 2);
  return uf && uf !== config.issuerUf ? config.cfopInterstate : config.cfopIntrastate;
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
