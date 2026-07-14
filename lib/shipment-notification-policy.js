export const SHIPMENT_NOTIFICATION_STATUS = {
  SENT: "sent",
  FAILED: "failed",
  BLOCKED: "blocked"
};

const configurationBlockReasons = new Set([
  "missing_customer_email",
  "missing_resend_api_key",
  "missing_email_from"
]);

export function getShipmentNotificationDecision(order) {
  const shipment = order?.metadata?.fulfillment?.shipment || {};
  const notification = shipment.notification || {};

  if (shipment.status !== "shipped") {
    return { shouldSend: false, reason: "shipment_not_shipped" };
  }

  if (notification.status === SHIPMENT_NOTIFICATION_STATUS.SENT || notification.sentAt) {
    return { shouldSend: false, reason: "already_sent" };
  }

  return {
    shouldSend: true,
    reason: notification.status ? "retry_pending_notification" : "shipment_persisted_as_shipped"
  };
}

export function buildShipmentNotificationRecord(previous = {}, result = {}, now = new Date().toISOString()) {
  const attempts = Math.max(0, Number(previous.attempts || 0)) + 1;

  if (result.sent) {
    return {
      status: SHIPMENT_NOTIFICATION_STATUS.SENT,
      attempts,
      lastAttemptAt: now,
      sentAt: previous.sentAt || now,
      providerMessageId: cleanText(result.id, 160),
      lastErrorCode: ""
    };
  }

  const errorCode = cleanText(result.skipped || "send_failed", 80);
  return {
    status: configurationBlockReasons.has(errorCode)
      ? SHIPMENT_NOTIFICATION_STATUS.BLOCKED
      : SHIPMENT_NOTIFICATION_STATUS.FAILED,
    attempts,
    lastAttemptAt: now,
    sentAt: cleanText(previous.sentAt, 40),
    providerMessageId: cleanText(previous.providerMessageId, 160),
    lastErrorCode: errorCode
  };
}

export function getShipmentEmailContext(order) {
  const shipment = order?.metadata?.fulfillment?.shipment || {};
  const commerceShipping = order?.metadata?.commerce?.shipping || {};

  return {
    orderNumber: cleanText(order?.orderNumber, 80),
    carrier: cleanText(shipment.carrier || commerceShipping.companyName, 120),
    serviceName: cleanText(commerceShipping.serviceName, 120),
    trackingCode: cleanText(shipment.trackingCode, 160),
    shippedAt: cleanText(shipment.shippedAt, 40)
  };
}

export function getShipmentNotificationIdempotencyKey(order) {
  return `order-shipped-${cleanText(order?.id, 120)}`;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}
