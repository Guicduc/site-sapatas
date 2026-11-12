import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildAdminOrderSectionPatch, canConfirmAdminOrderDelivery, canEditAdminOrderSection, getAdminSectionStatus, getAdminInvoiceOptions } from "../lib/admin-order-workflow.js";
import { buildFulfillmentMetadata, getOrderStatusForFulfillment, normalizeFulfillment } from "../lib/fulfillment.js";
import { createOrder, getOrderById, updateOrderFulfillmentState } from "../lib/order-store.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
const directory = await mkdtemp(path.join(os.tmpdir(), "baseforma-admin-workflow-"));
process.env.DATABASE_URL = "";
process.env.ORDER_STORE_LOCAL_PATH = path.join(directory, "orders.json");
test.after(async () => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorePath === undefined) delete process.env.ORDER_STORE_LOCAL_PATH;
  else process.env.ORDER_STORE_LOCAL_PATH = originalStorePath;
  await rm(directory, { recursive: true, force: true });
});

test("salvar a NF preserva toda a producao, expedicao e seus timestamps", () => {
  const order = buildOrder();
  const before = normalizeFulfillment(order);
  const patch = buildAdminOrderSectionPatch(order, "invoice", {
    ...formValues(order, "invoice"), invoiceNumber: "123", invoiceSeries: "1"
  });
  const after = buildFulfillmentMetadata(order, patch, "2026-11-12T15:00:00.000Z");
  assert.deepEqual(after.production, before.production);
  assert.deepEqual(after.shipment, before.shipment);
  assert.equal(after.invoice.number, "123");
  assert.equal(after.invoice.notes, "Observacao anterior");
  assert.deepEqual(Object.keys(patch), ["eventType", "invoice"]);
});

test("opcoes simplificadas preservam os estados internos que representam", () => {
  const cases = [
    ["production", "scheduled"], ["production", "quality_check"],
    ["invoice", "api_issued"], ["invoice", "api_failed"], ["invoice", "pending"],
    ["shipment", "packing"], ["shipment", "delivered"]
  ];
  for (const [section, status] of cases) {
    const order = buildOrder();
    order.metadata.fulfillment[section].status = status;
    if (section === "shipment") order.metadata.fulfillment.production.status = "ready_to_ship";
    const patch = buildAdminOrderSectionPatch(order, section, formValues(order, section));
    assert.equal(Object.hasOwn(patch[section], "status"), false, `${section}: ${status}`);
    assert.equal(buildFulfillmentMetadata(order, patch)[section].status, status);
  }
});

test("pedidos antigos aceitam timestamp Date do Postgres ou ausencia de timestamp", () => {
  for (const updatedAt of [new Date("2026-11-01T12:00:00.000Z"), undefined]) {
    const order = { ...buildOrder(), updatedAt, metadata: {} };
    const values = formValues(order, "invoice");
    assert.equal(typeof values.expectedUpdatedAt, "string");
    const freshRead = { ...order, updatedAt: updatedAt ? new Date(updatedAt) : undefined };
    const patch = buildAdminOrderSectionPatch(freshRead, "invoice", { ...values, invoiceNumber: "789" });
    assert.equal(patch.invoice.number, "789");
  }
});

test("cancelamento ou reembolso permite somente cancelar a NF ja emitida e registrar observacoes", () => {
  for (const changes of [{ status: "cancelled" }, { paymentStatus: "refunded" }]) {
    const order = { ...buildOrder(), ...changes };
    order.metadata.fulfillment.invoice.status = "manual_issued";
    order.metadata.fulfillment.invoice.number = "123";
    assert.equal(canEditAdminOrderSection(order, "invoice"), true);
    assert.equal(canEditAdminOrderSection(order, "production"), false);
    assert.equal(canEditAdminOrderSection(order, "shipment"), false);
    const patch = buildAdminOrderSectionPatch(order, "invoice", {
      ...formValues(order, "invoice"), status: "cancelled", invoiceNumber: "nao alterar", invoiceNotes: "Cancelada no emissor"
    });
    assert.deepEqual(patch.invoice, { status: "cancelled", notes: "Cancelada no emissor" });
    assert.throws(() => buildAdminOrderSectionPatch(order, "invoice", {
      ...formValues(order, "invoice"), status: "manual_pending"
    }), { code: "admin_operation_invalid_status" });
    const fulfillment = buildFulfillmentMetadata(order, patch);
    if (order.status === "cancelled") assert.equal(getOrderStatusForFulfillment(order.status, fulfillment), "cancelled");
  }
});

