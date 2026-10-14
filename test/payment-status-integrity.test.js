import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseMercadoPagoPaymentPayload } from "../lib/commercial-contracts.js";
import { mapMercadoPagoPaymentStatus } from "../lib/mercado-pago.js";
import { createOrder, getOrderById, recordMercadoPagoUpdate } from "../lib/order-store.js";
import { isPayableOrder, ORDER_STATUS, PAYMENT_STATUS } from "../lib/order-status.js";
import { buildPostPaymentOutboxEvents, OUTBOX_EVENT } from "../lib/outbox-store.js";
import {
  buildPaymentAlerts,
  getNextOrderStatus,
  isPaymentTransitionAllowed,
  mergePaymentAlerts
} from "../lib/payment-transitions.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
const originalResendKey = process.env.RESEND_API_KEY;
const localDirectory = await mkdtemp(path.join(os.tmpdir(), "baseforma-payment-integrity-"));
process.env.DATABASE_URL = "";
process.env.ORDER_STORE_LOCAL_PATH = path.join(localDirectory, "orders.json");
delete process.env.RESEND_API_KEY;

test.after(async () => {
  restoreEnv("DATABASE_URL", originalDatabaseUrl);
  restoreEnv("ORDER_STORE_LOCAL_PATH", originalStorePath);
  restoreEnv("RESEND_API_KEY", originalResendKey);
  await rm(localDirectory, { recursive: true, force: true });
});

test("parser do pagamento preserva campos usados pela integridade de status", () => {
  assert.deepEqual(parseMercadoPagoPaymentPayload({
    id: 99,
    status: "approved",
    status_detail: "partially_refunded",
    currency_id: "BRL",
    transaction_amount: 42,
    transaction_amount_refunded: 10,
    date_last_updated: "2026-08-21T12:00:00.000-04:00",
    ignored: true
  }), {
    id: 99,
    status: "approved",
    status_detail: "partially_refunded",
    currency_id: "BRL",
    transaction_amount: 42,
    transaction_amount_refunded: 10,
    date_last_updated: "2026-08-21T12:00:00.000-04:00"
  });
});

test("mapeamento distingue disputa de pagamento pendente", () => {
  assert.equal(mapMercadoPagoPaymentStatus("in_mediation"), PAYMENT_STATUS.IN_MEDIATION);
  assert.equal(mapMercadoPagoPaymentStatus("charged_back"), PAYMENT_STATUS.REFUNDED);
  assert.equal(mapMercadoPagoPaymentStatus("refunded"), PAYMENT_STATUS.REFUNDED);
  assert.equal(mapMercadoPagoPaymentStatus("in_process"), PAYMENT_STATUS.PENDING);
});

test("pagamento aprovado so sai de aprovado por disputa ou reembolso", () => {
  for (const next of ["pending", "unknown", "rejected", "cancelled", "expired"]) {
    assert.equal(isPaymentTransitionAllowed("approved", next), false, `approved -> ${next}`);
    assert.equal(isPaymentTransitionAllowed("in_mediation", next), false, `in_mediation -> ${next}`);
  }
  assert.equal(isPaymentTransitionAllowed("approved", "in_mediation"), true);
  assert.equal(isPaymentTransitionAllowed("in_mediation", "approved"), true);
  assert.equal(isPaymentTransitionAllowed("approved", "refunded"), true);
  assert.equal(isPaymentTransitionAllowed("refunded", "approved"), false);
  assert.equal(isPaymentTransitionAllowed("refunded", "refunded"), true);
  assert.equal(isPaymentTransitionAllowed("pending", "approved"), true);
  assert.equal(isPaymentTransitionAllowed("rejected", "approved"), true);
  assert.equal(isPaymentTransitionAllowed(null, "pending"), true);
});

