import { INVOICE_STATUS, normalizeFulfillment, PRODUCTION_STATUS, SHIPMENT_STATUS } from "./fulfillment.js";
import { ORDER_STATUS, PAYMENT_STATUS } from "./order-status.js";
import { getInvoiceConfig, isAutomatedInvoiceProvider } from "./invoice-config.js";
import { canCancelInvoice } from "./invoice-provider.js";

export const ADMIN_PRODUCTION_OPTIONS = [
  { value: PRODUCTION_STATUS.QUEUED, label: "Aguardando producao" },
  { value: PRODUCTION_STATUS.IN_PRODUCTION, label: "Em producao" },
  { value: PRODUCTION_STATUS.READY_TO_SHIP, label: "Produzido" },
  { value: PRODUCTION_STATUS.BLOCKED, label: "Bloqueado" }
];

export const ADMIN_INVOICE_OPTIONS = [
  { value: INVOICE_STATUS.MANUAL_PENDING, label: "NF a emitir" },
  { value: INVOICE_STATUS.MANUAL_ISSUED, label: "NF emitida no emissor" },
  { value: INVOICE_STATUS.NOT_REQUIRED, label: "NF nao requerida" },
  { value: INVOICE_STATUS.CANCELLED, label: "NF cancelada" }
];

export const ADMIN_SHIPMENT_OPTIONS = [
  { value: SHIPMENT_STATUS.PENDING, label: "Aguardando expedicao" },
  { value: SHIPMENT_STATUS.READY_FOR_PICKUP, label: "Pronto para expedir" },
  { value: SHIPMENT_STATUS.SHIPPED, label: "Expedido" }
];

const sectionOptions = {
  production: ADMIN_PRODUCTION_OPTIONS,
  invoice: ADMIN_INVOICE_OPTIONS,
  shipment: ADMIN_SHIPMENT_OPTIONS
};

// Only fields with an operational purpose are accepted from these forms.
// Omitted legacy fields remain in metadata; a save never clears them implicitly.
const sectionFields = {
  production: { priority: "productionPriority", scheduledDate: "scheduledDate" },
  invoice: { number: "invoiceNumber", series: "invoiceSeries", accessKey: "invoiceAccessKey", notes: "invoiceNotes" },
  shipment: { carrier: "carrier", trackingCode: "trackingCode", notes: "shipmentNotes" }
};

export function getAdminSectionStatus(section, status) {
  if (section === "production" && status === PRODUCTION_STATUS.SCHEDULED) return PRODUCTION_STATUS.QUEUED;
  if (section === "production" && status === PRODUCTION_STATUS.QUALITY_CHECK) return PRODUCTION_STATUS.IN_PRODUCTION;
  if (section === "invoice" && status === INVOICE_STATUS.PENDING) return INVOICE_STATUS.MANUAL_PENDING;
  if (section === "shipment" && status === SHIPMENT_STATUS.PACKING) return SHIPMENT_STATUS.READY_FOR_PICKUP;
  if (section === "shipment" && status === SHIPMENT_STATUS.DELIVERED) return SHIPMENT_STATUS.SHIPPED;
  return status;
}

export function canEditAdminOrderSection(order, section) {
  if (!Object.hasOwn(sectionOptions, section) || !order) return false;
  if (section === "invoice" && isAdminInvoiceCancellationOnly(order)) {
    return [INVOICE_STATUS.MANUAL_ISSUED, INVOICE_STATUS.API_ISSUED, INVOICE_STATUS.CANCELLED]
      .includes(normalizeFulfillment(order).invoice.status);
  }
  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED
    || order.metadata?.paymentReview
    || [ORDER_STATUS.CANCELLED, ORDER_STATUS.NEEDS_TECHNICAL_REVIEW, ORDER_STATUS.PAID_PENDING_REVIEW].includes(order.status)) {
    return false;
  }
  const fulfillment = normalizeFulfillment(order);
  const completed = order.status === ORDER_STATUS.SHIPPED
    || fulfillment.production.status === PRODUCTION_STATUS.SHIPPED
    || [SHIPMENT_STATUS.SHIPPED, SHIPMENT_STATUS.DELIVERED].includes(fulfillment.shipment.status);
  if (section === "production") return !completed;
  if (section === "shipment") {
    return completed || fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP;
  }
  return true;
}

