import { createHmac, timingSafeEqual } from "node:crypto";

import { siteUrl } from "@/lib/site-data";

const defaultApiVersion = "2026-04";

export function hasShopifyCredentials() {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
}

export async function createShopifyDraftOrder(order) {
  if (!hasShopifyCredentials()) {
    const error = new Error("SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN must be configured.");
    error.code = "missing_shopify_credentials";
    throw error;
  }

  const response = await shopifyGraphql(
    `mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
          invoiceUrl
          status
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: buildDraftOrderInput(order)
    }
  );

  const payload = response?.draftOrderCreate;
  const errors = payload?.userErrors || [];

  if (errors.length) {
    const error = new Error(errors.map((item) => item.message).join(" "));
    error.code = "shopify_draft_order_rejected";
    error.details = errors;
    throw error;
  }

  if (!payload?.draftOrder?.invoiceUrl) {
    const error = new Error("Shopify did not return a draft order checkout link.");
    error.code = "missing_shopify_invoice_url";
    error.details = payload;
    throw error;
  }

  return payload.draftOrder;
}

export function verifyShopifyWebhook(rawBody, hmacHeader, secret = process.env.SHOPIFY_WEBHOOK_SECRET) {
  if (!secret) {
    return true;
  }

  if (!hmacHeader) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return safeCompare(expected, hmacHeader);
}

export function mapShopifyFinancialStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "paid":
    case "authorized":
    case "partially_paid":
      return "approved";
    case "voided":
    case "refunded":
    case "partially_refunded":
      return "refunded";
    case "expired":
      return "expired";
    case "pending":
      return "pending";
    default:
      return "unknown";
  }
}

export function getTracoOrderIdFromShopifyOrder(payload = {}) {
  const attributes = Array.isArray(payload.note_attributes) ? payload.note_attributes : [];
  const orderIdAttribute = attributes.find((item) => {
    return ["traco_base_order_id", "order_id"].includes(String(item.name || item.key || "").toLowerCase());
  });

  return orderIdAttribute?.value || payload?.metadata?.traco_base_order_id || null;
}

function buildDraftOrderInput(order) {
  const baseUrl = getPublicBaseUrl();
  const attributes = [
    { key: "traco_base_order_id", value: order.id },
    { key: "traco_base_order_number", value: order.orderNumber },
    { key: "origem", value: "site-configurador" }
  ];
  const customerEmail = order.customer?.email || undefined;

  return {
    email: customerEmail,
    note: buildDraftOrderNote(order),
    tags: ["traco-base", "mvp", "site-configurador"],
    customAttributes: attributes,
    allowDiscountCodesInCheckout: false,
    lineItems: buildLineItems(order),
    metafields: [
      {
        namespace: "traco_base",
        key: "local_order_id",
        type: "single_line_text_field",
        value: order.id
      },
      {
        namespace: "traco_base",
        key: "local_order_url",
        type: "url",
        value: `${baseUrl}/pedido-confirmado?orderId=${order.id}`
      }
    ]
  };
}

function buildLineItems(order) {
  if (!order.items?.length) {
    return [
      {
        title: `Pedido especial ${order.orderNumber}`,
        quantity: 1,
        requiresShipping: true,
        taxable: false,
        originalUnitPriceWithCurrency: {
          amount: String(Number(order.totalBrl || 0).toFixed(2)),
          currencyCode: "BRL"
        },
        customAttributes: [{ key: "tipo", value: "Projeto especial" }]
      }
    ];
  }

  return order.items.map((item) => ({
    title: `${item.formatName || item.categoryName} - ${item.sku}`,
    sku: item.sku || item.id,
    quantity: Number(item.quantity || 1),
    requiresShipping: true,
    taxable: false,
    originalUnitPriceWithCurrency: {
      amount: String(Number(item.unitPriceBrl || 0).toFixed(2)),
      currencyCode: "BRL"
    },
    customAttributes: buildItemAttributes(item)
  }));
}

function buildItemAttributes(item) {
  const measureAttributes = Object.entries(item.values || {}).map(([key, value]) => ({
    key: `medida_${key}`,
    value: `${value} mm`
  }));

  return [
    { key: "categoria", value: item.categoryName || item.categorySlug || "" },
    { key: "formato", value: item.formatName || item.formatSlug || "" },
    { key: "cor", value: item.color || "" },
    { key: "acabamento", value: item.finish || "" },
    ...measureAttributes
  ].filter((item) => item.value !== "");
}

function buildDraftOrderNote(order) {
  const lines = [
    `Pedido local: ${order.orderNumber}`,
    `Cliente: ${order.customer?.name || ""}`,
    `Contato: ${order.customer?.contact || ""}`,
    `Prazo estimado: ${order.leadTimeDays || 0} dias`,
    order.notes ? `Notas: ${order.notes}` : ""
  ];

  return lines.filter(Boolean).join("\n");
}

async function shopifyGraphql(query, variables) {
  const storeDomain = normalizeStoreDomain(process.env.SHOPIFY_STORE_DOMAIN);
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || defaultApiVersion;
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    const error = new Error(payload.errors?.[0]?.message || "Shopify Admin API request failed.");
    error.code = "shopify_admin_api_failed";
    error.details = payload;
    throw error;
  }

  return payload.data;
}

function normalizeStoreDomain(value = "") {
  return String(value)
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();
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

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