test("status do pedido nunca volta a ser cobravel depois de pago", () => {
  const paid = { status: ORDER_STATUS.PAID_READY_FOR_PRODUCTION };
  assert.equal(getNextOrderStatus(paid, PAYMENT_STATUS.REFUNDED), ORDER_STATUS.CANCELLED);
  assert.equal(getNextOrderStatus(paid, PAYMENT_STATUS.PENDING), ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(getNextOrderStatus(paid, PAYMENT_STATUS.UNKNOWN), ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(getNextOrderStatus(paid, PAYMENT_STATUS.REJECTED), ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(getNextOrderStatus(paid, PAYMENT_STATUS.IN_MEDIATION), ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(
    getNextOrderStatus({ status: ORDER_STATUS.PAID_PENDING_REVIEW }, PAYMENT_STATUS.APPROVED),
    ORDER_STATUS.PAID_PENDING_REVIEW
  );
  assert.equal(
    getNextOrderStatus({ status: ORDER_STATUS.NEEDS_TECHNICAL_REVIEW }, PAYMENT_STATUS.APPROVED),
    ORDER_STATUS.PAID_PENDING_REVIEW
  );
  assert.equal(getNextOrderStatus({ status: ORDER_STATUS.IN_PRODUCTION }, PAYMENT_STATUS.REFUNDED), ORDER_STATUS.IN_PRODUCTION);
  assert.equal(getNextOrderStatus({ status: ORDER_STATUS.SHIPPED }, PAYMENT_STATUS.REFUNDED), ORDER_STATUS.SHIPPED);
  assert.equal(getNextOrderStatus({ status: ORDER_STATUS.PENDING_PAYMENT }, PAYMENT_STATUS.REJECTED), ORDER_STATUS.PAYMENT_FAILED);
  assert.equal(getNextOrderStatus({ status: ORDER_STATUS.PAYMENT_FAILED }, PAYMENT_STATUS.PENDING), ORDER_STATUS.PAYMENT_PENDING);
  for (const status of Object.values(PAYMENT_STATUS)) {
    assert.equal(isPayableOrder(getNextOrderStatus(paid, status)), false, `paid + ${status}`);
  }
});

test("alertas de pagamento cobrem duplicidade, reembolso parcial, disputa e chargeback", () => {
  const order = { totalBrl: 42 };
  const reasons = (input) => buildPaymentAlerts({ order, paymentId: "p2", amountBrl: 42, ...input }).map((alert) => alert.reason);
  assert.deepEqual(reasons({ status: "approved", otherSettledPaymentIds: ["p1"] }), ["duplicate_payment"]);
  assert.deepEqual(reasons({ status: "approved", raw: { transaction_amount_refunded: 5 } }), ["partial_refund"]);
  assert.deepEqual(reasons({ status: "in_mediation" }), ["payment_dispute"]);
  assert.deepEqual(reasons({ status: "refunded", previousStatus: "approved", raw: { status: "charged_back" } }), ["payment_charged_back"]);
  assert.deepEqual(reasons({ status: "refunded", previousStatus: "refunded" }), []);
  assert.deepEqual(reasons({ status: "approved" }), []);
  assert.ok(buildPaymentAlerts({ order, status: "in_mediation" }).every((alert) => alert.blocking === false));
});

test("cobranca duplicada enfileira e-mail interno sem repetir e-mail ao cliente nem NF-e", () => {
  const events = buildPostPaymentOutboxEvents({
    orderId: "order-1",
    orderStatus: "paid_ready_for_production",
    paymentStatus: "approved",
    paymentId: "p2",
    alerts: [{ reason: "duplicate_payment", providerPaymentId: "p2", blocking: false, otherPaymentIds: ["p1"] }]
  });
  assert.deepEqual(events.map((event) => event.type), [OUTBOX_EVENT.PAYMENT_REVIEW_EMAIL]);
  assert.equal(events[0].idempotencyKey, "payment-review:duplicate_payment:p2");
  assert.equal(events[0].payload.review.blocking, false);
  assert.deepEqual(events[0].payload.review.otherPaymentIds, ["p1"]);
});

test("reembolso ou chargeback cancela o pedido pago e registra metadata.refund", async () => {
  const draft = await createDraft("chargeback");
  await update(draft, "pay-1", "approved");
  await update(draft, "pay-1", "refunded", { status: "charged_back", status_detail: "settled" });

  const order = await getOrderById(draft.id);
  assert.equal(order.status, ORDER_STATUS.CANCELLED);
  assert.equal(order.paymentStatus, PAYMENT_STATUS.REFUNDED);
  assert.equal(isPayableOrder(order.status), false);
  assert.equal(order.metadata.refund.providerPaymentId, providerId(draft, "pay-1"));
  assert.equal(order.metadata.refund.status, "charged_back");
  assert.ok(order.metadata.refund.detectedAt);
  assert.equal(order.metadata.paymentReview, undefined);
  assert.deepEqual(order.metadata.paymentAlerts.map((alert) => alert.reason), ["payment_charged_back"]);

  // Reentrega antiga sem data nao reabre o pedido nem gera revisao bloqueante.
  await update(draft, "pay-1", "approved");
  const replayed = await getOrderById(draft.id);
  assert.equal(replayed.status, ORDER_STATUS.CANCELLED);
  assert.equal(replayed.paymentStatus, PAYMENT_STATUS.REFUNDED);
  assert.equal(replayed.metadata.paymentReview, undefined);
});

test("reentrega da segunda cobranca continua sem efeitos de pagamento ao cliente", () => {
  const alerts = buildPaymentAlerts({
    order: { totalBrl: 42 }, status: "approved", paymentId: "p2", amountBrl: 42,
    otherSettledPaymentIds: ["p1"]
  });
  assert.deepEqual(mergePaymentAlerts(alerts, alerts).fresh, []);
  // O outbox recebe a classificacao atual, mesmo quando o alerta ja foi salvo.
  const replay = buildPostPaymentOutboxEvents({
    orderId: "order-1", orderStatus: "paid_ready_for_production",
    paymentStatus: "approved", paymentId: "p2", alerts
  });
  assert.deepEqual(replay.map((event) => event.type), [OUTBOX_EVENT.PAYMENT_REVIEW_EMAIL]);
  const saved = mergePaymentAlerts(alerts, buildPaymentAlerts({
    order: { totalBrl: 42 }, status: "approved", paymentId: "p2", amountBrl: 42,
    otherSettledPaymentIds: [] // O pagamento original foi estornado.
  })).alerts;
  assert.deepEqual(buildPostPaymentOutboxEvents({
    orderId: "order-1", orderStatus: "paid_ready_for_production",
    paymentStatus: "approved", paymentId: "p2", alerts: saved
  }).map((event) => event.type), [OUTBOX_EVENT.PAYMENT_REVIEW_EMAIL]);
});

test("primeiro snapshot pago com alerta preserva comprovante e NF-e", () => {
  for (const alert of [
    { reason: "partial_refund", blocking: false, refundedAmountBrl: 5 },
    { reason: "payment_dispute", blocking: false }
  ]) {
    const events = buildPostPaymentOutboxEvents({
      orderId: "order-1", orderStatus: "paid_ready_for_production",
      paymentStatus: "approved", paymentId: "p1", alerts: [alert]
    });
    assert.deepEqual(events.map((event) => event.type), [
      OUTBOX_EVENT.PAYMENT_CUSTOMER_EMAIL, OUTBOX_EVENT.FOCUS_NFE_INVOICE,
      OUTBOX_EVENT.PAYMENT_REVIEW_EMAIL
    ]);
  }
});

test("disputa observada primeiro valida moeda, valor e pedido cancelado", async () => {
  for (const [suffix, raw, amountBrl, expectedReason] of [
    ["currency", { status: "in_mediation", currency_id: "USD" }, 42, "currency_mismatch"],
    ["amount", { status: "in_mediation", currency_id: "BRL" }, 1, "amount_mismatch"],
    ["cancelled", { status: "in_mediation", currency_id: "BRL" }, 42, "approved_payment_on_cancelled_order"]
  ]) {
    const draft = buildDraft(`initial-dispute-${suffix}`);
    if (suffix === "cancelled") draft.status = ORDER_STATUS.CANCELLED;
    await createOrder(draft);
    const order = await recordMercadoPagoUpdate({
      orderId: draft.id, paymentId: providerId(draft, "p1"),
      status: "in_mediation", amountBrl, raw
    });
    assert.equal(order.metadata.paymentReview.reason, expectedReason);
    if (suffix === "cancelled") assert.equal(order.status, ORDER_STATUS.CANCELLED);
    else assert.notEqual(order.paymentStatus, PAYMENT_STATUS.APPROVED);
  }

  const draft = await createDraft("initial-valid-dispute");
  const order = await update(draft, "p1", "in_mediation", { status: "in_mediation", currency_id: "BRL" });
  assert.equal(order.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(order.paymentStatus, PAYMENT_STATUS.APPROVED);
  assert.equal(order.metadata.paymentReview, undefined);
});

test("mesmo pagamento aprovado nao volta para pendente, recusado ou desconhecido", async () => {
  const draft = await createDraft("no-downgrade");
  await update(draft, "pay-1", "approved");
  for (const status of ["pending", "rejected", "unknown"]) {
    await update(draft, "pay-1", status);
  }
  const order = await getOrderById(draft.id);
  assert.equal(order.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(order.paymentStatus, PAYMENT_STATUS.APPROVED);
  assert.equal(order.payments.find((item) => item.providerPaymentId === providerId(draft, "pay-1")).status, PAYMENT_STATUS.APPROVED);
});

test("snapshot do webhook com date_last_updated antigo e descartado", async () => {
  const draft = await createDraft("stale-webhook");
  const raw = (status, updatedAt) => parseMercadoPagoPaymentPayload({
    id: "pay-1", status, transaction_amount: draft.totalBrl, date_last_updated: updatedAt
  });
  await update(draft, "pay-1", "in_mediation", raw("in_mediation", "2026-08-21T12:00:00Z"));
  await update(draft, "pay-1", "approved", raw("approved", "2026-08-21T13:00:00Z"));
  await update(draft, "pay-1", "in_mediation", raw("in_mediation", "2026-08-21T12:00:00Z"));
  const order = await getOrderById(draft.id);
  assert.equal(order.payments[0].status, PAYMENT_STATUS.APPROVED);
});

test("disputa mantem o pedido pago e avisa a operacao sem travar NF-e/producao", async () => {
  const draft = await createDraft("dispute");
  await update(draft, "pay-1", "approved");
  await update(draft, "pay-1", "in_mediation", { status: "in_mediation" });

  let order = await getOrderById(draft.id);
  assert.equal(order.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(order.paymentStatus, PAYMENT_STATUS.APPROVED);
  assert.equal(order.payments[0].status, PAYMENT_STATUS.IN_MEDIATION);
  assert.equal(order.metadata.paymentReview, undefined);
  assert.deepEqual(order.metadata.paymentAlerts.map((alert) => alert.reason), ["payment_dispute"]);

  await update(draft, "pay-1", "approved");
  order = await getOrderById(draft.id);
  assert.equal(order.payments[0].status, PAYMENT_STATUS.APPROVED);
  assert.equal(order.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
});

test("segundo pagamento aprovado gera alerta de duplicidade sem bloquear o pedido", async () => {
  const draft = await createDraft("duplicate");
  await update(draft, "pay-1", "approved");
  await update(draft, "pay-2", "approved");
  await update(draft, "pay-2", "approved");

  let order = await getOrderById(draft.id);
  assert.equal(order.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(order.metadata.paymentReview, undefined);
  assert.deepEqual(order.metadata.paymentAlerts.map((alert) => [alert.reason, alert.providerPaymentId]), [
    ["duplicate_payment", providerId(draft, "pay-2")]
  ]);

  // Estornar a cobranca duplicada nao cancela o pedido que segue pago.
  await update(draft, "pay-2", "refunded");
  order = await getOrderById(draft.id);
  assert.equal(order.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.equal(order.paymentStatus, PAYMENT_STATUS.APPROVED);
  assert.equal(order.metadata.refund, undefined);
});

test("reembolso parcial gera alerta e moeda diferente de BRL vira revisao bloqueante", async () => {
  const partial = await createDraft("partial-refund");
  await update(partial, "pay-1", "approved");
  await update(partial, "pay-1", "approved", { status: "approved", transaction_amount_refunded: 10 });
  let order = await getOrderById(partial.id);
  assert.equal(order.status, ORDER_STATUS.PAID_READY_FOR_PRODUCTION);
  assert.deepEqual(order.metadata.paymentAlerts.map((alert) => alert.reason), ["partial_refund"]);
  assert.equal(order.metadata.paymentAlerts[0].refundedAmountBrl, 10);

  const currency = await createDraft("currency");
  await update(currency, "pay-1", "approved", { status: "approved", currency_id: "USD" });
  order = await getOrderById(currency.id);
  assert.equal(order.metadata.paymentReview.reason, "currency_mismatch");
  assert.equal(order.metadata.paymentReview.currency, "USD");
  assert.notEqual(order.paymentStatus, PAYMENT_STATUS.APPROVED);
});

async function createDraft(suffix) {
  const draft = buildDraft(`integrity-${suffix}`);
  await createOrder(draft);
  return draft;
}

// IDs de pagamento do Mercado Pago sao globais; prefixa pelo pedido do teste.
function providerId(draft, paymentId) {
  return `${draft.id}-${paymentId}`;
}

function update(draft, paymentId, status, raw = { status }) {
  return recordMercadoPagoUpdate({
    orderId: draft.id,
    preferenceId: null,
    paymentId: providerId(draft, paymentId),
    status,
    amountBrl: draft.totalBrl,
    raw: { id: paymentId, ...raw }
  });
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function buildDraft(suffix) {
  const now = new Date().toISOString();
  return {
    id: `order-${suffix}`,
    orderNumber: `BF-${suffix}`,
    source: "configurator",
    status: "pending_payment",
    paymentStatus: "pending",
    totalBrl: 42,
    leadTimeDays: 5,
    notes: "",
    customer: {
      id: `customer-${suffix}`,
      name: "Cliente Teste",
      contact: "cliente@example.com",
      email: "cliente@example.com",
      document: "52998224725"
    },
    items: [{
      id: `item-${suffix}`,
      categorySlug: "sapata-lisa",
      categoryName: "Sapata lisa",
      formatSlug: "redonda",
      formatName: "Redonda",
      sku: `SKU-${suffix}`,
      values: { diametro: 30 },
      color: "Preto",
      finish: "",
      quantity: 2,
      unitPriceBrl: 21,
      totalPriceBrl: 42,
      leadTimeDays: 5,
      status: "valid",
      validationIssues: [],
      priceBreakdown: { printMinutes: 10 }
    }],
    metadata: { commerce: { source: "test" } },
    createdAt: now,
    updatedAt: now
  };
}
