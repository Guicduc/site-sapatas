import type { OutboxEvent, OrderStatus, PaymentStatus } from "./commercial-contract-types.js";
export const OUTBOX_EVENT: Readonly<Record<string, OutboxEvent["type"]>>;
export function buildPostPaymentOutboxEvents(input: { orderId: string; orderStatus: OrderStatus; paymentStatus: PaymentStatus; paymentId?: string | null; preferenceId?: string | null; hasPaymentReview?: boolean; review?: PaymentReviewInput | null; alerts?: readonly PaymentReviewInput[] }): OutboxEvent[];
type PaymentReviewInput = { reason: string; providerPaymentId?: string | null; paidAmountBrl?: number | null; expectedAmountBrl?: number | null; detectedAt?: string | null; flaggedAt?: string | null; blocking?: boolean; providerStatus?: string | null; refundedAmountBrl?: number | null; currency?: string | null; otherPaymentIds?: readonly string[] };
export function enqueueOutboxEvents(executor: { query(...args: unknown[]): Promise<{ rows: unknown[] }> }, events: readonly OutboxEvent[]): Promise<unknown[]>;
export function getRetrySeconds(attempts: number): number;
