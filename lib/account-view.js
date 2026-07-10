import {
  getProductionStatusLabel,
  getShipmentStatusLabel,
  normalizeFulfillment
} from "@/lib/fulfillment";

export function toAccountOrder(order) {
  if (!order) return null;
  const fulfillment = normalizeFulfillment(order);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalBrl: order.totalBrl,
    leadTimeDays: order.leadTimeDays,
    customer: {
      name: order.customer?.name || "",
      contact: order.customer?.contact || "",
      email: order.customer?.email || ""
    },
    items: order.items || [],
    payments: (order.payments || []).map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amountBrl: payment.amountBrl,
      checkoutUrl: payment.checkoutUrl || null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    })),
    fulfillment: {
      production: {
        status: fulfillment.production.status,
        label: getProductionStatusLabel(fulfillment.production.status),
        scheduledDate: fulfillment.production.scheduledDate || "",
        updatedAt: fulfillment.production.updatedAt || ""
      },
      shipment: {
        status: fulfillment.shipment.status,
        label: getShipmentStatusLabel(fulfillment.shipment.status),
        carrier: fulfillment.shipment.carrier || "",
        trackingCode: fulfillment.shipment.trackingCode || "",
        shippedAt: fulfillment.shipment.shippedAt || "",
        deliveredAt: fulfillment.shipment.deliveredAt || "",
        updatedAt: fulfillment.shipment.updatedAt || ""
      }
    },
    technicalReview: order.technicalReviews?.[0]
      ? {
          status: order.technicalReviews[0].status,
          notes: order.technicalReviews[0].notes || "",
          updatedAt: order.technicalReviews[0].updatedAt
        }
      : null,
    technicalReviews: (order.technicalReviews || []).map((review) => ({
      id: review.id,
      status: review.status,
      notes: review.notes || "",
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    })),
    shippingAddress: order.metadata?.shippingAddress || null,
    commerce: order.metadata?.commerce || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    demo: Boolean(order.demo || order.metadata?.demo)
  };
}
