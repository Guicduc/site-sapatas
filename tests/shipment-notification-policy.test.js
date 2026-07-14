import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShipmentNotificationRecord,
  getShipmentEmailContext,
  getShipmentNotificationDecision,
  getShipmentNotificationIdempotencyKey,
  SHIPMENT_NOTIFICATION_STATUS
} from "../lib/shipment-notification-policy.js";

function buildOrder(shipment = {}) {
  return {
    id: "order-123",
    orderNumber: "BF-123",
    customer: { email: "cliente@example.com" },
    metadata: {
      commerce: {
        shipping: { companyName: "Correios", serviceName: "PAC" }
      },
      fulfillment: {
        shipment: { status: "shipped", ...shipment }
      }
    }
  };
}

test("dispara somente depois que o status enviado foi persistido", () => {
  assert.deepEqual(
    getShipmentNotificationDecision(buildOrder({ status: "ready_for_pickup" })),
    { shouldSend: false, reason: "shipment_not_shipped" }
  );
  assert.deepEqual(
    getShipmentNotificationDecision(buildOrder()),
    { shouldSend: true, reason: "shipment_persisted_as_shipped" }
  );
});

test("nao envia novamente quando o pedido ja registra notificacao concluida", () => {
  const order = buildOrder({
    notification: { status: SHIPMENT_NOTIFICATION_STATUS.SENT, sentAt: "2026-07-13T12:00:00.000Z" }
  });

  assert.deepEqual(getShipmentNotificationDecision(order), {
    shouldSend: false,
    reason: "already_sent"
  });
  assert.equal(getShipmentNotificationIdempotencyKey(order), "order-shipped-order-123");
});

test("falha de configuracao fica bloqueada e pode ser tentada novamente", () => {
  const failedAt = "2026-07-13T12:00:00.000Z";
  const notification = buildShipmentNotificationRecord(
    {},
    { sent: false, skipped: "missing_resend_api_key", error: "nao deve ser persistido" },
    failedAt
  );

  assert.deepEqual(notification, {
    status: SHIPMENT_NOTIFICATION_STATUS.BLOCKED,
    attempts: 1,
    lastAttemptAt: failedAt,
    sentAt: "",
    providerMessageId: "",
    lastErrorCode: "missing_resend_api_key"
  });
  assert.equal(JSON.stringify(notification).includes("nao deve ser persistido"), false);
  assert.equal(
    getShipmentNotificationDecision(buildOrder({ notification })).reason,
    "retry_pending_notification"
  );
});

test("registra sucesso e inclui rastreio quando disponivel no contexto do email", () => {
  const sentAt = "2026-07-13T13:00:00.000Z";
  const notification = buildShipmentNotificationRecord({}, { sent: true, id: "email-456" }, sentAt);
  const context = getShipmentEmailContext(buildOrder({
    carrier: "Jadlog",
    trackingCode: "TRK123",
    shippedAt: sentAt
  }));

  assert.equal(notification.status, SHIPMENT_NOTIFICATION_STATUS.SENT);
  assert.equal(notification.providerMessageId, "email-456");
  assert.equal(context.carrier, "Jadlog");
  assert.equal(context.trackingCode, "TRK123");
  assert.equal(context.shippedAt, sentAt);
});
