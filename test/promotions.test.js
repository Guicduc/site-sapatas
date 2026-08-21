import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildOrderDraft } from "../lib/order-validation.js";
import { createOrder, recordMercadoPagoUpdate } from "../lib/order-store.js";
import { evaluatePromotion } from "../lib/promotion-policy.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
const originalPromotionSecret = process.env.PROMOTION_IDENTITY_SECRET;
const localDirectory = await mkdtemp(path.join(os.tmpdir(), "baseforma-promotions-"));
process.env.DATABASE_URL = "";
process.env.ORDER_STORE_LOCAL_PATH = path.join(localDirectory, "orders.json");
process.env.PROMOTION_IDENTITY_SECRET = "test-only-promotion-secret";

test.after(async () => {
  restoreEnvironment("DATABASE_URL", originalDatabaseUrl);
  restoreEnvironment("ORDER_STORE_LOCAL_PATH", originalStorePath);
  restoreEnvironment("PROMOTION_IDENTITY_SECRET", originalPromotionSecret);
  await rm(localDirectory, { recursive: true, force: true });
});

test("the client pricing path contains no private promotion markers", async () => {
  const clientSource = await readFile(new URL("../components/cart-page.jsx", import.meta.url), "utf8");
  const publicCommerceSource = await readFile(new URL("../lib/commerce-adjustments.js", import.meta.url), "utf8");
  const browserReachableSource = `${clientSource}\n${publicCommerceSource}`;

  assert.doesNotMatch(browserReachableSource, /PRIMEIRO15|AF951F412D|minimumSubtotalBrl|maxDiscountBrl/);
  assert.doesNotMatch(clientSource, /promotion-policy/);
});

test("a restricted promotion can be reserved by only one concurrent order", async () => {
  const customer = testCustomer();
  const promotion = await evaluatePromotion({
    couponCode: "PRIMEIRO15",
    subtotalBrl: 200,
    shipping: { status: "estimated" },
    customer
  });
  assert.equal(promotion.applied, true);

  const results = await Promise.allSettled([
    createOrder(testDraft("promotion-race-a", customer, promotion.claim)),
    createOrder(testDraft("promotion-race-b", customer, promotion.claim))
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), ["fulfilled", "rejected"]);
  const rejected = results.find((result) => result.status === "rejected");
  assert.equal(rejected.reason.code, "promotion_not_eligible");

  const successful = results.find((result) => result.status === "fulfilled").value;
  await recordMercadoPagoUpdate({
    orderId: successful.id,
    paymentId: "payment-promotion-success",
    status: "approved",
    amountBrl: successful.totalBrl,
    raw: {}
  });
  const repeated = await evaluatePromotion({
    couponCode: "PRIMEIRO15",
    subtotalBrl: 200,
    shipping: { status: "estimated" },
    customer
  });
  assert.equal(repeated.applied, false);
  assert.equal(repeated.message, "Este cupom não pode ser aplicado a este pedido.");
});

test("order validation ignores browser totals and recalculates the final charge", async () => {
  const draft = await buildOrderDraft({
    ...checkoutPayload(),
    totalBrl: 0.01,
    commerce: { totalBrl: 0.01, discount: { applied: true, amountBrl: 9999 } },
    promotion: { applied: true, amountBrl: 9999 }
  });

  assert.notEqual(draft.totalBrl, 0.01);
  assert.equal(draft.totalBrl, draft.metadata.commerce.totalBrl);
  assert.equal(draft.metadata.commerce.discount.applied, false);
  assert.equal(draft.metadata.commerce.totalBrl, draft.metadata.commerce.itemsSubtotalBrl + draft.metadata.commerce.shipping.amountBrl);
});

function testCustomer() {
  return { id: "customer-promotion", name: "Cliente", email: "cliente@example.com", contact: "11999999999", document: "52998224725" };
}

function testDraft(suffix, customer, promotionClaim) {
  const now = new Date().toISOString();
  return {
    id: `order-${suffix}`,
    orderNumber: `BF-${suffix}`,
    source: "configurator",
    status: "pending_payment",
    paymentStatus: "pending",
    totalBrl: 170,
    leadTimeDays: 4,
    notes: "",
    customer: { ...customer, id: `customer-${suffix}` },
    items: [],
    metadata: { commerce: { totalBrl: 170 }, promotionClaim },
    createdAt: now,
    updatedAt: now
  };
}

function checkoutPayload() {
  return {
    customer: testCustomer(),
    shippingAddress: { postalCode: "01001000", street: "Praça da Sé", number: "1", district: "Sé", city: "São Paulo", state: "SP" },
    items: [{ id: "item-1", categorySlug: "sapata-base-lisa", formatSlug: "redonda", values: { diametro: 28, alturaBase: 6, pescoco: false }, quantity: 4 }]
  };
}

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
