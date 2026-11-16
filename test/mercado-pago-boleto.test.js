import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { toAccountOrder } from "../lib/account-view.js";
import { parseMercadoPagoPaymentPayload } from "../lib/commercial-contracts.js";
import { getPendingMercadoPagoBoleto } from "../lib/mercado-pago-boleto.js";
import { createOrder, recordMercadoPagoUpdate } from "../lib/order-store.js";
import { ORDER_STATUS } from "../lib/order-status.js";
import { buildPostPaymentOutboxEvents } from "../lib/outbox-store.js";

const ticketUrl = "https://www.mercadopago.com.br/payments/123/ticket?hash=test";
const rawPayment = {
  id: 123,
  status: "pending",
  payment_type_id: "ticket",
  transaction_amount: 42,
  currency_id: "BRL",
  date_of_expiration: "2026-11-20T23:59:59-03:00",
  transaction_details: { external_resource_url: ticketUrl },
  payer: { email: "private@example.com" }
};

function pendingOrder(raw = rawPayment) {
  return {
    status: ORDER_STATUS.PAYMENT_PENDING,
    paymentStatus: "pending",
    totalBrl: 42,
    payments: [{ provider: "mercado_pago", status: "pending", amountBrl: 42, raw }]
  };
}

test("customer projection exposes only the boleto link and expiration", () => {
  const order = toAccountOrder(pendingOrder());
  assert.deepEqual(order.boleto, { url: ticketUrl, expiresAt: "2026-11-21T02:59:59.000Z" });
  assert.equal(order.payments[0].raw, undefined);
  assert.equal(JSON.stringify(order).includes("private@example.com"), false);
  assert.deepEqual(getPendingMercadoPagoBoleto(pendingOrder(parseMercadoPagoPaymentPayload(rawPayment))), order.boleto);
});

test("paid, cancelled, superseded, mismatched and non-boleto payments have no payable boleto", () => {
  for (const status of [ORDER_STATUS.CANCELLED, ORDER_STATUS.NEEDS_TECHNICAL_REVIEW, ORDER_STATUS.PAID_READY_FOR_PRODUCTION]) {
    assert.equal(getPendingMercadoPagoBoleto({ ...pendingOrder(), status }), null);
  }
  for (const paymentStatus of ["approved", "refunded", "cancelled", "expired", "unknown"]) {
    assert.equal(getPendingMercadoPagoBoleto({ ...pendingOrder(), paymentStatus }), null);
  }
  for (const raw of [
    { ...rawPayment, status: "approved" },
    { ...rawPayment, payment_type_id: "bank_transfer" },
    { ...rawPayment, currency_id: "USD" }
  ]) assert.equal(getPendingMercadoPagoBoleto(pendingOrder(raw)), null);
  assert.equal(getPendingMercadoPagoBoleto({ ...pendingOrder(), totalBrl: 100 }), null);
  assert.equal(getPendingMercadoPagoBoleto({ ...pendingOrder(), demo: true }), null);
  const order = pendingOrder();
  order.payments.unshift({ provider: "mercado_pago", status: "rejected", amountBrl: 42 });
  assert.equal(getPendingMercadoPagoBoleto(order), null);
});

test("boleto links require HTTPS and an exact Mercado Pago hostname", () => {
  for (const url of [
    "javascript:alert(1)", "http://www.mercadopago.com.br/ticket", "https://mercadopago.com.br.evil.test/ticket",
    "https://evil.test/mercadopago.com.br", "https://mercadopago.com.br@evil.test/ticket",
    "https://user:password@www.mercadopago.com.br/ticket", "https://www.mercadopago.com.br:8443/ticket", "", null
  ]) {
    assert.equal(getPendingMercadoPagoBoleto(pendingOrder({ ...rawPayment, transaction_details: { external_resource_url: url } })), null, String(url));
  }
  assert.equal(getPendingMercadoPagoBoleto(pendingOrder({ ...rawPayment, transaction_details: null })), null);
  const globalUrl = "https://www.mercadopago.com/mlb/payments/ticket/helper?payment_id=123";
  assert.equal(getPendingMercadoPagoBoleto(pendingOrder({ ...rawPayment, transaction_details: { external_resource_url: globalUrl } })).url, globalUrl);
});

test("missing or malformed expiration is omitted; elapsed expiration remains explicit", () => {
  for (const date_of_expiration of [undefined, null, "not-a-date", 123]) {
    assert.equal(getPendingMercadoPagoBoleto(pendingOrder({ ...rawPayment, date_of_expiration })).expiresAt, null);
  }
  assert.equal(getPendingMercadoPagoBoleto(pendingOrder({ ...rawPayment, date_of_expiration: "2020-01-01T00:00:00Z" })).expiresAt, "2020-01-01T00:00:00.000Z");
});

test("persisted pending boleto remains unpaid until provider approval", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "baseforma-boleto-"));
  const originalDatabase = process.env.DATABASE_URL;
  const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
  process.env.DATABASE_URL = "";
  process.env.ORDER_STORE_LOCAL_PATH = path.join(directory, "orders.json");
  try {
    const created = await createOrder({
      id: crypto.randomUUID(), source: "test", status: ORDER_STATUS.PENDING_PAYMENT, paymentStatus: "pending",
      totalBrl: 42, customer: { name: "Cliente", email: "boleto@example.com" }, items: [], metadata: {}
    });
    const raw = parseMercadoPagoPaymentPayload({ ...rawPayment, external_reference: created.id });
    const update = (status) => recordMercadoPagoUpdate({
      orderId: created.id, paymentId: String(raw.id), status, amountBrl: 42, raw: { ...raw, status }
    });
    const pending = await update("pending");
    assert.equal(pending.paymentStatus, "pending");
    assert.equal(pending.status, ORDER_STATUS.PAYMENT_PENDING);
    assert.equal(toAccountOrder(pending).boleto.url, ticketUrl);
    assert.deepEqual(buildPostPaymentOutboxEvents({ orderId: pending.id, orderStatus: pending.status, paymentStatus: "pending", paymentId: "123" }), []);
    const approved = await update("approved");
    assert.equal(approved.paymentStatus, "approved");
    assert.equal(approved.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
    assert.equal(toAccountOrder(approved).boleto, null);
  } finally {
    if (originalDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabase;
    if (originalStorePath === undefined) delete process.env.ORDER_STORE_LOCAL_PATH;
    else process.env.ORDER_STORE_LOCAL_PATH = originalStorePath;
    await rm(directory, { recursive: true, force: true });
  }
});
