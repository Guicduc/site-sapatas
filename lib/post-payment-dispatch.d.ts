import type { PaymentTransition } from "./commercial-contract-types.js";
export function persistAndDispatchMercadoPagoUpdate(input: PaymentTransition, dependencies?: Record<string, unknown>): Promise<unknown>;
export function dispatchLocalPostPaymentEffects(order: unknown, payment: { id: string; providerPaymentId: string; status: PaymentTransition["status"]; amountBrl: number | null }): Promise<void>;
