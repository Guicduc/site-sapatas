import { createHmac, timingSafeEqual } from "node:crypto";

import { siteUrl } from "@/lib/site-data";

const preferenceEndpoint = "https://api.mercadopago.com/checkout/preferences";
const paymentsEndpoint = "https://api.mercadopago.com/v1/payments";

export function hasMercadoPagoCredentials() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

export function getMercadoPagoEnvironment() {
  return process.env.MERCADO_PAGO_ENV === "production" ? "production" : "sandbox";
}

export function getMercadoPagoCheckoutUrl(preference) {
  if (getMercadoPagoEnvironment() === "sandbox" && preference?.sandbox_init_point) {
    return preference.sandbox_init_point;
  }

  return preference?.init_point || preference?.sandbox_init_point || "";
}

export async function createMercadoPagoPreference(order) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    const error = new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
    error.code = "missing_mercado_pago_token";
    throw error;
  }

  const baseUrl = getPublicBaseUrl();
  const statementDescriptor = cleanStatementDescriptor(process.env.MERCADO_PAGO_STATEMENT_DESCRIPTOR);
  const response = await fetch(preferenceEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      external_reference: order.id,
      notification_url: `${baseUrl}/api/webhooks/mercado-pago`,
      back_urls: {
        success: `${baseUrl}/pedido-confirmado?orderId=${order.id}&payment=success`,
        failure: `${baseUrl}/carrinho?payment=failure`,
        pending: `${baseUrl}/pedido-confirmado?orderId=${order.id}&payment=pending`
      },
      auto_return: "approved",
      // Sem janela de expiracao na preferencia: o Checkout Pro esconde Pix e boleto
      // quando a validade e menor que o prazo de liquidacao desses meios, e uma
      // preferencia expirada/ainda-nao-vigente abre com o botao de pagar desabilitado.
      // O reuso de link pendente ja e limitado no app (preference/route.js).
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber
      },
      ...(statementDescriptor ? { statement_descriptor: statementDescriptor } : {}),
      payer: {
        name: order.customer?.name || undefined,
        email: order.customer?.email || undefined
      },
      items: buildPreferenceItems(order)
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.message || "Mercado Pago rejected the preference request.");
    error.code = "mercado_pago_preference_failed";
    error.details = data;
    throw error;
  }

  return data;
}

export async function fetchMercadoPagoPayment(paymentId) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    const error = new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
    error.code = "missing_mercado_pago_token";
    throw error;
  }

  const response = await fetch(`${paymentsEndpoint}/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.message || "Could not fetch Mercado Pago payment.");
    error.code = "mercado_pago_payment_fetch_failed";
    error.details = data;
    throw error;
  }

  return data;
}

export function mapMercadoPagoPaymentStatus(status) {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "expired":
      return "expired";
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "pending";
    default:
      return "unknown";
  }
}

export function verifyMercadoPagoSignature({ signatureHeader, requestId, dataId, secret }) {
  if (!secret) {
    return true;
  }

  const signature = parseSignatureHeader(signatureHeader);

  if (!signature.ts || !signature.v1) {
    return false;
  }

  const manifest = [
    dataId ? `id:${String(dataId).toLowerCase()};` : "",
    requestId ? `request-id:${requestId};` : "",
    `ts:${signature.ts};`
  ].join("");
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return safeCompare(expected, signature.v1);
}

function buildPreferenceItems(order) {
  const commerce = order.metadata?.commerce;
  const itemSubtotal = (order.items || []).reduce(
    (sum, item) => sum + Number(item.totalPriceBrl || 0),
    0
  );
  const hasAdjustments = commerce && Math.abs(Number(order.totalBrl || 0) - itemSubtotal) > 0.009;

  if (hasAdjustments) {
    return [
      {
        id: order.orderNumber,
        title: `Pedido ${order.orderNumber}`,
        description: "Produtos, frete e descontos Baseforma",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(order.totalBrl || 0)
      }
    ];
  }

  if (!order.items?.length) {
    return [
      {
        id: order.orderNumber,
        title: `Pedido ${order.orderNumber}`,
        description: "Pedido especial Baseforma",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(order.totalBrl || 0)
      }
    ];
  }

  return order.items.map((item) => ({
    id: item.sku || item.id,
    title: `${item.formatName || item.categoryName} - ${item.sku}`,
    description: buildItemDescription(item),
    quantity: Number(item.quantity || 1),
    currency_id: "BRL",
    unit_price: Number(item.unitPriceBrl || 0)
  }));
}

function buildItemDescription(item) {
  const measures = Object.entries(item.values || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  return [item.color, item.finish, measures].filter(Boolean).join(" | ");
}

function cleanStatementDescriptor(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, 13);
}

function getPublicBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return siteUrl.replace(/\/$/, "");
}

function parseSignatureHeader(value = "") {
  return Object.fromEntries(
    String(value)
      .split(",")
      .map((part) => part.trim().split("="))
      .filter(([key, item]) => key && item)
  );
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left), "hex");
  const rightBuffer = Buffer.from(String(right), "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
