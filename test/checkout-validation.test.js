import assert from "node:assert/strict";
import test from "node:test";

import { clampCartQuantity, MAX_CART_ITEM_QUANTITY } from "../lib/client-cart.js";
import { calculateCommerceAdjustments } from "../lib/commerce-adjustments.js";
import { MAX_ITEM_QUANTITY } from "../lib/order-limits.js";
import { ORDER_STATUS } from "../lib/order-status.js";
import { buildOrderDraft } from "../lib/order-validation.js";

const originalShippingProvider = process.env.SHIPPING_PROVIDER;
process.env.SHIPPING_PROVIDER = "manual";

test.after(() => {
  if (originalShippingProvider === undefined) delete process.env.SHIPPING_PROVIDER;
  else process.env.SHIPPING_PROVIDER = originalShippingProvider;
});

function checkoutPayload(overrides = {}) {
  return {
    customer: {
      name: "Cliente Teste",
      email: "cliente@example.com",
      contact: "11999999999",
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
    items: [{
      id: "item-1",
      categorySlug: "sapata-base-lisa",
      formatSlug: "redonda",
      values: { diametro: 28, alturaBase: 6, pescoco: false },
      quantity: 4
    }],
    ...overrides
  };
}

function withAddress(changes) {
  const payload = checkoutPayload();
  return { ...payload, shippingAddress: { ...payload.shippingAddress, ...changes } };
}

test("pedido valido segue para pagamento", async () => {
  const draft = await buildOrderDraft(checkoutPayload());
  assert.equal(draft.status, ORDER_STATUS.PENDING_PAYMENT);
  assert.equal(draft.technicalReview, null);
});

test("bairro ausente e rejeitado com 422 sem gerar revisao tecnica", async () => {
  await assert.rejects(
    () => buildOrderDraft(withAddress({ district: "" })),
    { status: 422, code: "order_validation_failed", message: /bairro/ }
  );
});

test("nome e contato ausentes sao rejeitados com 422", async () => {
  const payload = checkoutPayload();
  await assert.rejects(
    () => buildOrderDraft({ ...payload, customer: { ...payload.customer, name: "", contact: "" } }),
    (error) => error.status === 422 && error.details.length === 2
  );
});

test("CPF/CNPJ invalido e rejeitado com 422", async () => {
  const payload = checkoutPayload();
  await assert.rejects(
    () => buildOrderDraft({ ...payload, customer: { ...payload.customer, document: "11111111111" } }),
    { status: 422 }
  );
});

test("cupom invalido e rejeitado com 422", async () => {
  await assert.rejects(
    () => buildOrderDraft(checkoutPayload({ couponCode: "NAOEXISTE" })),
    { status: 422, code: "invalid_coupon" }
  );
});

test("UF desconhecida ou divergente do CEP e rejeitada com 422", async () => {
  await assert.rejects(
    () => buildOrderDraft(withAddress({ state: "XX" })),
    { status: 422, message: /UF de entrega válida/ }
  );
  await assert.rejects(
    () => buildOrderDraft(withAddress({ state: "RJ" })),
    { status: 422, message: /pertence a SP/ }
  );
});

test("problemas de item continuam indo para revisao tecnica", async () => {
  const payload = checkoutPayload();
  const draft = await buildOrderDraft({
    ...payload,
    items: [{ ...payload.items[0], formatSlug: "formato-inexistente" }]
  });
  assert.equal(draft.status, ORDER_STATUS.NEEDS_TECHNICAL_REVIEW);
  assert.match(draft.technicalReview.notes, /Formato não encontrado/);
});

test("frete manual nao precifica UF fora da lista", () => {
  const unknown = calculateCommerceAdjustments({ itemsSubtotalBrl: 100, shippingAddress: { state: "XX" } });
  assert.equal(unknown.shipping.status, "pending_address");
  const known = calculateCommerceAdjustments({ itemsSubtotalBrl: 100, shippingAddress: { state: "ba" } });
  assert.equal(known.shipping.status, "estimated");
  assert.equal(known.shipping.state, "BA");
});

test("quantidade do carrinho e inteira entre 1 e o limite do servidor", () => {
  assert.equal(MAX_CART_ITEM_QUANTITY, MAX_ITEM_QUANTITY);
  assert.equal(clampCartQuantity("2.7"), 2);
  assert.equal(clampCartQuantity(0), 1);
  assert.equal(clampCartQuantity(-5), 1);
  assert.equal(clampCartQuantity(""), 1);
  assert.equal(clampCartQuantity("abc"), 1);
  assert.equal(clampCartQuantity(1e9), MAX_ITEM_QUANTITY);
  assert.equal(clampCartQuantity(Infinity), 1);
});
