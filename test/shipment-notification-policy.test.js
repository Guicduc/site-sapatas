import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShipmentNotificationRecord,
  getShipmentEmailContext,
  getShipmentNotificationDecision,
  getShipmentNotificationErrorMessage,
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

test("confirmar entrega nao impede retry explicito de um aviso de envio pendente", () => {
  const notification = { status: SHIPMENT_NOTIFICATION_STATUS.FAILED };
  assert.deepEqual(getShipmentNotificationDecision(buildOrder({ status: "delivered", notification })), {
    shouldSend: true, reason: "retry_pending_notification"
  });
  assert.deepEqual(getShipmentNotificationDecision(buildOrder({
    status: "delivered", notification: { status: SHIPMENT_NOTIFICATION_STATUS.SENT, sentAt: "2026-11-12T12:00:00.000Z" }
  })), { shouldSend: false, reason: "already_sent" });
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

test("recusa deterministica bloqueia o aviso e orienta a correcao antes do retry", () => {
  for (const code of ["send_rejected", "resend_forbidden", "resend_domain_not_verified", "idempotency_conflict"]) {
    const result = code.startsWith("resend_")
      ? { sent: false, skipped: "send_rejected", reason: code }
      : { sent: false, skipped: code };
    const notification = buildShipmentNotificationRecord({}, result);
    assert.equal(notification.status, SHIPMENT_NOTIFICATION_STATUS.BLOCKED);
    assert.equal(notification.lastErrorCode, code);
    assert.match(getShipmentNotificationErrorMessage(notification), /bloqueado/);
    assert.equal(getShipmentNotificationDecision(buildOrder({ notification })).shouldSend, true);
  }
  // Existing records must also stop recommending an unchanged retry.
  assert.match(getShipmentNotificationErrorMessage({ status: "failed", lastErrorCode: "send_rejected" }), /sem corrigir a causa/);
  assert.match(getShipmentNotificationErrorMessage({ lastErrorCode: "resend_forbidden" }), /HTTP 403/);
});

test("falha de rede continua repetivel e detalhes livres nao sao persistidos", () => {
  const notification = buildShipmentNotificationRecord({}, {
    sent: false, skipped: "network_failed", reason: "cliente@example.com"
  });
  assert.equal(notification.status, SHIPMENT_NOTIFICATION_STATUS.FAILED);
  assert.equal(notification.lastErrorCode, "network_failed");
  assert.match(getShipmentNotificationErrorMessage(notification), /repetir a tentativa/);
  assert.equal(JSON.stringify(notification).includes("cliente@example.com"), false);
});
