import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";

export const PRODUCTION_STATUS = {
  WAITING_PAYMENT: "waiting_payment",
  WAITING_CAD: "waiting_cad",
  QUEUED: "queued",
  SCHEDULED: "scheduled",
  IN_PRODUCTION: "in_production",
  QUALITY_CHECK: "quality_check",
  READY_TO_SHIP: "ready_to_ship",
  BLOCKED: "blocked",
  SHIPPED: "shipped",
  CANCELLED: "cancelled"
};

export const SHIPMENT_STATUS = {
  PENDING: "pending",
  PACKING: "packing",
  READY_FOR_PICKUP: "ready_for_pickup",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled"
};

export const INVOICE_STATUS = {
  PENDING: "pending",
  MANUAL_PENDING: "manual_pending",
  MANUAL_ISSUED: "manual_issued",
  NOT_REQUIRED: "not_required",
  CANCELLED: "cancelled"
};

export const productionStatusLabels = {
  [PRODUCTION_STATUS.WAITING_PAYMENT]: "Aguardando pagamento",
  [PRODUCTION_STATUS.WAITING_CAD]: "Aguardando",
  [PRODUCTION_STATUS.QUEUED]: "Aguardando",
  [PRODUCTION_STATUS.SCHEDULED]: "Programado",
  [PRODUCTION_STATUS.IN_PRODUCTION]: "Imprimindo",
  [PRODUCTION_STATUS.QUALITY_CHECK]: "Inspecao",
  [PRODUCTION_STATUS.READY_TO_SHIP]: "Pronto para expedir",
  [PRODUCTION_STATUS.BLOCKED]: "Bloqueado",
  [PRODUCTION_STATUS.SHIPPED]: "Expedido",
  [PRODUCTION_STATUS.CANCELLED]: "Cancelado"
};

export const shipmentStatusLabels = {
  [SHIPMENT_STATUS.PENDING]: "Pendente",
  [SHIPMENT_STATUS.PACKING]: "Em embalagem",
  [SHIPMENT_STATUS.READY_FOR_PICKUP]: "Pronto para coleta",
  [SHIPMENT_STATUS.SHIPPED]: "Enviado",
  [SHIPMENT_STATUS.DELIVERED]: "Entregue",
  [SHIPMENT_STATUS.CANCELLED]: "Cancelado"
};

export const invoiceStatusLabels = {
  [INVOICE_STATUS.PENDING]: "NF pendente",
  [INVOICE_STATUS.MANUAL_PENDING]: "NF manual pendente",
  [INVOICE_STATUS.MANUAL_ISSUED]: "NF manual emitida",
  [INVOICE_STATUS.NOT_REQUIRED]: "NF nao requerida",
  [INVOICE_STATUS.CANCELLED]: "NF cancelada"
};

export const productionStatusOptions = Object.values(PRODUCTION_STATUS);
export const shipmentStatusOptions = Object.values(SHIPMENT_STATUS);
export const invoiceStatusOptions = Object.values(INVOICE_STATUS);

const DEFAULT_DAILY_CAPACITY_UNITS = 120;
const FULFILLMENT_SCHEMA_VERSION = 1;

