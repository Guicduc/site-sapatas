import assert from "node:assert/strict";
import test from "node:test";

import {
  assertOrderPayloadLimits,
  assertShippingPayloadLimits,
  MAX_ORDER_BODY_BYTES,
  MAX_ORDER_ITEMS,
  parseLimitedJsonRequest
} from "../lib/order-limits.js";
import { normalizeShippingItems } from "../lib/shipping.js";

test("rejeita corpo acima de 64 KB pelo header e pelo conteúdo real", async () => {
  const declared = new Request("https://example.com/api/orders", {
    method: "POST",
    headers: { "content-length": String(MAX_ORDER_BODY_BYTES + 1) },
    body: "{}"
  });
  await assert.rejects(() => parseLimitedJsonRequest(declared), { code: "request_body_too_large", status: 413 });

  const actual = new Request("https://example.com/api/orders", {
    method: "POST",
    body: JSON.stringify({ notes: "x".repeat(MAX_ORDER_BODY_BYTES) })
  });
  await assert.rejects(() => parseLimitedJsonRequest(actual), { code: "request_body_too_large", status: 413 });
});

test("rejeita linhas, quantidades e textos fora dos limites explícitos", () => {
  const tooManyItems = buildPayload(Array.from({ length: MAX_ORDER_ITEMS + 1 }, (_, index) => buildItem(index)));
  assert.throws(() => assertOrderPayloadLimits(tooManyItems), { code: "too_many_order_items" });

  const excessiveQuantity = buildPayload([{ ...buildItem(1), quantity: 1000 }]);
  assert.throws(() => assertOrderPayloadLimits(excessiveQuantity), { code: "invalid_item_quantity" });

  const excessiveText = buildPayload([buildItem(1)]);
  excessiveText.customer.name = "x".repeat(121);
  assert.throws(() => assertOrderPayloadLimits(excessiveText), { code: "text_field_too_long" });
});

test("pedido e Melhor Envio aceitam as mesmas 30 linhas sem truncar", () => {
  const items = Array.from({ length: MAX_ORDER_ITEMS }, (_, index) => buildItem(index));
  const payload = buildPayload(items);

  assert.doesNotThrow(() => assertOrderPayloadLimits(payload));
  assert.doesNotThrow(() => assertShippingPayloadLimits(payload));
  assert.equal(normalizeShippingItems(items).length, MAX_ORDER_ITEMS);
  assert.throws(
    () => normalizeShippingItems([...items, buildItem(MAX_ORDER_ITEMS)]),
    { code: "too_many_order_items" }
  );
});

function buildPayload(items) {
  return {
    customer: {
      name: "Cliente",
      contact: "cliente@example.com",
      email: "cliente@example.com",
      document: "52998224725"
    },
    shippingAddress: {
      postalCode: "01001000",
      street: "Praça da Sé",
      number: "1",
      district: "Sé",
      city: "São Paulo",
      state: "SP"
    },
    items
  };
}

function buildItem(index) {
  return {
    id: `item-${index}`,
    categorySlug: "sapata-base-lisa",
    formatSlug: "redonda",
    values: { diametro: 28, alturaBase: 6 },
    quantity: 1
  };
}
