import type { OrderStatus, PaymentStatus } from "./commercial-contract-types.js";
export const ORDER_STATUS: Readonly<Record<string, OrderStatus>>;
export const PAYMENT_STATUS: Readonly<Record<string, PaymentStatus>>;
export const orderStatusLabels: Partial<Record<OrderStatus, string>>;
export const paymentStatusLabels: Partial<Record<PaymentStatus, string>>;
export function getOrderStatusLabel(status?: OrderStatus | string): string;
export function getPaymentStatusLabel(status?: PaymentStatus | string): string;
export function isPayableOrder(status: OrderStatus): boolean;
