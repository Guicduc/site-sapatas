export const SHIPMENT_NOTIFICATION_STATUS = {
  SENT: "sent",
  FAILED: "failed",
  BLOCKED: "blocked"
};

const configurationBlockReasons = new Set([
  "missing_customer_email",
  "missing_resend_api_key",
  "missing_email_from",
  "send_rejected",
  "idempotency_conflict",
  "resend_unauthorized",
  "resend_forbidden",
  "resend_testing_restricted",
  "resend_domain_not_verified",
  "resend_validation_failed"
]);

export function getShipmentNotificationDecision(order) {
  const shipment = order?.metadata?.fulfillment?.shipment || {};
  const notification = shipment.notification || {};

  // A manual retry remains available after delivery has been recorded.
  if (!["shipped", "delivered"].includes(shipment.status)) {
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

  const errorCode = cleanText(
    configurationBlockReasons.has(result.reason) ? result.reason : result.skipped || "send_failed",
    80
  );
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

export function getShipmentNotificationErrorMessage(notification = {}) {
  const messages = {
    missing_customer_email: "O pedido não tem e-mail do cliente. Corrija o cadastro e salve a expedição novamente.",
    missing_resend_api_key: "RESEND_API_KEY não está configurada. Configure o provedor e salve a expedição novamente.",
    missing_email_from: "TRANSACTIONAL_EMAIL_FROM ou ACCOUNT_EMAIL_FROM não está configurado. Configure o remetente e salve a expedição novamente.",
    resend_unauthorized: "O Resend recusou a credencial de envio. Confira RESEND_API_KEY antes de salvar novamente.",
    resend_forbidden: "O Resend bloqueou o envio (HTTP 403). Confira no Resend o domínio do remetente, as restrições de teste e as permissões da chave antes de salvar novamente.",
    resend_testing_restricted: "O Resend está permitindo apenas e-mails de teste. Verifique um domínio no Resend e configure um remetente desse domínio antes de salvar novamente.",
    resend_domain_not_verified: "O domínio do remetente não está verificado no Resend. Verifique o domínio e confira TRANSACTIONAL_EMAIL_FROM antes de salvar novamente.",
    resend_validation_failed: "O Resend rejeitou os dados do e-mail. Confira o remetente e o endereço do cliente antes de salvar novamente.",
    send_rejected: "O Resend rejeitou o envio. Confira o domínio do remetente, a credencial e o endereço do cliente. Salvar novamente sem corrigir a causa repete a recusa.",
    idempotency_conflict: "O Resend já recebeu uma tentativa com conteúdo diferente para este aviso. Confira o registro no Resend antes de tentar novamente; o primeiro e-mail pode ter sido enviado."
  };
  const message = Object.hasOwn(messages, notification.lastErrorCode) ? messages[notification.lastErrorCode] : "";
  if (message) return `Aviso de expedição bloqueado. A expedição está salva. ${message}`;
  if (["failed", "blocked"].includes(notification.status)) {
    return "Falha ao enviar o e-mail de expedição. A expedição está salva; salve novamente para repetir a tentativa.";
  }
  return "";
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}
