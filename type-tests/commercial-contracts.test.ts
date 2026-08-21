import type {
  ImmutableOrderSnapshot,
  OutboxEvent,
  PaymentTransition,
  ProductionMilestoneInput,
  PromotionResult
} from "../lib/commercial-contract-types.js";
import { buildPostPaymentOutboxEvents } from "../lib/outbox-store.js";
import { buildProductionWorkSnapshot, normalizeProductionMilestoneInput } from "../lib/production-handoff.js";
import { publicPromotionResult } from "../lib/promotion-policy.js";
import { persistAndDispatchMercadoPagoUpdate } from "../lib/post-payment-dispatch.js";

const snapshot: ImmutableOrderSnapshot = {
  schemaVersion: 1,
  workId: "production-work-v1:order-1",
  order: { orderId: "order-1", orderNumber: "BF-1" },
  items: [{ itemId: "item-1", sku: "SKU", categorySlug: "cat", formatSlug: "round", configuration: { diameter: 20 }, color: "Preto", finish: "", quantity: 1 }]
};
const transition: PaymentTransition = { orderId: "order-1", preferenceId: null, paymentId: "pay-1", status: "approved", amountBrl: 10, raw: {} };
const milestone: ProductionMilestoneInput = { workId: snapshot.workId, eventId: "event-1", milestone: "accepted", occurredAt: new Date() };
const promotion: PromotionResult = { code: "TEST", label: "Test", type: "percent", status: "applied", applied: true, amountBrl: 1, message: "ok", claim: null };
const event: OutboxEvent = { type: "payment_customer_email", orderId: transition.orderId ?? "", idempotencyKey: "key", payload: { paymentStatus: transition.status === "approved" ? "approved" : "rejected", paymentId: transition.paymentId } };

void [snapshot, transition, milestone, promotion, event];
// Kept in a never-executed branch because `node --test` discovers `.ts` files.
// TypeScript still checks these calls against the declarations of real builders.
if (false) {
  void buildPostPaymentOutboxEvents({ orderId: "order-1", orderStatus: "paid", paymentStatus: "approved", paymentId: "pay-1" });
  void buildProductionWorkSnapshot({});
  void normalizeProductionMilestoneInput(milestone);
  void publicPromotionResult(promotion);
  void persistAndDispatchMercadoPagoUpdate(transition);
}
