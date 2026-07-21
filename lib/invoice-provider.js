import { INVOICE_STATUS } from "@/lib/fulfillment";
import {
  getInvoiceConfig,
  INVOICE_PROVIDERS,
  isAutomatedInvoiceProvider
} from "@/lib/invoice-config";
import {
  buildFocusNfePayload,
  buildFocusNfeReference,
  getFocusNfeBaseUrl,
  normalizeFocusNfeEnvironment
} from "@/lib/focus-nfe";
import { updateOrderFulfillmentState } from "@/lib/order-store";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";

export function getInvoiceProvider() {
  return getInvoiceConfig().provider;
}

export function hasAutomatedInvoiceProvider() {
  return isAutomatedInvoiceProvider(getInvoiceProvider());
}

export function hasMercadoPagoInvoiceEndpoint() {
  return Boolean(getMercadoPagoInvoiceEndpoint());
}

export function hasInvoiceApiCredentials(provider = getInvoiceProvider()) {
  if (provider === INVOICE_PROVIDERS.FOCUS_NFE) {
    return Boolean(getFocusNfeToken());
  }

  if (provider === INVOICE_PROVIDERS.MERCADO_PAGO) {
    return Boolean(
      getMercadoPagoInvoiceEndpoint() &&
      (process.env.MERCADO_PAGO_INVOICE_API_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN)
    );
  }

  return false;
}

export async function requestInvoiceAfterPayment(order, payment = {}) {
  if (!shouldRequestInvoice(order)) {
    return { requested: false, skipped: "invoice_not_required" };
  }

  const config = getInvoiceConfig();

  if (!isAutomatedInvoiceProvider(config.provider)) {
    return { requested: false, skipped: "invoice_provider_not_automated" };
  }

  if (!hasInvoiceApiCredentials(config.provider)) {
    await markInvoicePending(order, config.provider, buildMissingCredentialsNote(config.provider));
    return { requested: false, skipped: "invoice_credentials_missing" };
  }

  if (config.provider === INVOICE_PROVIDERS.FOCUS_NFE && !getCustomerDocument(order)) {
    await markInvoicePending(
      order,
      config.provider,
      "Pedido sem CPF/CNPJ do cliente; complete o documento para emitir a NF-e."
    );
    return { requested: false, skipped: "missing_customer_document" };
  }

  try {
    const invoice = config.provider === INVOICE_PROVIDERS.FOCUS_NFE
      ? await issueFocusNfeInvoice(order, config)
      : await issueMercadoPagoInvoice(order, payment);

    await updateOrderFulfillmentState(order.id, {
      eventType: `${config.provider}_invoice_requested`,
      invoice
    });

    return { requested: true, invoice };
  } catch (error) {
    await updateOrderFulfillmentState(order.id, {
      eventType: `${config.provider}_invoice_failed`,
      invoice: {
        status: INVOICE_STATUS.API_FAILED,
        mode: config.provider,
        provider: config.provider,
        statusDetail: error.code || "invoice_request_failed",
        notes: error.message || "Falha ao solicitar a emissao da nota fiscal."
      }
    });

    return {
      requested: false,
      error: error.code || "invoice_request_failed"
    };
  }
}

export function canCancelInvoice(order, config = getInvoiceConfig()) {
  const invoice = order?.metadata?.fulfillment?.invoice || {};

  return config.provider === INVOICE_PROVIDERS.FOCUS_NFE
    && hasInvoiceApiCredentials(config.provider)
    && invoice.status === INVOICE_STATUS.API_ISSUED
    && !isCancellationWindowExpired(invoice, config);
}