export function isAdminInvoiceCancellationOnly(order) {
  return order?.status === ORDER_STATUS.CANCELLED
    || [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.CANCELLED].includes(order?.paymentStatus);
}

export function canConfirmAdminOrderDelivery(order) {
  if (!canEditAdminOrderSection(order, "shipment")) return false;
  const fulfillment = normalizeFulfillment(order);
  return ![SHIPMENT_STATUS.DELIVERED, SHIPMENT_STATUS.CANCELLED].includes(fulfillment.shipment.status)
    && (fulfillment.shipment.status === SHIPMENT_STATUS.SHIPPED
      || order.status === ORDER_STATUS.SHIPPED
      || fulfillment.production.status === PRODUCTION_STATUS.SHIPPED);
}

export function getAdminInvoiceOptions(order, config = getInvoiceConfig()) {
  const invoice = normalizeFulfillment(order).invoice;
  // While live automation owns the invoice, its status comes from the provider.
  // During the pause, existing invoices are reconciled in the issuer's panel.
  if (isAutomatedInvoiceProvider(config.provider)
    && (invoice.status === INVOICE_STATUS.API_PENDING || canCancelInvoice(order, config))) return [];
  if (isAdminInvoiceCancellationOnly(order)) {
    return ADMIN_INVOICE_OPTIONS.filter((option) => option.value === INVOICE_STATUS.CANCELLED);
  }
  return ADMIN_INVOICE_OPTIONS;
}

// Called against the locked order by the store, so background updates cannot be
// overwritten by a stale browser form. Only this section is patched.
export function buildAdminOrderSectionPatch(order, section, values) {
  if (!canEditAdminOrderSection(order, section)) throw workflowError("admin_operation_unavailable");
  const current = normalizeFulfillment(order)[section];
  if (values.expectedUpdatedAt !== current.updatedAt) throw workflowError("admin_operation_stale");

  // Delivery is a separate confirmation, so unsaved shipping fields cannot
  // overwrite tracking data or trigger another shipment notification.
  if (values.operation === "confirm_delivery") {
    if (section !== "shipment" || !canConfirmAdminOrderDelivery(order)) {
      throw workflowError("admin_operation_unavailable");
    }
    return {
      eventType: "admin_delivery_confirmed",
      shipment: { status: SHIPMENT_STATUS.DELIVERED, deliveredAt: "" }
    };
  }

  const submitted = cleanText(values.status);
  const patch = {};
  if (submitted !== getAdminSectionStatus(section, current.status)) {
    const options = section === "invoice" ? getAdminInvoiceOptions(order) : sectionOptions[section];
    if (!options.some((option) => option.value === submitted)) {
      throw workflowError("admin_operation_invalid_status");
    }
    patch.status = submitted;
  }
  for (const [key, field] of Object.entries(sectionFields[section])) {
    if (section === "invoice" && isAdminInvoiceCancellationOnly(order) && key !== "notes") continue;
    if (Object.hasOwn(values, field)) patch[key] = cleanText(values[field]);
  }

  const manualInvoiceChanged = section === "invoice" && !isAdminInvoiceCancellationOnly(order)
    && (patch.status === INVOICE_STATUS.MANUAL_ISSUED
      || (current.status === INVOICE_STATUS.MANUAL_ISSUED
        && ["number", "series", "accessKey"].some((key) => Object.hasOwn(patch, key) && patch[key] !== current[key])));
  if (manualInvoiceChanged) {
    const invoice = { ...current, ...patch };
    if (!invoice.number || !invoice.series || String(invoice.accessKey).replace(/\D/g, "").length !== 44) {
      throw workflowError("admin_operation_invalid_invoice");
    }
  }

  // The existing merger sets event dates. Never post a browser-local date back
  // over an authoritative invoice or shipment timestamp.
  if (section === "invoice" && patch.status === INVOICE_STATUS.MANUAL_ISSUED) patch.issuedAt = "";
  if (section === "shipment" && patch.status === SHIPMENT_STATUS.SHIPPED) patch.shippedAt = "";
  return { eventType: `admin_${section}_update`, [section]: patch };
}

function cleanText(value) {
  return String(value || "").trim();
}

function workflowError(code) {
  return Object.assign(new Error(code), { code });
}
