import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";

export const PRODUCTION_STATUS = {
  WAITING_PAYMENT: "waiting_payment",
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
  API_PENDING: "api_pending",
  API_ISSUED: "api_issued",
  API_FAILED: "api_failed",
  NOT_REQUIRED: "not_required",
  CANCELLED: "cancelled"
};

export const productionStatusLabels = {
  [PRODUCTION_STATUS.WAITING_PAYMENT]: "Aguardando pagamento",
  [PRODUCTION_STATUS.QUEUED]: "Aguardando producao",
  [PRODUCTION_STATUS.SCHEDULED]: "Aguardando producao",
  [PRODUCTION_STATUS.IN_PRODUCTION]: "Aguardando producao",
  [PRODUCTION_STATUS.QUALITY_CHECK]: "Aguardando producao",
  [PRODUCTION_STATUS.READY_TO_SHIP]: "Produzido",
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
  [INVOICE_STATUS.MANUAL_PENDING]: "NF pendente no emissor",
  [INVOICE_STATUS.MANUAL_ISSUED]: "NF emitida no emissor",
  [INVOICE_STATUS.API_PENDING]: "NF automatica pendente",
  [INVOICE_STATUS.API_ISSUED]: "NF emitida via API",
  [INVOICE_STATUS.API_FAILED]: "Falha na NF automatica",
  [INVOICE_STATUS.NOT_REQUIRED]: "NF nao requerida",
  [INVOICE_STATUS.CANCELLED]: "NF cancelada"
};

export const productionStatusOptions = Object.values(PRODUCTION_STATUS);
export const shipmentStatusOptions = Object.values(SHIPMENT_STATUS);
export const invoiceStatusOptions = Object.values(INVOICE_STATUS);

const DEFAULT_DAILY_CAPACITY_UNITS = 120;
const FULFILLMENT_SCHEMA_VERSION = 2;

export function normalizeFulfillment(order) {
  const current = order?.metadata?.fulfillment || {};
  const demand = calculateProductionDemand(order);
  const now = new Date().toISOString();

  return {
    schemaVersion: Math.max(Number(current.schemaVersion || 0), FULFILLMENT_SCHEMA_VERSION),
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
      mode: cleanText(current.invoice?.mode) || getDefaultInvoiceMode(),
      provider: cleanText(current.invoice?.provider),
      providerId: cleanText(current.invoice?.providerId),
      number: cleanText(current.invoice?.number),
      series: cleanText(current.invoice?.series),
      accessKey: cleanInvoiceAccessKey(current.invoice?.accessKey),
      documentUrl: cleanText(current.invoice?.documentUrl),
      statusDetail: cleanText(current.invoice?.statusDetail),
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
      notification: normalizeShipmentNotification(current.shipment?.notification),
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
      return sum;
    },
    { units: 0, printMinutes: 0 }
  );
  const pricing = order?.metadata?.pricing || {};
  const printMinutes = Number(pricing.printMinutes || 0) || itemTotals.printMinutes;
  const units = itemTotals.units || estimateUnitsFromSpecialOrder(order);

  return {
    units,
    workUnits: Math.max(units, Math.ceil(printMinutes / 15)),
    printMinutes: Math.round(printMinutes)
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
  const number = hasPatchValue(patch, "number") ? cleanText(patch.number) : current.number;
  const series = hasPatchValue(patch, "series") ? cleanText(patch.series) : current.series;
  const accessKey = hasPatchValue(patch, "accessKey") ? cleanInvoiceAccessKey(patch.accessKey) : current.accessKey;
  const issuedAt = hasPatchValue(patch, "issuedAt")
    ? cleanText(patch.issuedAt) || (isIssuedInvoiceStatus(status) ? current.issuedAt || now : "")
    : current.issuedAt;
  const notes = hasPatchValue(patch, "notes") ? cleanText(patch.notes) : current.notes;

  return {
    ...current,
    status,
    mode: hasPatchValue(patch, "mode") ? cleanText(patch.mode) || getDefaultInvoiceMode() : current.mode || getDefaultInvoiceMode(),
    provider: hasPatchValue(patch, "provider") ? cleanText(patch.provider) : current.provider,
    providerId: hasPatchValue(patch, "providerId") ? cleanText(patch.providerId) : current.providerId,
    number,
    series,
    accessKey,
    documentUrl: hasPatchValue(patch, "documentUrl") ? cleanText(patch.documentUrl) : current.documentUrl,
    statusDetail: hasPatchValue(patch, "statusDetail") ? cleanText(patch.statusDetail) : current.statusDetail,
    issuedAt,
    notes: buildInvoiceNotes({ status, number, series, accessKey, notes }),
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
    notification: hasPatchValue(patch, "notification")
      ? normalizeShipmentNotification({ ...current.notification, ...patch.notification })
      : current.notification,
    updatedAt: now
  };
}

function normalizeShipmentNotification(value = {}) {
  const status = ["sent", "failed", "blocked"].includes(value.status) ? value.status : "";
  return {
    status,
    attempts: Math.max(0, Number(value.attempts || 0)),
    lastAttemptAt: cleanText(value.lastAttemptAt),
    sentAt: cleanText(value.sentAt),
    providerMessageId: cleanText(value.providerMessageId),
    lastErrorCode: cleanText(value.lastErrorCode)
  };
}

function hasPatchValue(patch, key) {
  return Object.prototype.hasOwnProperty.call(patch || {}, key);
}

function inferProductionStatus(order) {
  // Um pagamento tardio aprovado nao pode recolocar um pedido cancelado na fila.
  if (order?.status === ORDER_STATUS.CANCELLED) return PRODUCTION_STATUS.CANCELLED;
  if (order?.status === ORDER_STATUS.SHIPPED) return PRODUCTION_STATUS.SHIPPED;
  if (order?.status === ORDER_STATUS.IN_PRODUCTION) return PRODUCTION_STATUS.IN_PRODUCTION;
  if (order?.paymentStatus !== PAYMENT_STATUS.APPROVED) return PRODUCTION_STATUS.WAITING_PAYMENT;
  if (order?.status === ORDER_STATUS.PAID_PENDING_REVIEW) {
    return PRODUCTION_STATUS.BLOCKED;
  }
  if (order?.paymentStatus === PAYMENT_STATUS.APPROVED) {
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

function isIssuedInvoiceStatus(status) {
  return [INVOICE_STATUS.MANUAL_ISSUED, INVOICE_STATUS.API_ISSUED].includes(status);
}

function getDefaultInvoiceMode() {
  const provider = cleanText(process.env.INVOICE_PROVIDER).toLowerCase();
  return ["mercado_pago", "focus_nfe"].includes(provider) ? provider : "manual";
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanInvoiceAccessKey(value) {
  return cleanText(value).replace(/\D/g, "").slice(0, 44);
}

function buildInvoiceNotes({ status, number, series, accessKey, notes }) {
  const normalizedNotes = cleanText(notes);
  if (!isIssuedInvoiceStatus(status)) return normalizedNotes;

  const missing = [];
  if (!number) missing.push("numero");
  if (!series) missing.push("serie");
  if (!accessKey || accessKey.length !== 44) missing.push("chave de acesso");

  if (!missing.length) return normalizedNotes;

  const warning = `Pendencia NF: conferir ${missing.join(", ")}.`;
  const notesWithoutPreviousWarning = normalizedNotes
    .split("\n")
    .filter((line) => !line.startsWith("Pendencia NF manual:") && !line.startsWith("Pendencia NF:"))
    .join("\n")
    .trim();

  return [notesWithoutPreviousWarning, warning].filter(Boolean).join("\n");
}
