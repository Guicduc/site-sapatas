import { isPayableOrder, PAYMENT_STATUS } from "./order-status.js";

// Expose only the latest pending boleto, never the provider's full payment payload.
export function getPendingMercadoPagoBoleto(order) {
  if (!isPayableOrder(order.status) || order.paymentStatus !== PAYMENT_STATUS.PENDING
    || order.demo || order.metadata?.demo) return null;

  const payment = order.payments?.[0];
  const raw = payment?.raw;
  if (payment?.provider !== "mercado_pago" || payment.status !== PAYMENT_STATUS.PENDING
    || raw?.status !== "pending" || raw.payment_type_id !== "ticket"
    || Number(payment.amountBrl) !== Number(order.totalBrl)
    || (raw.currency_id && raw.currency_id !== "BRL")) return null;

  let url;
  try {
    url = new URL(raw.transaction_details?.external_resource_url);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port
    || !["mercadopago.com", "www.mercadopago.com", "mercadopago.com.br", "www.mercadopago.com.br"].includes(url.hostname)) return null;

  const expiration = typeof raw.date_of_expiration === "string" ? Date.parse(raw.date_of_expiration) : NaN;
  return {
    url: url.href,
    expiresAt: Number.isFinite(expiration) ? new Date(expiration).toISOString() : null
  };
}