export async function cancelInvoice(order, justification) {
  const config = getInvoiceConfig();

  if (!canCancelInvoice(order, config)) {
    return { cancelled: false, error: "invoice_cancel_not_allowed" };
  }

  const reason = cleanText(justification);

  if (reason.length < 15 || reason.length > 255) {
    return { cancelled: false, error: "invalid_justification" };
  }

  try {
    const reference = getStoredFocusNfeReference(order);
    const response = await focusNfeRequest("DELETE", `/v2/nfe/${encodeURIComponent(reference)}`, {
      body: { justificativa: reason }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      const error = new Error(data?.mensagem || "Focus NFe rejeitou o cancelamento da NF-e.");
      error.code = data?.codigo || "focus_nfe_cancel_rejected";
      error.details = data;
      throw error;
    }

    await updateOrderFulfillmentState(order.id, {
      eventType: "focus_nfe_invoice_cancelled",
      // O DELETE da Focus e sincrono. Nao faca uma consulta imediata que pode
      // ainda devolver "autorizado" por consistencia eventual e sobrescrever
      // um cancelamento que ja foi confirmado pela SEFAZ.
      invoice: {
        status: INVOICE_STATUS.CANCELLED,
        mode: INVOICE_PROVIDERS.FOCUS_NFE,
        provider: INVOICE_PROVIDERS.FOCUS_NFE,
        notes: `NF-e cancelada: ${reason}`
      }
    });

    return { cancelled: true };
  } catch (error) {
    await updateOrderFulfillmentState(order.id, {
      eventType: "focus_nfe_invoice_cancel_failed",
      invoice: {
        statusDetail: error.code || "invoice_cancel_failed",
        notes: error.message || "Falha ao cancelar a NF-e."
      }
    });

    return { cancelled: false, error: error.code || "invoice_cancel_failed" };
  }
}

function isCancellationWindowExpired(invoice, config) {
  const issuedAt = Date.parse(invoice.issuedAt || invoice.updatedAt || "");
  if (!Number.isFinite(issuedAt)) return false;

  const windowMs = config.cancellationWindowDays * 24 * 60 * 60 * 1000;
  return Date.now() - issuedAt > windowMs;
}

export async function refreshInvoiceStatus(order) {
  const config = getInvoiceConfig();

  if (config.provider !== INVOICE_PROVIDERS.FOCUS_NFE) {
    return { refreshed: false, skipped: "status_refresh_not_supported" };
  }

  if (!hasInvoiceApiCredentials(config.provider)) {
    return { refreshed: false, skipped: "invoice_credentials_missing" };
  }

  try {
    const reference = getStoredFocusNfeReference(order);
    const invoice = await fetchFocusNfeInvoice(
      reference,
      order.metadata?.fulfillment?.invoice
    );

    if (!invoice) {
      return { refreshed: false, skipped: "invoice_not_found" };
    }

    await updateOrderFulfillmentState(order.id, {
      eventType: "focus_nfe_invoice_status_refreshed",
      invoice
    });

    return { refreshed: true, invoice };
  } catch (error) {
    return { refreshed: false, error: error.code || "invoice_status_refresh_failed" };
  }
}

function shouldRequestInvoice(order) {
  if (
    !order?.id
    || order.paymentStatus !== PAYMENT_STATUS.APPROVED
    || order.status === ORDER_STATUS.CANCELLED
    || order.metadata?.paymentReview
  ) {
    return false;
  }

  const status = order.metadata?.fulfillment?.invoice?.status;
  return ![
    INVOICE_STATUS.API_ISSUED,
    INVOICE_STATUS.MANUAL_ISSUED,
    INVOICE_STATUS.NOT_REQUIRED,
    INVOICE_STATUS.CANCELLED
  ].includes(status);
}

async function markInvoicePending(order, provider, notes) {
  await updateOrderFulfillmentState(order.id, {
    eventType: `${provider}_invoice_pending`,
    invoice: {
      status: INVOICE_STATUS.API_PENDING,
      mode: provider,
      provider,
      notes
    }
  });
}

function buildMissingCredentialsNote(provider) {
  if (provider === INVOICE_PROVIDERS.FOCUS_NFE) {
    return "FOCUS_NFE_TOKEN ainda nao configurado; NF-e aguardando credenciais do emissor.";
  }

  return "MERCADO_PAGO_INVOICE_API_URL ainda nao configurado.";
}

// --- Focus NFe -------------------------------------------------------------

async function issueFocusNfeInvoice(order, config) {
  const reference = buildFocusNfeReference(order.id);
  const response = await focusNfeRequest("POST", `/v2/nfe?ref=${encodeURIComponent(reference)}`, {
    body: buildFocusNfePayload(order, config)
  });
  const data = await readJsonResponse(response);

  if (response.ok) {
    return normalizeFocusNfeInvoice(reference, data);
  }

  // Referencia ja enviada anteriormente: consulta o estado atual em vez de falhar.
  if (response.status === 422) {
    const existing = await fetchFocusNfeInvoice(reference).catch(() => null);
    if (existing) return existing;
  }

  const error = new Error(
    data?.mensagem || data?.message || "Focus NFe rejeitou a emissao da NF-e."
  );
  error.code = data?.codigo || "focus_nfe_rejected";
  error.details = data;
  throw error;
}

async function fetchFocusNfeInvoice(reference, previousInvoice = {}) {
  const response = await focusNfeRequest("GET", `/v2/nfe/${encodeURIComponent(reference)}`);

  if (response.status === 404) {
    return null;
  }

  const data = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(data?.mensagem || "Nao foi possivel consultar a NF-e na Focus NFe.");
    error.code = data?.codigo || "focus_nfe_fetch_failed";
    error.details = data;
    throw error;
  }

  return normalizeFocusNfeInvoice(reference, data, previousInvoice);
}

