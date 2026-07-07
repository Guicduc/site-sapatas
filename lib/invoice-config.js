// Dados fiscais de referencia para conferencia da NF no admin.
// O provider de emissao (INVOICE_PROVIDER) e resolvido em lib/invoice-provider.js.
export function getInvoiceConfig() {
  return {
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
