export type OrderStatus =
  | "needs_technical_review" | "pending_payment" | "payment_pending"
  | "payment_failed" | "paid" | "cad_pending" | "cad_generated"
  | "ready_for_print" | "paid_pending_review" | "paid_ready_for_production"
  | "in_production" | "shipped" | "cancelled";

export type PaymentStatus =
  | "pending" | "approved" | "rejected" | "cancelled"
  | "expired" | "refunded" | "unknown";

export type ProductionStatus =
  | "waiting_payment" | "queued" | "scheduled" | "in_production"
  | "quality_check" | "ready_to_ship" | "blocked" | "shipped" | "cancelled";
export type ShipmentStatus =
  | "pending" | "packing" | "ready_for_pickup" | "shipped" | "delivered" | "cancelled";
export type InvoiceStatus =
  | "pending" | "manual_pending" | "manual_issued" | "api_pending"
  | "api_issued" | "api_failed" | "not_required" | "cancelled";

export type JsonPrimitive = string | number | boolean | null;
export type ImmutableConfiguration = Readonly<Record<string, JsonPrimitive | ImmutableConfiguration>>;

export interface ImmutableOrderItemSnapshot {
  readonly itemId: string;
  readonly sku: string;
  readonly categorySlug: string;
  readonly formatSlug: string;
  readonly configuration: ImmutableConfiguration;
  readonly color: string;
  readonly finish: string;
  readonly quantity: number;
}

export interface ImmutableOrderSnapshot {
  readonly schemaVersion: 1;
  readonly workId: string;
  readonly order: Readonly<{ orderId: string; orderNumber: string }>;
  readonly items: readonly ImmutableOrderItemSnapshot[];
}

export interface PaymentTransition {
  orderId: string | null;
  preferenceId: string | null;
  paymentId: string;
  status: PaymentStatus;
  amountBrl: number | null;
  raw: unknown;
}

export interface FulfillmentMetadata {
  schemaVersion: number;
  production: { status: ProductionStatus; [key: string]: unknown };
  invoice: { status: InvoiceStatus; [key: string]: unknown };
  shipment: { status: ShipmentStatus; [key: string]: unknown };
  capacity: { units: number; workUnits: number; printMinutes: number; dailyCapacityUnits: number; model: "made_to_order_queue" };
  history: readonly { at: string; type: string; productionStatus: ProductionStatus; invoiceStatus: InvoiceStatus; shipmentStatus: ShipmentStatus }[];
}

export type ProductionMilestone = "accepted" | "produced" | "failed";
export type ProductionFailureReason =
  | "production_error" | "quality_issue" | "material_unavailable"
  | "capacity_unavailable" | "unknown";
export interface ProductionMilestoneInput {
  workId: string;
  eventId: string;
  milestone: ProductionMilestone;
  occurredAt: string | Date;
  failureReason?: ProductionFailureReason | string;
}
export interface ProductionAcknowledgementInput {
  workId: string;
  idempotencyKey: string;
  consumerId?: string;
}

export interface PromotionClaim { promotionId: string; identityHash: string }
export type PromotionResult = {
  code: string;
  label: string;
  type: "percent" | "free_shipping" | "none";
  status: "applied" | "not_eligible";
  applied: boolean;
  amountBrl: number;
  message: string;
  claim: PromotionClaim | null;
};
export type PublicPromotionResult = Omit<PromotionResult, "claim">;

export type PaymentCustomerEmailPayload = { paymentStatus: "approved" | "rejected"; paymentId: string | null };
export type PaymentReviewEmailPayload = { paymentId: string | null; review: { reason: string; providerPaymentId: string | null; paidAmountBrl: number | null; expectedAmountBrl: number | null; detectedAt: string | null } };
export type FocusNfeInvoicePayload = { paymentId: string | null };
export type OutboxEvent =
  | { type: "payment_customer_email"; orderId: string; idempotencyKey: string; payload: PaymentCustomerEmailPayload }
  | { type: "payment_review_email"; orderId: string; idempotencyKey: string; payload: PaymentReviewEmailPayload }
  | { type: "focus_nfe_invoice"; orderId: string; idempotencyKey: string; payload: FocusNfeInvoicePayload };

export interface MercadoPagoWebhookPayload {
  type?: string;
  status?: string;
  orderId?: string;
  preferenceId?: string;
  paymentId?: string;
  amountBrl?: number;
  data?: { id?: string | number };
}
export interface MercadoPagoPaymentPayload {
  id: string | number;
  status?: string;
  external_reference?: string;
  preference_id?: string;
  transaction_amount?: number;
  metadata?: { order_id?: string };
}
