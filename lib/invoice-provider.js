import { INVOICE_STATUS } from "@/lib/fulfillment";
import {
  getInvoiceConfig,
  INVOICE_PROVIDERS,
  isAutomatedInvoiceProvider,
  resolveCfop
} from "@/lib/invoice-config";
import { updateOrderFulfillmentState } from "@/lib/order-store";
import { PAYMENT_STATUS } from "@/lib/order-status";

const FOCUS_NFE_PRODUCTION_URL = "https://api.focusnfe.com.br";
const FOCUS_NFE_HOMOLOG_URL = "https://homologacao.focusnfe.com.br";

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
    const response = await focusNfeRequest("DELETE", `/v2/nfe/${encodeURIComponent(order.id)}`, {
      body: { justificativa: reason }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      const error = new Error(data?.mensagem || "Focus NFe rejeitou o cancelamento da NF-e.");
      error.code = data?.codigo || "focus_nfe_cancel_rejected";
      error.details = data;
      throw error;
    }

    const invoice = await fetchFocusNfeInvoice(order.id).catch(() => null);

    await updateOrderFulfillmentState(order.id, {
      eventType: "focus_nfe_invoice_cancelled",
      invoice: invoice || {
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
    const invoice = await fetchFocusNfeInvoice(order.id);

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
  if (!order?.id || order.paymentStatus !== PAYMENT_STATUS.APPROVED) return false;

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
  const response = await focusNfeRequest("POST", `/v2/nfe?ref=${encodeURIComponent(order.id)}`, {
    body: buildFocusNfePayload(order, config)
  });
  const data = await readJsonResponse(response);

  if (response.ok) {
    return normalizeFocusNfeInvoice(order.id, data);
  }

  // Referencia ja enviada anteriormente: consulta o estado atual em vez de falhar.
  if (response.status === 422) {
    const existing = await fetchFocusNfeInvoice(order.id).catch(() => null);
    if (existing) return existing;
  }

  const error = new Error(
    data?.mensagem || data?.message || "Focus NFe rejeitou a emissao da NF-e."
  );
  error.code = data?.codigo || "focus_nfe_rejected";
  error.details = data;
  throw error;
}

async function fetchFocusNfeInvoice(reference) {
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

  return normalizeFocusNfeInvoice(reference, data);
}

async function focusNfeRequest(method, path, { body } = {}) {
  const token = getFocusNfeToken();

  if (!token) {
    const error = new Error("FOCUS_NFE_TOKEN nao configurado.");
    error.code = "missing_focus_nfe_token";
    throw error;
  }

  return fetch(`${getFocusNfeBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

function buildFocusNfePayload(order, config) {
  const address = order.metadata?.shippingAddress || {};
  const commerce = order.metadata?.commerce || {};
  const document = getCustomerDocument(order);
  const cfop = resolveCfop(config, address.state);
  const items = buildFocusNfeItems(order, config, cfop);
  const productsTotal = roundMoney(items.reduce((sum, item) => sum + item.valor_bruto, 0));
  const shippingTotal = roundMoney(commerce.shipping?.amountBrl || 0);
  const discountTotal = roundMoney(commerce.discount?.amountBrl || 0);

  return {
    natureza_operacao: config.operationNature,
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    consumidor_final: 1,
    presenca_comprador: 2,
    cnpj_emitente: config.issuerCnpj,
    nome_destinatario: order.customer?.name || "Consumidor final",
    ...(document.length === 14
      ? { cnpj_destinatario: document }
      : { cpf_destinatario: document }),
    indicador_inscricao_estadual_destinatario: 9,
    logradouro_destinatario: address.street || "",
    numero_destinatario: address.number || "",
    ...(address.complement ? { complemento_destinatario: address.complement } : {}),
    bairro_destinatario: address.district || "",
    municipio_destinatario: address.city || "",
    uf_destinatario: String(address.state || "").toUpperCase().slice(0, 2),
    cep_destinatario: String(address.postalCode || "").replace(/\D/g, ""),
    modalidade_frete: shippingTotal > 0 ? 0 : 9,
    valor_frete: shippingTotal,
    ...(discountTotal > 0 ? { valor_desconto: discountTotal } : {}),
    valor_produtos: productsTotal,
    valor_total: roundMoney(order.totalBrl),
    items
  };
}

function buildFocusNfeItems(order, config, cfop) {
  const orderItems = Array.isArray(order.items) && order.items.length
    ? order.items
    : [buildFallbackOrderItem(order)];

  return orderItems.map((item, index) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const total = roundMoney(item.totalPriceBrl || 0);
    const unit = roundMoney(item.unitPriceBrl || (quantity ? total / quantity : total));

    return {
      numero_item: index + 1,
      codigo_produto: item.sku || item.id || `item-${index + 1}`,
      descricao: buildItemDescription(item),
      codigo_ncm: config.ncm.replace(/\D/g, ""),
      cfop,
      unidade_comercial: "UN",
      quantidade_comercial: quantity,
      valor_unitario_comercial: unit,
      unidade_tributavel: "UN",
      quantidade_tributavel: quantity,
      valor_unitario_tributavel: unit,
      valor_bruto: total,
      icms_origem: Number(config.productOrigin || 0),
      icms_situacao_tributaria: config.icmsCsosn,
      pis_situacao_tributaria: config.pisCst,
      cofins_situacao_tributaria: config.cofinsCst
    };
  });
}

function buildFallbackOrderItem(order) {
  const commerce = order.metadata?.commerce || {};
  const productsTotal = roundMoney(
    commerce.itemsSubtotalBrl ?? Math.max(0, Number(order.totalBrl || 0) - Number(commerce.shipping?.amountBrl || 0))
  );

  return {
    sku: order.orderNumber,
    formatName: `Pedido ${order.orderNumber}`,
    quantity: 1,
    unitPriceBrl: productsTotal,
    totalPriceBrl: productsTotal
  };
}

function normalizeFocusNfeInvoice(reference, data = {}) {
  const status = normalizeFocusNfeStatus(data.status);
  const baseUrl = getFocusNfeBaseUrl();

  return {
    status,
    mode: INVOICE_PROVIDERS.FOCUS_NFE,
    provider: INVOICE_PROVIDERS.FOCUS_NFE,
    providerId: cleanText(data.ref || reference),
    number: cleanText(data.numero),
    series: cleanText(data.serie),
    accessKey: cleanText(data.chave_nfe).replace(/\D/g, "").slice(-44),
    documentUrl: data.caminho_danfe ? `${baseUrl}${data.caminho_danfe}` : "",
    issuedAt: status === INVOICE_STATUS.API_ISSUED ? new Date().toISOString() : "",
    statusDetail: [cleanText(data.status_sefaz), cleanText(data.mensagem_sefaz)].filter(Boolean).join(" - "),
    notes: cleanText(data.mensagem)
  };
}

function normalizeFocusNfeStatus(status) {
  const normalized = cleanText(status).toLowerCase();

  if (normalized === "autorizado") return INVOICE_STATUS.API_ISSUED;
  if (normalized === "cancelado") return INVOICE_STATUS.CANCELLED;
  if (["erro_autorizacao", "denegado"].includes(normalized)) return INVOICE_STATUS.API_FAILED;

  return INVOICE_STATUS.API_PENDING;
}

function getFocusNfeBaseUrl() {
  const env = cleanText(process.env.FOCUS_NFE_ENV).toLowerCase();
  return ["producao", "production"].includes(env) ? FOCUS_NFE_PRODUCTION_URL : FOCUS_NFE_HOMOLOG_URL;
}

function getFocusNfeToken() {
  return cleanText(process.env.FOCUS_NFE_TOKEN);
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

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
