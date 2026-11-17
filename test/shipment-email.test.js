import assert from "node:assert/strict";
import test from "node:test";

import { buildFulfillmentMetadata, normalizeFulfillment } from "../lib/fulfillment.js";
import {
  buildShipmentNotificationRecord,
  getShipmentNotificationDecision,
  getShipmentNotificationErrorMessage
} from "../lib/shipment-notification-policy.js";
import { notifyOrderShipped } from "../lib/transactional-email.js";

function buildOrder(status = "shipped") {
  return {
    id: "order-shipment-test",
    orderNumber: "BF-TEST",
    status: "shipped",
    customer: { email: "customer@example.com" },
    metadata: { fulfillment: { shipment: {
      status, carrier: "Correios", trackingCode: "TEST123BR", shippedAt: "2026-11-16T12:00:00.000Z"
    } } }
  };
}

// Exercise the real renderer and HTTP adapter without sending customer email.
function mockResend(t, response) {
  for (const [key, value] of Object.entries({
    RESEND_API_KEY: "test-resend-key",
    TRANSACTIONAL_EMAIL_FROM: "Baseforma <test@example.com>"
  })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  t.mock.method(globalThis, "fetch", response);
  return t.mock.method(console, "warn", () => {});
}

test("HTTP 403 de producao vira bloqueio com motivo seguro, nao falha transitoria", async (t) => {
  const logs = mockResend(t, async () => new Response(JSON.stringify({
    name: "validation_error", message: "Forbidden for customer@example.com"
  }), { status: 403 }));
  const order = buildOrder();
  const result = await notifyOrderShipped(order);
  assert.deepEqual(result, { sent: false, skipped: "send_rejected", reason: "resend_forbidden" });

  order.metadata.fulfillment = buildFulfillmentMetadata(order, {
    shipment: { notification: buildShipmentNotificationRecord({}, result) }
  });
  const { shipment } = normalizeFulfillment(order);
  assert.equal(shipment.status, "shipped");
  assert.equal(shipment.notification.status, "blocked");
  assert.match(getShipmentNotificationErrorMessage(shipment.notification), /HTTP 403/);
  assert.equal(JSON.stringify(logs.mock.calls).includes("customer@example.com"), false);
  assert.equal(JSON.stringify(shipment.notification).includes("customer@example.com"), false);
});

test("restricoes conhecidas do Resend preservam o motivo sem armazenar a mensagem", async (t) => {
  const cases = [
    [403, "The example.com domain is not verified. Please verify it.", "resend_domain_not_verified"],
    [403, "Domain not verified: Verify send.example.com or update your from domain.", "resend_domain_not_verified"],
    [403, "You can only send testing emails to your own email address (owner@example.com).", "resend_testing_restricted"],
    [401, "API key is invalid", "resend_unauthorized"],
    [422, "Invalid to field customer@example.com", "resend_validation_failed"]
  ];
  for (const [status, message, reason] of cases) {
    await t.test(reason, async (t) => {
      const logs = mockResend(t, async () => new Response(JSON.stringify({ name: "validation_error", message }), { status }));
      const result = await notifyOrderShipped(buildOrder());
      assert.deepEqual(result, { sent: false, skipped: "send_rejected", reason });
      const notification = buildShipmentNotificationRecord({}, result);
      assert.equal(notification.status, "blocked");
      assert.equal(notification.lastErrorCode, reason);
      assert.equal(JSON.stringify(logs.mock.calls).includes(message), false);
    });
  }
});

test("aviso pendente pode ser reenviado depois da entrega e sucesso encerra o retry", async (t) => {
  const requests = [];
  mockResend(t, async (_url, init) => {
    requests.push(init);
    return new Response(JSON.stringify({ id: "email-shipped" }), { status: 200 });
  });
  const order = buildOrder("delivered");
  order.metadata.fulfillment.shipment.notification = { status: "blocked", attempts: 2, lastErrorCode: "send_rejected" };
  assert.equal(getShipmentNotificationDecision(order).shouldSend, true);
  const result = await notifyOrderShipped(order);
  assert.equal(result.sent, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers["Idempotency-Key"], "order-shipped-order-shipment-test");
  assert.match(JSON.parse(requests[0].body).html, /TEST123BR/);

  order.metadata.fulfillment = buildFulfillmentMetadata(order, { shipment: {
    notification: buildShipmentNotificationRecord(order.metadata.fulfillment.shipment.notification, result)
  } });
  const { shipment } = normalizeFulfillment(order);
  assert.equal(shipment.status, "delivered");
  assert.equal(shipment.notification.attempts, 3);
  assert.equal(shipment.notification.lastErrorCode, "");
  assert.equal(getShipmentNotificationDecision(order).reason, "already_sent");
});

test("estados anteriores a postagem nao fazem chamada ao Resend", async (t) => {
  mockResend(t, async () => { throw new Error("Unexpected send"); });
  for (const status of ["pending", "packing", "ready_for_pickup", "cancelled"]) {
    assert.deepEqual(await notifyOrderShipped(buildOrder(status)), { sent: false, skipped: "shipment_not_shipped" });
  }
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});
