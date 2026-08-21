import { createHash } from "node:crypto";

import { PRODUCTION_STATUS } from "./fulfillment.js";

export const PRODUCTION_HANDOFF_SCHEMA_VERSION = 1;

export const PRODUCTION_MILESTONE = Object.freeze({
  ACCEPTED: "accepted",
  PRODUCED: "produced",
  FAILED: "failed"
});

export const PRODUCTION_FAILURE_REASON = Object.freeze({
  PRODUCTION_ERROR: "production_error",
  QUALITY_ISSUE: "quality_issue",
  MATERIAL_UNAVAILABLE: "material_unavailable",
  CAPACITY_UNAVAILABLE: "capacity_unavailable",
  UNKNOWN: "unknown"
});

const validMilestones = new Set(Object.values(PRODUCTION_MILESTONE));
const validFailureReasons = new Set(Object.values(PRODUCTION_FAILURE_REASON));
const blockedOrderStatuses = new Set([
  "cancelled",
  "shipped",
  "needs_technical_review",
  "paid_pending_review"
]);

/** Build the immutable allowlisted snapshot sent to the production system. */
export function buildProductionWorkSnapshot(order, workId = buildProductionWorkId(order?.id)) {
  if (!isProductionEligibleOrder(order)) {
    throw productionHandoffError(
      "production_work_not_eligible",
      "O pedido nao esta elegivel para producao externa."
    );
  }

  const items = order.items.map((item) => ({
    itemId: cleanText(item.id, 160),
    sku: cleanText(item.sku, 160),
    categorySlug: cleanText(item.categorySlug, 160),
    formatSlug: cleanText(item.formatSlug, 160),
    configuration: sanitizeConfiguration(item.values),
    color: cleanText(item.color, 120),
    finish: cleanText(item.finish, 120),
    quantity: positiveInteger(item.quantity, 1, 10000)
  }));

  if (items.some((item) => !item.itemId || !item.sku || !item.categorySlug || !item.formatSlug)) {
    throw productionHandoffError(
      "production_work_invalid_snapshot",
      "O snapshot comprado nao possui identificadores tecnicos suficientes."
    );
  }

  return {
    schemaVersion: PRODUCTION_HANDOFF_SCHEMA_VERSION,
    workId,
    order: {
      orderId: cleanText(order.id, 160),
      orderNumber: cleanText(order.orderNumber, 160)
    },
    items
  };
}

export function isProductionEligibleOrder(order) {
  if (!order || order.paymentStatus !== "approved" || blockedOrderStatuses.has(order.status)) return false;
  if (!Array.isArray(order.items) || order.items.length === 0) return false;

  const productionStatus = order.metadata?.fulfillment?.production?.status;
  return ![
    PRODUCTION_STATUS.BLOCKED,
    PRODUCTION_STATUS.READY_TO_SHIP,
    PRODUCTION_STATUS.SHIPPED,
    PRODUCTION_STATUS.CANCELLED
  ].includes(productionStatus);
}

export function buildProductionWorkId(orderId) {
  const normalized = cleanText(orderId, 160);
  if (!normalized) {
    throw productionHandoffError("production_work_invalid_order", "orderId e obrigatorio.");
  }
  return `production-work-v1:${normalized}`;
}

export function normalizeAcknowledgementInput(input = {}) {
  const workId = cleanText(input.workId, 220);
  const idempotencyKey = cleanText(input.idempotencyKey, 220);
  const consumerId = cleanText(input.consumerId, 120) || "production-system";
  if (!workId || !idempotencyKey) {
    throw productionHandoffError(
      "production_ack_invalid",
      "workId e idempotencyKey sao obrigatorios."
    );
  }
  return { workId, idempotencyKey, consumerId };
}

export function normalizeProductionMilestoneInput(input = {}) {
  const workId = cleanText(input.workId, 220);
  const eventId = cleanText(input.eventId, 220);
  const milestone = cleanText(input.milestone, 40).toLowerCase();
  const occurredAt = toIso(input.occurredAt);
  const failureReason = milestone === PRODUCTION_MILESTONE.FAILED
    ? normalizeFailureReason(input.failureReason)
    : "";

  if (!workId || !eventId || !validMilestones.has(milestone) || !occurredAt) {
    throw productionHandoffError(
      "production_milestone_invalid",
      "workId, eventId, milestone e occurredAt validos sao obrigatorios."
    );
  }

  return { workId, eventId, milestone, occurredAt, failureReason };
}

export function resolveProductionMilestoneTransition(currentStatus, milestone) {
  const rules = {
    [PRODUCTION_MILESTONE.ACCEPTED]: {
      target: PRODUCTION_STATUS.IN_PRODUCTION,
      allowed: new Set([
        PRODUCTION_STATUS.WAITING_PAYMENT,
        PRODUCTION_STATUS.QUEUED,
        PRODUCTION_STATUS.SCHEDULED,
        PRODUCTION_STATUS.IN_PRODUCTION,
        PRODUCTION_STATUS.BLOCKED
      ])
    },
    [PRODUCTION_MILESTONE.PRODUCED]: {
      target: PRODUCTION_STATUS.READY_TO_SHIP,
      allowed: new Set([
        PRODUCTION_STATUS.IN_PRODUCTION,
        PRODUCTION_STATUS.QUALITY_CHECK,
        PRODUCTION_STATUS.READY_TO_SHIP
      ])
    },
    [PRODUCTION_MILESTONE.FAILED]: {
      target: PRODUCTION_STATUS.BLOCKED,
      allowed: new Set([
        PRODUCTION_STATUS.QUEUED,
        PRODUCTION_STATUS.SCHEDULED,
        PRODUCTION_STATUS.IN_PRODUCTION,
        PRODUCTION_STATUS.QUALITY_CHECK,
        PRODUCTION_STATUS.BLOCKED
      ])
    }
  };
  const rule = rules[milestone];
  if (!rule || !rule.allowed.has(currentStatus)) {
    throw productionHandoffError(
      "production_milestone_transition_invalid",
      `Transicao ${currentStatus || "unknown"} -> ${milestone || "unknown"} nao permitida.`
    );
  }
  return { status: rule.target, changed: currentStatus !== rule.target };
}

export function buildMilestoneFulfillmentPatch(input, transition) {
  return {
    eventType: `external_production_${input.milestone}`,
    production: { status: transition.status }
  };
}

export function hashCanonical(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function productionHandoffError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeFailureReason(value) {
  const normalized = cleanText(value, 80).toLowerCase();
  return validFailureReasons.has(normalized) ? normalized : PRODUCTION_FAILURE_REASON.UNKNOWN;
}

function sanitizeConfiguration(value, depth = 0) {
  if (depth > 3 || !value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const safeKey = cleanText(key, 100);
    if (!safeKey) return [];
    if (["string", "boolean", "number"].includes(typeof entry) || entry === null) {
      return [[safeKey, typeof entry === "string" ? cleanText(entry, 240) : entry]];
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return [[safeKey, sanitizeConfiguration(entry, depth + 1)]];
    }
    return [];
  }));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function positiveInteger(value, fallback, maximum) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? Math.min(maximum, number) : fallback;
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
