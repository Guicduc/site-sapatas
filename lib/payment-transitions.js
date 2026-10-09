import { ORDER_STATUS, PAYMENT_STATUS } from "./order-status.js";

// Pagamentos que representam dinheiro recebido (disputa ainda retem o valor).
export const SETTLED_PAYMENT_STATUSES = Object.freeze([PAYMENT_STATUS.APPROVED, PAYMENT_STATUS.IN_MEDIATION]);

const PAID_ORDER_STATUSES = new Set([
  ORDER_STATUS.PAID,
  ORDER_STATUS.PAID_PENDING_REVIEW,
  ORDER_STATUS.PAID_READY_FOR_PRODUCTION,
  ORDER_STATUS.CAD_PENDING,
  ORDER_STATUS.CAD_GENERATED,
  ORDER_STATUS.READY_FOR_PRINT
]);

const PRESERVED_ORDER_STATUSES = new Set([
  ORDER_STATUS.IN_PRODUCTION,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.CANCELLED
]);

export function isSettledPaymentStatus(status) {
  return SETTLED_PAYMENT_STATUSES.includes(status);
}

// Um pagamento aprovado so pode sair de "aprovado" por disputa, reembolso ou
// chargeback. Reembolso e terminal. Isso impede que entregas fora de ordem ou
// snapshots sem data voltem o pagamento para pendente/recusado/desconhecido.
export function isPaymentTransitionAllowed(previousStatus, nextStatus) {
  if (!previousStatus || previousStatus === nextStatus) return true;
  if (previousStatus === PAYMENT_STATUS.REFUNDED) return false;
  if (isSettledPaymentStatus(previousStatus)) {
    return isSettledPaymentStatus(nextStatus) || nextStatus === PAYMENT_STATUS.REFUNDED;
  }
  return true;
}

export function getNextOrderStatus(order, paymentStatus) {
  if (PRESERVED_ORDER_STATUSES.has(order.status)) {
    return order.status;
  }

  // Reembolso/chargeback do pagamento que quitava o pedido: encerra o pedido
  // para que ele nunca volte a ser cobravel.
  if (paymentStatus === PAYMENT_STATUS.REFUNDED) {
    return ORDER_STATUS.CANCELLED;
  }

  // Pedido ja pago nunca regride para um status cobravel.
  if (PAID_ORDER_STATUSES.has(order.status)) {
    return order.status;
  }

  if (isSettledPaymentStatus(paymentStatus)) {
    if (order.status === ORDER_STATUS.NEEDS_TECHNICAL_REVIEW) {
      return ORDER_STATUS.PAID_PENDING_REVIEW;
    }

    return ORDER_STATUS.PAID_READY_FOR_PRODUCTION;
  }

  if (
    paymentStatus === PAYMENT_STATUS.REJECTED
    || paymentStatus === PAYMENT_STATUS.CANCELLED
    || paymentStatus === PAYMENT_STATUS.EXPIRED
  ) {
    return ORDER_STATUS.PAYMENT_FAILED;
  }

  return ORDER_STATUS.PAYMENT_PENDING;
}

// Alertas internos que nao bloqueiam NF-e nem producao do pedido: a operacao
// e avisada por e-mail e decide manualmente (estorno, cancelamento de NF-e etc.).
export function buildPaymentAlerts({
  order,
  status,
  previousStatus = null,
  paymentId,
  amountBrl,
  raw,
  otherSettledPaymentIds = []
}) {
  if (!order) return [];
  const detectedAt = new Date().toISOString();
  const base = {
    providerPaymentId: paymentId ? String(paymentId) : null,
    paidAmountBrl: amountBrl == null ? null : Number(amountBrl || 0),
    expectedAmountBrl: Number(order.totalBrl || 0),
    providerStatus: typeof raw?.status === "string" ? raw.status : null,
    detectedAt,
    blocking: false
  };
  const alerts = [];

  if (status === PAYMENT_STATUS.APPROVED && otherSettledPaymentIds.length) {
    alerts.push({ ...base, reason: "duplicate_payment", otherPaymentIds: otherSettledPaymentIds.map(String) });
  }

  const refundedAmount = Number(raw?.transaction_amount_refunded || 0);
  if (status === PAYMENT_STATUS.APPROVED && refundedAmount > 0) {
    alerts.push({ ...base, reason: "partial_refund", refundedAmountBrl: refundedAmount });
  }

  if (status === PAYMENT_STATUS.IN_MEDIATION) {
    alerts.push({ ...base, reason: "payment_dispute" });
  }

  if (status === PAYMENT_STATUS.REFUNDED && previousStatus !== PAYMENT_STATUS.REFUNDED) {
    alerts.push({
      ...base,
      reason: raw?.status === "charged_back" ? "payment_charged_back" : "payment_refunded"
    });
  }

  return alerts;
}

export function mergePaymentAlerts(existing, alerts) {
  const current = Array.isArray(existing) ? existing : [];
  const fresh = alerts.filter((alert) => !current.some((item) =>
    item.reason === alert.reason
      && String(item.providerPaymentId || "") === String(alert.providerPaymentId || "")
  ));
  return { alerts: [...current, ...fresh], fresh };
}

export function getPaymentCurrencyMismatch(raw) {
  const currency = typeof raw?.currency_id === "string" ? raw.currency_id.trim().toUpperCase() : "";
  return currency && currency !== "BRL" ? currency : null;
}