async function focusNfeRequest(method, path, { body } = {}) {
  const token = getFocusNfeToken();
  const environment = normalizeFocusNfeEnvironment(process.env.FOCUS_NFE_ENV);

  if (!token) {
    const error = new Error("FOCUS_NFE_TOKEN nao configurado.");
    error.code = "missing_focus_nfe_token";
    throw error;
  }

  if (!environment) {
    const error = new Error("FOCUS_NFE_ENV deve ser homologacao ou producao.");
    error.code = "invalid_focus_nfe_environment";
    throw error;
  }

  return fetch(`${getFocusNfeBaseUrl(environment)}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

function normalizeFocusNfeInvoice(reference, data = {}, previousInvoice = {}) {
  const status = normalizeFocusNfeStatus(data.status);
  const baseUrl = getFocusNfeBaseUrl(process.env.FOCUS_NFE_ENV);

  return {
    status,
    mode: INVOICE_PROVIDERS.FOCUS_NFE,
    provider: INVOICE_PROVIDERS.FOCUS_NFE,
    providerId: cleanText(data.ref || reference),
    number: cleanText(data.numero),
    series: cleanText(data.serie),
    accessKey: cleanText(data.chave_nfe).replace(/\D/g, "").slice(-44),
    documentUrl: data.caminho_danfe ? `${baseUrl}${data.caminho_danfe}` : "",
    // A consulta de status nao informa a data de autorizacao de forma estavel.
    // Preserve a primeira data registrada para que o prazo de cancelamento nao
    // seja renovado a cada webhook ou atualizacao manual.
    issuedAt: cleanText(previousInvoice?.issuedAt)
      || (status === INVOICE_STATUS.API_ISSUED ? new Date().toISOString() : ""),
    statusDetail: [cleanText(data.status_sefaz), cleanText(data.mensagem_sefaz)].filter(Boolean).join(" - "),
    notes: buildFocusNfeNotes(data)
  };
}

function normalizeFocusNfeStatus(status) {
  const normalized = cleanText(status).toLowerCase();

  if (normalized === "autorizado") return INVOICE_STATUS.API_ISSUED;
  if (normalized === "cancelado") return INVOICE_STATUS.CANCELLED;
  if (["erro_autorizacao", "denegado"].includes(normalized)) return INVOICE_STATUS.API_FAILED;

  return INVOICE_STATUS.API_PENDING;
}

function getFocusNfeToken() {
  return cleanText(process.env.FOCUS_NFE_TOKEN);
}

function getStoredFocusNfeReference(order) {
  return cleanText(order?.metadata?.fulfillment?.invoice?.providerId)
    || buildFocusNfeReference(order?.id);
}

function buildFocusNfeNotes(data = {}) {
  const errors = Array.isArray(data.erros)
    ? data.erros.map((error) => [cleanText(error?.codigo), cleanText(error?.mensagem)].filter(Boolean).join(" - "))
    : [];

  return [cleanText(data.mensagem), ...errors].filter(Boolean).join("\n");
}

function getCustomerDocument(order) {
  return cleanText(order?.customer?.document).replace(/\D/g, "");
}

// --- Mercado Pago (endpoint generico, dormente) -----------------------------

async function issueMercadoPagoInvoice(order, payment) {
  const endpoint = getMercadoPagoInvoiceEndpoint();
  const token = process.env.MERCADO_PAGO_INVOICE_API_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildMercadoPagoInvoicePayload(order, payment))
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || "Mercado Pago rejeitou a emissao fiscal.");
    error.code = "mercado_pago_invoice_rejected";
    error.details = data;
    throw error;
  }

  return normalizeMercadoPagoInvoice(data);
}

function buildMercadoPagoInvoicePayload(order, payment) {
  const shippingAddress = order.metadata?.shippingAddress || {};

  return {
    external_reference: order.id,
    order_id: order.id,
    order_number: order.orderNumber,
    payment_id: payment.id || payment.providerPaymentId || order.payments?.[0]?.providerPaymentId || null,
    payment_status: order.paymentStatus,
    currency_id: "BRL",
    transaction_amount: Number(order.totalBrl || 0),
    customer: {
      name: order.customer?.name || "",
      email: order.customer?.email || "",
      phone: order.customer?.contact || "",
      document: order.customer?.document || ""
    },
    shipping_address: {
      zip_code: shippingAddress.postalCode || "",
      street_name: shippingAddress.street || "",
      street_number: shippingAddress.number || "",
      neighborhood: shippingAddress.district || "",
      city: shippingAddress.city || "",
      federal_unit: shippingAddress.state || "",
      complement: shippingAddress.complement || ""
    },
    items: (order.items || []).map((item) => ({
      id: item.sku || item.id,
      title: item.formatName || item.categoryName || item.sku || "Produto Baseforma",
      description: buildItemDescription(item),
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unitPriceBrl || 0),
      total_amount: Number(item.totalPriceBrl || 0),
      currency_id: "BRL"
    })),
    metadata: {
      source: "baseforma_checkout",
      commerce: order.metadata?.commerce || null
    }
  };
}

function normalizeMercadoPagoInvoice(invoice) {
  const status = normalizeMercadoPagoInvoiceStatus(invoice?.status || invoice?.state);

  return {
    status,
    mode: INVOICE_PROVIDERS.MERCADO_PAGO,
    provider: INVOICE_PROVIDERS.MERCADO_PAGO,
    providerId: cleanText(invoice?.id || invoice?.invoice_id || invoice?.uuid),
    number: cleanText(invoice?.number || invoice?.invoice_number || invoice?.nfe_number),
    series: cleanText(invoice?.series || invoice?.invoice_series || invoice?.nfe_series),
    accessKey: cleanText(invoice?.access_key || invoice?.accessKey || invoice?.nfe_key),
    documentUrl: cleanText(invoice?.document_url || invoice?.pdf_url || invoice?.danfe_url),
    issuedAt: cleanText(invoice?.issued_at || invoice?.issuedAt || invoice?.date_issued),
    statusDetail: cleanText(invoice?.status_detail || invoice?.statusDetail),
    notes: cleanText(invoice?.message || invoice?.description)
  };
}

function normalizeMercadoPagoInvoiceStatus(status) {
  const normalized = cleanText(status).toLowerCase();

  if (["issued", "authorized", "approved", "completed"].includes(normalized)) {
    return INVOICE_STATUS.API_ISSUED;
  }

  if (["failed", "rejected", "error", "cancelled"].includes(normalized)) {
    return INVOICE_STATUS.API_FAILED;
  }

  return INVOICE_STATUS.API_PENDING;
}

// --- Helpers ----------------------------------------------------------------

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildItemDescription(item) {
  const measures = Object.entries(item.values || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  return [item.formatName || item.categoryName, item.color, item.finish, measures]
    .filter(Boolean)
    .join(" | ") || item.sku || "Produto Baseforma";
}

function getMercadoPagoInvoiceEndpoint() {
  return String(process.env.MERCADO_PAGO_INVOICE_API_URL || "").trim();
}

function cleanText(value) {
  return String(value || "").trim();
}
