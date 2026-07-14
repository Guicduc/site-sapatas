import {
  buildShipmentNotificationRecord,
  getShipmentNotificationDecision
} from "@/lib/shipment-notification-policy";
import { updateOrderFulfillmentState } from "@/lib/order-store";
import { notifyOrderShipped } from "@/lib/transactional-email";

export async function deliverShipmentNotification(order) {
  const decision = getShipmentNotificationDecision(order);

  if (!decision.shouldSend) {
    return { sent: false, skipped: decision.reason };
  }

  const result = await notifyOrderShipped(order);
  const previous = order.metadata?.fulfillment?.shipment?.notification || {};
  const notification = buildShipmentNotificationRecord(previous, result);

  try {
    await updateOrderFulfillmentState(order.id, {
      eventType: `shipment_notification_${notification.status}`,
      shipment: { notification }
    });
  } catch {
    console.warn("[shipment-notification] state persistence failed", {
      event: "order_shipped",
      outcome: "state_persistence_failed"
    });
    return { ...result, notificationPersisted: false };
  }

  if (!result.sent) {
    console.warn("[shipment-notification] delivery not completed", {
      event: "order_shipped",
      outcome: notification.status,
      errorCode: notification.lastErrorCode
    });
  }

  return { ...result, notificationPersisted: true };
}