test("NF em processamento ativo fica a cargo da API e registro manual exige dados completos", () => {
  const order = buildOrder();
  order.metadata.fulfillment.invoice.status = "api_pending";
  assert.deepEqual(getAdminInvoiceOptions(order, { provider: "focus_nfe" }), []);
  assert.equal(getAdminInvoiceOptions(order, { provider: "manual" }).length, 4);
  order.metadata.fulfillment.invoice.status = "manual_pending";
  assert.throws(() => buildAdminOrderSectionPatch(order, "invoice", {
    ...formValues(order, "invoice"), status: "manual_issued", invoiceNumber: "123"
  }), { code: "admin_operation_invalid_invoice" });
  Object.assign(order.metadata.fulfillment.invoice, { status: "manual_issued", number: "123", series: "1", accessKey: "1".repeat(44) });
  assert.throws(() => buildAdminOrderSectionPatch(order, "invoice", {
    ...formValues(order, "invoice"), invoiceAccessKey: ""
  }), { code: "admin_operation_invalid_invoice" });
});

test("o admin nao pode inventar estado de API ou editar pedidos sem liberacao", () => {
  const order = buildOrder();
  assert.throws(() => buildAdminOrderSectionPatch(order, "invoice", {
    ...formValues(order, "invoice"), status: "api_issued"
  }), { code: "admin_operation_invalid_status" });
  assert.equal(canEditAdminOrderSection(order, "__proto__"), false);
  for (const blocked of [
    { ...order, paymentStatus: "pending" },
    { ...order, status: "cancelled" },
    { ...order, status: "paid_pending_review" },
    { ...order, metadata: { ...order.metadata, paymentReview: { reason: "amount_mismatch" } } }
  ]) {
    for (const section of ["production", "invoice", "shipment"]) {
      assert.equal(canEditAdminOrderSection(blocked, section), false);
      assert.throws(() => buildAdminOrderSectionPatch(blocked, section, {}), { code: "admin_operation_unavailable" });
    }
  }
  assert.equal(canEditAdminOrderSection(order, "shipment"), false);
});

test("datas de emissao e expedicao sao preenchidas ao confirmar a etapa", () => {
  const order = buildOrder();
  const now = "2026-11-12T15:00:00.000Z";
  const invoice = buildFulfillmentMetadata(order, buildAdminOrderSectionPatch(order, "invoice", {
    ...formValues(order, "invoice"), status: "manual_issued", invoiceNumber: "123", invoiceSeries: "1", invoiceAccessKey: "1".repeat(44)
  }), now);
  assert.equal(invoice.invoice.issuedAt, now);
  order.metadata.fulfillment.production.status = "ready_to_ship";
  const shipment = buildFulfillmentMetadata(order, buildAdminOrderSectionPatch(order, "shipment", {
    ...formValues(order, "shipment"), status: "shipped", carrier: "Correios", trackingCode: "BR123"
  }), now);
  assert.equal(shipment.shipment.shippedAt, now);
  assert.equal(shipment.shipment.trackingCode, "BR123");
});

test("confirmacao de entrega persiste data e historico sem alterar rastreio, NF ou notificacao", async () => {
  const order = buildOrder();
  order.id = "admin-delivery-order";
  order.metadata.fulfillment.shipment = {
    ...order.metadata.fulfillment.shipment, status: "shipped", trackingCode: "BR123",
    shippedAt: "2026-11-02T12:00:00.000Z", notification: { status: "sent", sentAt: "2026-11-02T12:01:00.000Z" }
  };
  await createOrder(order);
  const before = await getOrderById(order.id);
  assert.equal(canConfirmAdminOrderDelivery(before), true);
  const values = { ...formValues(before, "shipment"), operation: "confirm_delivery", trackingCode: "nao sobrescrever" };
  await updateOrderFulfillmentState(order.id, (latest) => buildAdminOrderSectionPatch(latest, "shipment", values));
  const after = await getOrderById(order.id);
  const previous = normalizeFulfillment(before);
  const next = normalizeFulfillment(after);
  assert.equal(next.shipment.status, "delivered");
  assert.ok(!Number.isNaN(Date.parse(next.shipment.deliveredAt)));
  assert.equal(next.shipment.shippedAt, previous.shipment.shippedAt);
  assert.equal(next.shipment.trackingCode, "BR123");
  assert.deepEqual(next.shipment.notification, previous.shipment.notification);
  assert.deepEqual(next.invoice, previous.invoice);
  assert.deepEqual(next.production, previous.production);
  assert.equal(after.metadata.fulfillment.history.at(-1).type, "admin_delivery_confirmed");
  assert.equal(canConfirmAdminOrderDelivery(after), false);
  await assert.rejects(updateOrderFulfillmentState(order.id, (latest) => buildAdminOrderSectionPatch(latest, "shipment", values)), { code: "admin_operation_stale" });
});

test("entrega exige despacho anterior e liberacao operacional", () => {
  const ready = buildOrder();
  ready.metadata.fulfillment.production.status = "ready_to_ship";
  for (const order of [
    ready,
    { ...ready, status: "cancelled" },
    { ...ready, status: "shipped", paymentStatus: "refunded" },
    { ...ready, status: "shipped", paymentStatus: "pending" },
    { ...ready, status: "shipped", metadata: { fulfillment: { shipment: { status: "cancelled" } } } },
    { ...ready, status: "shipped", metadata: { ...ready.metadata, paymentReview: { reason: "amount_mismatch" } } }
  ]) {
    assert.equal(canConfirmAdminOrderDelivery(order), false);
    assert.throws(() => buildAdminOrderSectionPatch(order, "shipment", {
      ...formValues(order, "shipment"), operation: "confirm_delivery"
    }), { code: "admin_operation_unavailable" });
  }
  const legacy = { ...ready, status: "shipped" };
  assert.equal(canConfirmAdminOrderDelivery(legacy), true);
  assert.equal(buildAdminOrderSectionPatch(legacy, "shipment", {
    ...formValues(legacy, "shipment"), operation: "confirm_delivery"
  }).shipment.status, "delivered");
});

