import type { OutboxEvent, OrderStatus, PaymentStatus } from "./commercial-contract-types.js";
export const OUTBOX_EVENT: Readonly<Record<string, OutboxEvent["type"]>>;
export function buildPostPaymentOutboxEvents(input: { orderId: string; orderStatus: OrderStatus; paymentStatus: PaymentStatus; paymentId?: string | null; preferenceId?: string | null; hasPaymentReview?: boolean; review?: { reason: string; providerPaymentId?: string | null; paidAmountBrl?: number | null; expectedAmountBrl?: number | null; detectedAt?: string | null } | null }): OutboxEvent[];
export function enqueueOutboxEvents(executor: { query(...args: unknown[]): Promise<{ rows: unknown[] }> }, events: readonly OutboxEvent[]): Promise<unknown[]>;
export function getRetrySeconds(attempts: number): number;