export function normalizeFulfillment(order) {
  const current = order?.metadata?.fulfillment || {};
  const demand = calculateProductionDemand(order);
  const now = new Date().toISOString();

  return {
    schemaVersion: Number(current.schemaVersion || FULFILLMENT_SCHEMA_VERSION),
    production: {
      status: validProductionStatus(current.production?.status) || inferProductionStatus(order),
      priority: cleanText(current.production?.priority) || "normal",
      scheduledDate: cleanText(current.production?.scheduledDate),
      machine: cleanText(current.production?.machine),
      operator: cleanText(current.production?.operator),
      notes: cleanText(current.production?.notes),
      startedAt: cleanText(current.production?.startedAt),
      completedAt: cleanText(current.production?.completedAt),
      updatedAt: cleanText(current.production?.updatedAt) || order?.updatedAt || now
    },
    invoice: {
      status: validInvoiceStatus(current.invoice?.status) || INVOICE_STATUS.PENDING,
      mode: cleanText(current.invoice?.mode) || "manual",
      number: cleanText(current.invoice?.number),
      series: cleanText(current.invoice?.series),
      accessKey: cleanText(current.invoice?.accessKey),
      issuedAt: cleanText(current.invoice?.issuedAt),
      notes: cleanText(current.invoice?.notes),
      updatedAt: cleanText(current.invoice?.updatedAt) || order?.updatedAt || now
    },
    shipment: {
      status: validShipmentStatus(current.shipment?.status) || inferShipmentStatus(order),
      carrier: cleanText(current.shipment?.carrier),
      trackingCode: cleanText(current.shipment?.trackingCode),
      shippedAt: cleanText(current.shipment?.shippedAt),
      deliveredAt: cleanText(current.shipment?.deliveredAt),
      notes: cleanText(current.shipment?.notes),
      updatedAt: cleanText(current.shipment?.updatedAt) || order?.updatedAt || now
    },
    capacity: {
      ...demand,
      dailyCapacityUnits: getDailyProductionCapacity(),
      model: "made_to_order_queue"
    },
    history: Array.isArray(current.history) ? current.history.slice(-20) : []
  };
}

export function buildFulfillmentMetadata(order, patch = {}, now = new Date().toISOString()) {
  const current = normalizeFulfillment(order);
  const next = {
    ...current,
    production: mergeProduction(current.production, patch.production, now),
    invoice: mergeInvoice(current.invoice, patch.invoice, now),
    shipment: mergeShipment(current.shipment, patch.shipment, now)
  };

  next.capacity = {
    ...calculateProductionDemand(order),
    dailyCapacityUnits: getDailyProductionCapacity(),
    model: "made_to_order_queue"
  };
  next.history = [
    ...current.history,
    {
      at: now,
      type: patch.eventType || "admin_operation_update",
      productionStatus: next.production.status,
      invoiceStatus: next.invoice.status,
      shipmentStatus: next.shipment.status
    }
  ].slice(-20);

  return next;
}

export function calculateProductionDemand(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemTotals = items.reduce(
    (sum, item) => {
      const quantity = Math.max(0, Number(item.quantity || 0));
      const breakdown = item.priceBreakdown || {};
      const itemMinutes = Number(breakdown.printMinutes || 0)
        || Number(breakdown.printHours || 0) * 60
        || estimatePrintMinutesFromQuantity(quantity);

      sum.units += quantity;
      sum.printMinutes += itemMinutes * Math.max(1, quantity);
      sum.materialGrams += Number(breakdown.materialGrams || 0) * Math.max(1, quantity);
      return sum;
    },
    { units: 0, printMinutes: 0, materialGrams: 0 }
  );
  const pricing = order?.metadata?.pricing || {};
  const printMinutes = Number(pricing.printMinutes || 0) || itemTotals.printMinutes;
  const materialGrams = Number(pricing.materialGrams || 0) || itemTotals.materialGrams;
  const units = itemTotals.units || estimateUnitsFromSpecialOrder(order);

  return {
    units,
    workUnits: Math.max(units, Math.ceil(printMinutes / 15)),
    printMinutes: Math.round(printMinutes),
    materialGrams: Math.round(materialGrams * 10) / 10
  };
}

export function buildProductionQueue(orders, options = {}) {
  const dailyCapacityUnits = Number(options.dailyCapacityUnits || getDailyProductionCapacity());
  let accumulatedUnits = 0;

  return orders
    .map((order) => ({ order, fulfillment: normalizeFulfillment(order) }))
    .filter(({ fulfillment }) => isQueueRelevantProductionStatus(fulfillment.production.status))
    .sort(compareQueueItems)
    .map((item, index) => {
      const demandUnits = Math.max(1, Number(item.fulfillment.capacity.workUnits || 0));
      const startsAfterUnits = accumulatedUnits;
      accumulatedUnits += demandUnits;

      return {
        ...item,
        queuePosition: index + 1,
        capacity: {
          dailyCapacityUnits,
          demandUnits,
          startsAfterUnits,
          estimatedDayOffset: Math.floor(startsAfterUnits / dailyCapacityUnits),
          capacityLoadPercent: Math.round((demandUnits / dailyCapacityUnits) * 100)
        }
      };
    });
}