test("salvamentos de secoes distintas convivem e uma ficha antiga nao desfaz a mesma etapa", async () => {
  const draft = buildOrder();
  await createOrder(draft);
  const initial = await getOrderById(draft.id);
  const productionValues = { ...formValues(initial, "production"), status: "ready_to_ship" };
  await Promise.all([
    updateOrderFulfillmentState(draft.id, (latest) => buildAdminOrderSectionPatch(latest, "production", productionValues)),
    updateOrderFulfillmentState(draft.id, (latest) => buildAdminOrderSectionPatch(latest, "invoice", {
      ...formValues(initial, "invoice"), invoiceNumber: "456"
    }))
  ]);
  const stored = await getOrderById(draft.id);
  assert.equal(stored.metadata.fulfillment.production.status, "ready_to_ship");
  assert.equal(stored.metadata.fulfillment.production.machine, "Impressora antiga");
  assert.equal(stored.metadata.fulfillment.invoice.number, "456");
  await assert.rejects(updateOrderFulfillmentState(draft.id, (latest) => buildAdminOrderSectionPatch(latest, "production", {
    ...productionValues, status: "queued"
  })), { code: "admin_operation_stale" });
  assert.equal((await getOrderById(draft.id)).metadata.fulfillment.production.status, "ready_to_ship");
});

test("mudanca manual nao sobrescreve a producao externa e faz rollback sob lock", async () => {
  const order = buildOrder();
  const poolKey = Symbol.for("baseforma.postgres.pool");
  const previousPool = globalThis[poolKey];
  const previousMode = process.env.PRODUCTION_SYSTEM_MODE;
  const previousUrl = process.env.DATABASE_URL;
  const databaseUrl = "postgres://admin-test@localhost:5432/test";
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql);
      if (sql.startsWith("select * from orders")) return { rows: [{
        id: order.id, status: order.status, payment_status: order.paymentStatus,
        metadata: order.metadata, updated_at: new Date(order.updatedAt)
      }] };
      if (sql.startsWith("select route")) return { rows: [{ route: "external" }] };
      return { rows: [] };
    },
    on() {}, removeListener() {}, release() {}
  };
  globalThis[poolKey] = { pool: { connect: async () => client }, connectionKey: `${databaseUrl}|ssl:off`, creating: null };
  process.env.DATABASE_URL = databaseUrl;
  process.env.PRODUCTION_SYSTEM_MODE = "active";
  try {
    await assert.rejects(updateOrderFulfillmentState(order.id, (latest) => buildAdminOrderSectionPatch(latest, "production", {
      ...formValues(order, "production"), status: "ready_to_ship"
    })), { code: "admin_operation_external_production" });
    assert.ok(statements.some((sql) => sql.includes("for update")));
    assert.ok(statements.includes("rollback"));
    assert.equal(statements.some((sql) => sql.trim().startsWith("update orders")), false);
  } finally {
    globalThis[poolKey] = previousPool;
    process.env.DATABASE_URL = previousUrl;
    if (previousMode === undefined) delete process.env.PRODUCTION_SYSTEM_MODE;
    else process.env.PRODUCTION_SYSTEM_MODE = previousMode;
  }
});

function formValues(order, section) {
  const current = normalizeFulfillment(order)[section];
  return { status: getAdminSectionStatus(section, current.status), expectedUpdatedAt: current.updatedAt };
}

function buildOrder() {
  const timestamp = "2026-11-01T12:00:00.000Z";
  return {
    id: "admin-workflow-order", orderNumber: "BF-ADMIN-TEST", source: "configurator",
    status: "paid_ready_for_production", paymentStatus: "approved", totalBrl: 42, leadTimeDays: 5,
    customer: { id: "admin-customer", name: "Cliente", email: "test@example.com", contact: "", document: "52998224725" },
    items: [{ id: "admin-item", sku: "TEST", categorySlug: "sapata-base-lisa", categoryName: "Sapata", formatSlug: "redonda", formatName: "Redonda", values: { diametro: 30 }, quantity: 2, unitPriceBrl: 21, totalPriceBrl: 42 }],
    metadata: { fulfillment: {
      production: { status: "queued", machine: "Impressora antiga", operator: "Gui", updatedAt: timestamp },
      invoice: { status: "manual_pending", notes: "Observacao anterior", updatedAt: timestamp },
      shipment: { status: "pending", carrier: "Correios", updatedAt: timestamp }
    } },
    createdAt: timestamp, updatedAt: timestamp
  };
}
