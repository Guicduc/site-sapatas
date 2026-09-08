import { requestInvoiceAfterPayment } from "./invoice-provider.js";
import { getOrderById } from "./order-store.js";
import {
  claimNextOutboxEvent,
  completeOutboxEvent,
  failOutboxEvent,
  OUTBOX_EVENT,
  sanitizeOutboxErrorCode
} from "./outbox-store.js";
import { notifyInternalPaymentAlert, notifyPaymentResolved } from "./transactional-email.js";

export async function processOutboxBatch({ limit = 10, workerId = "manual", orderId = null } = {}, dependencies = {}) {
  const claim = dependencies.claim || claimNextOutboxEvent;
  const complete = dependencies.complete || completeOutboxEvent;
  const fail = dependencies.fail || failOutboxEvent;
  const dispatch = dependencies.dispatch || dispatchOutboxEvent;
  const safeLimit = Math.min(25, Math.max(1, Math.floor(Number(limit) || 10)));
  const processed = [];

  for (let index = 0; index < safeLimit; index += 1) {
    const claimed = await claim({ workerId, orderId });
    if (!claimed) break;

    try {
      const result = await dispatch(claimed.event);
      const stored = await complete(claimed.event.id, claimed.leaseToken, result);
      if (!stored) throw staleLeaseError();
      processed.push({ id: claimed.event.id, status: "succeeded", result });
    } catch (error) {
      const stored = await fail(claimed.event.id, claimed.leaseToken, error, {
        retryable: error.retryable !== false
      });
      processed.push({
        id: claimed.event.id,
        status: stored?.status || "lease_lost",
        error: sanitizeOutboxErrorCode(error.code)
      });
    }
  }

  return {
    processed: processed.length,
    succeeded: processed.filter((item) => item.status === "succeeded").length,
    queuedForRetry: processed.filter((item) => item.status === "queued").length,
    failed: processed.filter((item) => item.status === "failed").length,
    events: processed
  };
}

export async function dispatchOutboxEvent(event, dependencies = {}) {
  const order = await (dependencies.getOrder || getOrderById)(event.orderId);
  if (!order) return { outcome: "order_missing" };

  if (event.type === OUTBOX_EVENT.PAYMENT_CUSTOMER_EMAIL) {
    if (order.status === "cancelled" || order.metadata?.paymentReview
      || order.paymentStatus !== event.payload.paymentStatus) {
      return { outcome: "customer_notification_no_longer_allowed" };
    }
    return requireEmailDelivery(
      await (dependencies.notifyPayment || notifyPaymentResolved)(order, event.payload.paymentStatus, event.payload.paymentId),
      "payment_email_not_sent"
    );
  }

  if (event.type === OUTBOX_EVENT.PAYMENT_REVIEW_EMAIL) {
    return requireEmailDelivery(
      await notifyInternalPaymentAlert(order, event.payload.review),
      "payment_review_email_not_sent"
    );
  }

  if (event.type === OUTBOX_EVENT.FOCUS_NFE_INVOICE) {
    const result = await requestInvoiceAfterPayment(order, {
      id: event.payload.paymentId,
      providerPaymentId: event.payload.paymentId
    });
    if (result.requested) {
      return {
        outcome: "invoice_requested",
        providerId: result.invoice?.providerId || null
      };
    }
    if (["invoice_not_required", "invoice_provider_not_automated"].includes(result.skipped)) {
      return { outcome: result.skipped };
    }
    throw processingError(
      result.error || result.skipped || "invoice_request_not_completed",
      "A solicitação de NF-e não foi concluída."
    );
  }

  throw processingError("unsupported_outbox_event", "Tipo de evento não suportado.", false);
}

function requireEmailDelivery(result, fallbackCode) {
  if (result?.sent) {
    return { outcome: "email_sent", providerId: result.id || null };
  }
  throw processingError(
    result?.skipped || fallbackCode,
    "O e-mail transacional não foi enviado."
  );
}

function processingError(code, message, retryable = true) {
  const error = new Error(message);
  error.code = code;
  error.retryable = retryable;
  return error;
}

function staleLeaseError() {
  return processingError("outbox_lease_lost", "O lease do evento expirou antes da conclusão.");
}
