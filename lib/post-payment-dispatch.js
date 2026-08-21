import { getDatabaseMode } from "./db.js";
import { requestInvoiceAfterPayment } from "./invoice-provider.js";
import { recordMercadoPagoUpdate } from "./order-store.js";
import { notifyPaymentResolved } from "./transactional-email.js";

export async function persistAndDispatchMercadoPagoUpdate(input, dependencies = {}) {
  const persist = dependencies.persist || recordMercadoPagoUpdate;
  const mode = dependencies.mode || getDatabaseMode;
  const dispatchLocal = dependencies.dispatchLocal || dispatchLocalPostPaymentEffects;
  const order = await persist(input);

  if (mode() === "local") {
    await dispatchLocal(order, {
      id: input.paymentId,
      providerPaymentId: input.paymentId,
      status: input.status,
      amountBrl: input.amountBrl
    });
  }

  return order;
}

export async function dispatchLocalPostPaymentEffects(order, payment) {
  if (!order || order.status === "cancelled" || order.metadata?.paymentReview) return;
  await notifyPaymentResolved(order, order.paymentStatus || payment.status);
  await requestInvoiceAfterPayment(order, payment);
}
