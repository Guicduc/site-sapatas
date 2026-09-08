import { processOutboxBatch } from "./outbox-processor.js";
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
  } else if (order && (dependencies.processingMode?.() || process.env.OUTBOX_PROCESSING_MODE) !== "async") {
    // Drain only this order after commit; separate workers are an explicit opt-in.
    const result = await (dependencies.processOutbox || processOutboxBatch)({
      orderId: order.id, paymentId: input.paymentId || null, limit: 3, workerId: "payment-request"
    });
    if (result.queuedForRetry || result.failed) {
      console.warn(JSON.stringify({ event: "post_payment.retry_required", orderId: order.id }));
    }
  }

  return order;
}

export async function dispatchLocalPostPaymentEffects(order, payment) {
  if (!order || order.status === "cancelled" || order.metadata?.paymentReview) return;
  await notifyPaymentResolved(order, order.paymentStatus || payment.status);
  await requestInvoiceAfterPayment(order, payment);
}
