import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createOrder,
  consumeOrderCreationRateLimit,
  getOrCreatePendingMercadoPagoPayment,
  getOrderById,
  recordMercadoPagoUpdate,
  updateOrderFulfillmentState
} from "../lib/order-store.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
const localDirectory = await mkdtemp(path.join(os.tmpdir(), "baseforma-order-store-"));
process.env.DATABASE_URL = "";
process.env.ORDER_STORE_LOCAL_PATH = path.join(localDirectory, "orders.json");

test.after(async () => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorePath === undefined) delete process.env.ORDER_STORE_LOCAL_PATH;
  else process.env.ORDER_STORE_LOCAL_PATH = originalStorePath;
  await rm(localDirectory, { recursive: true, force: true });
});

test("preserva o documento do cliente no round-trip do pedido", async () => {
  const draft = buildDraft("document-round-trip");
  await createOrder(draft);

  const order = await getOrderById(draft.id);
  assert.equal(order.customer.document, "52998224725");
});

test("duas tentativas simultaneas criam uma unica preferencia pendente", async () => {
  const draft = buildDraft("duplicate-preference");
  await createOrder(draft);
  let providerCalls = 0;

  const createPendingPayment = async () => {
    providerCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return buildPayment(draft.id, "pref-only");
  };
  const [first, second] = await Promise.all([
    getOrCreatePendingMercadoPagoPayment(draft.id, createPendingPayment),
    getOrCreatePendingMercadoPagoPayment(draft.id, createPendingPayment)
  ]);

  assert.equal(providerCalls, 1);
  assert.equal(first.payment.id, second.payment.id);
  assert.deepEqual([first.reused, second.reused].sort(), [false, true]);
});

test("transicoes paralelas preservam metadados de pagamento e fulfillment", async () => {
  const draft = buildDraft("parallel-transitions");
  await createOrder(draft);

  await Promise.all([
    updateOrderFulfillmentState(draft.id, {
      eventType: "invoice_pending",
      invoice: { status: "api_pending", provider: "focus_nfe" }
    }),
    updateOrderFulfillmentState(draft.id, {
      eventType: "shipment_packing",
      shipment: { status: "packing", carrier: "Correios" }
    }),
    recordMercadoPagoUpdate({
      orderId: draft.id,
      preferenceId: "pref-parallel",
      paymentId: "payment-parallel",
      status: "approved",
      amountBrl: draft.totalBrl,
      raw: { id: "payment-parallel", status: "approved" }
    })
  ]);

  const order = await getOrderById(draft.id);
  assert.equal(order.paymentStatus, "approved");
  assert.equal(order.metadata.fulfillment.invoice.status, "api_pending");
  assert.equal(order.metadata.fulfillment.shipment.status, "packing");
  assert.equal(order.metadata.fulfillment.shipment.carrier, "Correios");
});

test("limite anônimo persiste entre tentativas locais", async () => {
  const key = "order-create:test-client";
  assert.equal(await consumeOrderCreationRateLimit(key, 2, 900), true);
  assert.equal(await consumeOrderCreationRateLimit(key, 2, 900), true);
  assert.equal(await consumeOrderCreationRateLimit(key, 2, 900), false);
});

test("Postgres devolve o documento persistido quando TEST_DATABASE_URL esta configurada", {
  skip: !process.env.TEST_DATABASE_URL
}, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const draft = buildDraft(`postgres-document-${crypto.randomUUID()}`);
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, ssl: false });

  try {
    await createOrder(draft);
    const order = await getOrderById(draft.id);
    assert.equal(order.customer.document, "52998224725");
  } finally {
    await pool.query("delete from orders where id = $1", [draft.id]);
    await pool.query("delete from customers where id = $1", [draft.customer.id]);
    await pool.end();
    process.env.DATABASE_URL = "";
  }
});

function buildDraft(suffix) {
  const now = new Date().toISOString();
  return {
    id: `order-${suffix}`,
    orderNumber: `BF-${suffix}`,
    source: "configurator",
    status: "pending_payment",
    paymentStatus: "pending",
    totalBrl: 42,
    leadTimeDays: 5,
    notes: "",
    customer: {
      id: `customer-${suffix}`,
      name: "Cliente Teste",
      contact: "cliente@example.com",
      email: "cliente@example.com",
      document: "52998224725"
    },
    items: [{
      id: `item-${suffix}`,
      categorySlug: "sapata-lisa",
      categoryName: "Sapata lisa",
      formatSlug: "redonda",
      formatName: "Redonda",
      sku: `SKU-${suffix}`,
      values: { diametro: 30 },
      color: "Preto",
      finish: "",
      quantity: 2,
      unitPriceBrl: 21,
      totalPriceBrl: 42,
      leadTimeDays: 5,
      status: "valid",
      validationIssues: [],
      priceBreakdown: { printMinutes: 10 }
    }],
    metadata: { commerce: { source: "test" } },
    createdAt: now,
    updatedAt: now
  };
}

function buildPayment(orderId, suffix) {
  const now = new Date().toISOString();
  return {
    id: `payment-${suffix}`,
    orderId,
    provider: "mercado_pago",
    providerPreferenceId: `preference-${suffix}`,
    providerPaymentId: null,
    status: "pending",
    checkoutUrl: `https://example.com/${suffix}`,
    amountBrl: 42,
    raw: { id: `preference-${suffix}` },
    createdAt: now,
    updatedAt: now
  };
}