export function summarizeProductionQueue(queue) {
  const dailyCapacityUnits = queue[0]?.capacity?.dailyCapacityUnits || getDailyProductionCapacity();
  const demandUnits = queue.reduce((sum, item) => sum + Number(item.capacity?.demandUnits || 0), 0);

  return {
    orders: queue.length,
    demandUnits,
    dailyCapacityUnits,
    estimatedProductionDays: demandUnits ? Math.ceil(demandUnits / dailyCapacityUnits) : 0,
    model: "made_to_order_queue"
  };
}

export function getOrderStatusForFulfillment(currentStatus, fulfillment) {
  const productionStatus = fulfillment?.production?.status;
  const shipmentStatus = fulfillment?.shipment?.status;

  if (productionStatus === PRODUCTION_STATUS.CANCELLED || shipmentStatus === SHIPMENT_STATUS.CANCELLED) {
    return ORDER_STATUS.CANCELLED;
  }

  if (
    productionStatus === PRODUCTION_STATUS.SHIPPED ||
    shipmentStatus === SHIPMENT_STATUS.SHIPPED ||
    shipmentStatus === SHIPMENT_STATUS.DELIVERED
  ) {
    return ORDER_STATUS.SHIPPED;
  }

  if ([
    PRODUCTION_STATUS.QUEUED,
    PRODUCTION_STATUS.SCHEDULED,
    PRODUCTION_STATUS.IN_PRODUCTION,
    PRODUCTION_STATUS.QUALITY_CHECK,
    PRODUCTION_STATUS.READY_TO_SHIP
  ].includes(productionStatus)) {
    return ORDER_STATUS.IN_PRODUCTION;
  }

  return currentStatus;
}

export function getProductionStatusLabel(status) {
  return productionStatusLabels[status] || status || "Sem producao";
}

export function getShipmentStatusLabel(status) {
  return shipmentStatusLabels[status] || status || "Sem expedicao";
}

export function getInvoiceStatusLabel(status) {
  return invoiceStatusLabels[status] || status || "Sem NF";
}

function mergeProduction(current, patch = {}, now) {
  const status = hasPatchValue(patch, "status") ? validProductionStatus(patch.status) || current.status : current.status;
  return {
    ...current,
    status,
    priority: hasPatchValue(patch, "priority") ? cleanText(patch.priority) || "normal" : current.priority || "normal",
    scheduledDate: hasPatchValue(patch, "scheduledDate") ? cleanText(patch.scheduledDate) : current.scheduledDate,
    machine: hasPatchValue(patch, "machine") ? cleanText(patch.machine) : current.machine,
    operator: hasPatchValue(patch, "operator") ? cleanText(patch.operator) : current.operator,
    notes: hasPatchValue(patch, "notes") ? cleanText(patch.notes) : current.notes,
    startedAt: status === PRODUCTION_STATUS.IN_PRODUCTION && !current.startedAt ? now : current.startedAt,
    completedAt: [PRODUCTION_STATUS.READY_TO_SHIP, PRODUCTION_STATUS.SHIPPED].includes(status)
      ? current.completedAt || now
      : current.completedAt,
    updatedAt: now
  };
}

function mergeInvoice(current, patch = {}, now) {
  const status = hasPatchValue(patch, "status") ? validInvoiceStatus(patch.status) || current.status : current.status;
  return {
    ...current,
    status,
    mode: "manual",
    number: hasPatchValue(patch, "number") ? cleanText(patch.number) : current.number,
    series: hasPatchValue(patch, "series") ? cleanText(patch.series) : current.series,
    accessKey: hasPatchValue(patch, "accessKey") ? cleanText(patch.accessKey) : current.accessKey,
    issuedAt: hasPatchValue(patch, "issuedAt")
      ? cleanText(patch.issuedAt) || (status === INVOICE_STATUS.MANUAL_ISSUED ? current.issuedAt || now : "")
      : current.issuedAt,
    notes: hasPatchValue(patch, "notes") ? cleanText(patch.notes) : current.notes,
    updatedAt: now
  };
}

