import assert from "node:assert/strict";
import test from "node:test";

import {
  createMercadoPagoPreference,
  getMercadoPagoPreferenceIdempotencyKey,
  isMercadoPagoWebhookConfigured,
  verifyMercadoPagoSignature
} from "../lib/mercado-pago.js";

test("webhook falha fechado em produção quando o segredo não existe", () => {
  assert.equal(verifyMercadoPagoSignature({ secret: "", nodeEnv: "production" }), false);
  assert.equal(isMercadoPagoWebhookConfigured({ secret: "", nodeEnv: "production" }), false);
  assert.equal(verifyMercadoPagoSignature({ secret: "", nodeEnv: "test" }), true);
});

test("preferência usa chave de idempotência estável por pedido", async () => {
  const originalToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalFetch = globalThis.fetch;
  const order = {
    id: "order-idempotent",
    orderNumber: "BF-IDEMPOTENT",
    totalBrl: 42,
    customer: { name: "Cliente", email: "cliente@example.com" },
    items: [{ id: "item-1", sku: "SKU-1", formatName: "Redonda", quantity: 1, unitPriceBrl: 42, totalPriceBrl: 42 }],
    metadata: {}
  };
  const headers = [];
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "test-token";
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.baseforma.com.br";
  globalThis.fetch = async (_url, options) => {
    headers.push(options.headers);
    return new Response(JSON.stringify({ id: "preference-1", init_point: "https://example.com/checkout" }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    await createMercadoPagoPreference(order);
    await createMercadoPagoPreference(order);
    const expected = getMercadoPagoPreferenceIdempotencyKey(order);
    assert.equal(headers[0]["X-Idempotency-Key"], expected);
    assert.equal(headers[1]["X-Idempotency-Key"], expected);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    else process.env.MERCADO_PAGO_ACCESS_TOKEN = originalToken;
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});
