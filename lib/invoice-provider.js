import { INVOICE_STATUS } from "@/lib/fulfillment";
import { updateOrderFulfillmentState } from "@/lib/order-store";
import { PAYMENT_STATUS } from "@/lib/order-status";

const PROVIDER_MERCADO_PAGO = "mercado_pago";

export function getInvoiceProvider() {
  return String(process.env.INVOICE_PROVIDER || "manual").trim().toLowerCase();
}

export function hasMercadoPagoInvoiceProvider() {
  return getInvoiceProvider() === PROVIDER_MERCADO_PAGO;
}

export function hasMercadoPagoInvoiceEndpoint() {
  return Boolean(getMercadoPagoInvoiceEndpoint());
}

export async function requestInvoiceAfterPayment(order, payment = {}) {
  if (!shouldRequestInvoice(order)) {
    return { requested: false, skipped: "invoice_not_required" };
  }

  if (!hasMercadoPagoInvoiceProvider()) {
    return { requested: false, skipped: "invoice_provider_disabled" };
  }

  if (!hasMercadoPagoInvoiceEndpoint()) {
    await markInvoicePending(order, "MERCADO_PAGO_INVOICE_API_URL ainda nao configurado.");
    return { requested: false, skipped: "mercado_pago_invoice_endpoint_missing" };
  }

  try {
    const invoice = await issueMercadoPagoInvoice(order, payment);
    await updateOrderFulfillmentState(order.id, {
      eventType: "mercado_pago_invoice_requested",
      invoice: normalizeIssuedInvoice(invoice)
    });

    return { requested: true, invoice };
  } catch (error) {
    await updateOrderFulfillmentState(order.id, {
      eventType: "mercado_pago_invoice_failed",
      invoice: {
        status: INVOICE_STATUS.API_FAILED,
        mode: PROVIDER_MERCADO_PAGO,
        provider: PROVIDER_MERCADO_PAGO,
        statusDetail: error.code || "mercado_pago_invoice_failed",
        notes: error.message || "Falha ao solicitar nota fiscal no Mercado Pago."
      }
    });

    return {
      requested: false,
      error: error.code || "mercado_pago_invoice_failed"
    };
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

async function markInvoicePending(order, notes) {
  await updateOrderFulfillmentState(order.id, {
    eventType: "mercado_pago_invoice_pending",
    invoice: {
      status: INVOICE_STATUS.API_PENDING,
      mode: PROVIDER_MERCADO_PAGO,
      provider: PROVIDER_MERCADO_PAGO,
      notes
    }
  });
}

async function issueMercadoPagoInvoice(order, payment) {
  const endpoint = getMercadoPagoInvoiceEndpoint();
  const token = process.env.MERCADO_PAGO_INVOICE_API_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token) {
    const error = new Error("Token da API fiscal Mercado Pago ausente.");
    error.code = "missing_mercado_pago_invoice_token";
    throw error;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildInvoicePayload(order, payment))
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || "Mercado Pago rejeitou a emissao fiscal.");
    error.code = "mercado_pago_invoice_rejected";
    error.details = data;
    throw error;
  }

  return data;
}

function buildInvoicePayload(order, payment) {
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
      phone: order.customer?.contact || ""
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

function normalizeIssuedInvoice(invoice) {
  const status = normalizeInvoiceStatus(invoice?.status || invoice?.state);

  return {
    status,
    mode: PROVIDER_MERCADO_PAGO,
    provider: PROVIDER_MERCADO_PAGO,
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

function normalizeInvoiceStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (["issued", "authorized", "approved", "completed"].includes(normalized)) {
    return INVOICE_STATUS.API_ISSUED;
  }

  if (["failed", "rejected", "error", "cancelled"].includes(normalized)) {
    return INVOICE_STATUS.API_FAILED;
  }

  return INVOICE_STATUS.API_PENDING;
}

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

  return [item.color, item.finish, measures].filter(Boolean).join(" | ");
}

function getMercadoPagoInvoiceEndpoint() {
  return String(process.env.MERCADO_PAGO_INVOICE_API_URL || "").trim();
}

function cleanText(value) {
  return String(value || "").trim();
}