function mergeShipment(current, patch = {}, now) {
  const status = hasPatchValue(patch, "status") ? validShipmentStatus(patch.status) || current.status : current.status;
  return {
    ...current,
    status,
    carrier: hasPatchValue(patch, "carrier") ? cleanText(patch.carrier) : current.carrier,
    trackingCode: hasPatchValue(patch, "trackingCode") ? cleanText(patch.trackingCode) : current.trackingCode,
    shippedAt: hasPatchValue(patch, "shippedAt")
      ? cleanText(patch.shippedAt) || (status === SHIPMENT_STATUS.SHIPPED ? current.shippedAt || now : "")
      : current.shippedAt,
    deliveredAt: hasPatchValue(patch, "deliveredAt")
      ? cleanText(patch.deliveredAt) || (status === SHIPMENT_STATUS.DELIVERED ? current.deliveredAt || now : "")
      : current.deliveredAt,
    notes: hasPatchValue(patch, "notes") ? cleanText(patch.notes) : current.notes,
    updatedAt: now
  };
}

function hasPatchValue(patch, key) {
  return Object.prototype.hasOwnProperty.call(patch || {}, key);
}

function inferProductionStatus(order) {
  if (order?.status === ORDER_STATUS.SHIPPED) return PRODUCTION_STATUS.SHIPPED;
  if (order?.status === ORDER_STATUS.IN_PRODUCTION) return PRODUCTION_STATUS.IN_PRODUCTION;
  if (order?.paymentStatus !== PAYMENT_STATUS.APPROVED) return PRODUCTION_STATUS.WAITING_PAYMENT;
  if (order?.status === ORDER_STATUS.PAID_PENDING_REVIEW) {
    return PRODUCTION_STATUS.BLOCKED;
  }
  if (order?.status === ORDER_STATUS.CAD_PENDING) {
    return PRODUCTION_STATUS.WAITING_CAD;
  }
  if ([ORDER_STATUS.READY_FOR_PRINT, ORDER_STATUS.PAID_READY_FOR_PRODUCTION, ORDER_STATUS.PAID].includes(order?.status)) {
    return PRODUCTION_STATUS.QUEUED;
  }
  return PRODUCTION_STATUS.WAITING_PAYMENT;
}

function inferShipmentStatus(order) {
  return order?.status === ORDER_STATUS.SHIPPED ? SHIPMENT_STATUS.SHIPPED : SHIPMENT_STATUS.PENDING;
}

function isQueueRelevantProductionStatus(status) {
  return [
    PRODUCTION_STATUS.QUEUED,
    PRODUCTION_STATUS.SCHEDULED,
    PRODUCTION_STATUS.IN_PRODUCTION,
    PRODUCTION_STATUS.QUALITY_CHECK,
    PRODUCTION_STATUS.READY_TO_SHIP
  ].includes(status);
}

function compareQueueItems(left, right) {
  const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };
  const leftRank = priorityRank[left.fulfillment.production.priority] ?? priorityRank.normal;
  const rightRank = priorityRank[right.fulfillment.production.priority] ?? priorityRank.normal;
  if (leftRank !== rightRank) return leftRank - rightRank;

  const leftDate = left.fulfillment.production.scheduledDate || left.order.createdAt || "";
  const rightDate = right.fulfillment.production.scheduledDate || right.order.createdAt || "";
  return String(leftDate).localeCompare(String(rightDate));
}

function estimatePrintMinutesFromQuantity(quantity) {
  return Math.max(1, Number(quantity || 1)) * 12;
}

function estimateUnitsFromSpecialOrder(order) {
  return order?.source === "special_request" ? 1 : 0;
}

function getDailyProductionCapacity() {
  const value = Number(process.env.PRODUCTION_DAILY_UNIT_CAPACITY || DEFAULT_DAILY_CAPACITY_UNITS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_CAPACITY_UNITS;
}

function validProductionStatus(status) {
  return productionStatusOptions.includes(status) ? status : "";
}

function validShipmentStatus(status) {
  return shipmentStatusOptions.includes(status) ? status : "";
}

function validInvoiceStatus(status) {
  return invoiceStatusOptions.includes(status) ? status : "";
}

function cleanText(value) {
  return String(value || "").trim();
}
