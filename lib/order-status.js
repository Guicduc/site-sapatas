export const ORDER_STATUS = {
  NEEDS_TECHNICAL_REVIEW: "needs_technical_review",
  PENDING_PAYMENT: "pending_payment",
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_FAILED: "payment_failed",
  PAID: "paid",
  CAD_PENDING: "cad_pending",
  CAD_GENERATED: "cad_generated",
  READY_FOR_PRINT: "ready_for_print",
  PAID_PENDING_REVIEW: "paid_pending_review",
  PAID_READY_FOR_PRODUCTION: "paid_ready_for_production",
  IN_PRODUCTION: "in_production",
  SHIPPED: "shipped",
  CANCELLED: "cancelled"
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  REFUNDED: "refunded",
  UNKNOWN: "unknown"
};

export const orderStatusLabels = {
  [ORDER_STATUS.NEEDS_TECHNICAL_REVIEW]: "Revisão técnica",
  [ORDER_STATUS.PENDING_PAYMENT]: "Aguardando pagamento",
  [ORDER_STATUS.PAYMENT_PENDING]: "Pagamento pendente",
  [ORDER_STATUS.PAYMENT_FAILED]: "Pagamento não aprovado",
  [ORDER_STATUS.PAID]: "Pago",
  [ORDER_STATUS.CAD_PENDING]: "Aguardando producao",
  [ORDER_STATUS.CAD_GENERATED]: "Aguardando producao",
  [ORDER_STATUS.READY_FOR_PRINT]: "Aguardando producao",
  [ORDER_STATUS.PAID_PENDING_REVIEW]: "Pago, aguardando revisao",
  [ORDER_STATUS.PAID_READY_FOR_PRODUCTION]: "Pago, pronto para produção",
  [ORDER_STATUS.IN_PRODUCTION]: "Em produção",
  [ORDER_STATUS.SHIPPED]: "Enviado",
  [ORDER_STATUS.CANCELLED]: "Cancelado"
};

export const paymentStatusLabels = {
  [PAYMENT_STATUS.PENDING]: "Pendente",
  [PAYMENT_STATUS.APPROVED]: "Aprovado",
  [PAYMENT_STATUS.REJECTED]: "Recusado",
  [PAYMENT_STATUS.CANCELLED]: "Cancelado",
  [PAYMENT_STATUS.EXPIRED]: "Expirado",
  [PAYMENT_STATUS.REFUNDED]: "Reembolsado",
  [PAYMENT_STATUS.UNKNOWN]: "Desconhecido"
};

export function getOrderStatusLabel(status) {
  return orderStatusLabels[status] || status || "Sem status";
}

export function getPaymentStatusLabel(status) {
  return paymentStatusLabels[status] || status || "Sem pagamento";
}

export function isPayableOrder(status) {
  return status === ORDER_STATUS.PENDING_PAYMENT || status === ORDER_STATUS.PAYMENT_FAILED;
}

