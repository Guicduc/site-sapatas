import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getAdminTokenFingerprint } from "../lib/admin-token.js";
import {
  buildArchivedMetadata,
  getOrderArchive,
  isOrderArchived,
  splitArchivedOrders,
  wasOrderReactivated
} from "../lib/order-archive.js";
import { createOrder, getOrderById, listOrders, setOrderArchived, updateOrderFulfillmentState } from "../lib/order-store.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
const directory = await mkdtemp(path.join(os.tmpdir(), "baseforma-order-archive-"));
process.env.DATABASE_URL = "";
process.env.ORDER_STORE_LOCAL_PATH = path.join(directory, "orders.json");
test.after(async () => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorePath === undefined) delete process.env.ORDER_STORE_LOCAL_PATH;
  else process.env.ORDER_STORE_LOCAL_PATH = originalStorePath;
  await rm(directory, { recursive: true, force: true });
});

test("arquivar grava so o marcador e desarquivar o remove sem tocar no resto do metadata", () => {
  const order = buildOrder("pure");
  const archivedMetadata = buildArchivedMetadata(order, true, "2026-11-19T10:00:00.000Z");
  assert.deepEqual(archivedMetadata.fulfillment, order.metadata.fulfillment);
  assert.equal(archivedMetadata.adminArchive.archivedAt, "2026-11-19T10:00:00.000Z");

  const archived = { ...order, metadata: archivedMetadata };
  assert.equal(isOrderArchived(archived), true);
  assert.equal(wasOrderReactivated(archived), false);
  assert.equal(isOrderArchived(order), false);
  assert.equal(getOrderArchive(order), null);

  assert.deepEqual(buildArchivedMetadata(archived, false), order.metadata);
});

test("mudanca de pagamento depois do arquivamento devolve o pedido as listas", () => {
  const pending = { ...buildOrder("payment"), status: "awaiting_payment", paymentStatus: "pending" };
  const archived = { ...pending, metadata: buildArchivedMetadata(pending, true) };
  assert.equal(isOrderArchived(archived), true);

  const changes = [
    { paymentStatus: "approved" },
    { paymentStatus: "refunded" },
    { metadata: { ...archived.metadata, paymentReview: { reason: "amount_mismatch" } } },
    { metadata: { ...archived.metadata, paymentAlerts: [{ type: "duplicate_payment" }] } }
  ];
  for (const change of changes) {
    const updated = { ...archived, ...change };
    assert.equal(isOrderArchived(updated), false);
    assert.equal(wasOrderReactivated(updated), true);
  }

  // Mudancas que nao sao de pagamento mantem o pedido arquivado.
  assert.equal(isOrderArchived({ ...archived, status: "cancelled" }), true);

  const { active, archived: stillArchived } = splitArchivedOrders([archived, { ...archived, paymentStatus: "approved" }, pending]);
  assert.equal(active.length, 2);
  assert.equal(stillArchived.length, 1);
});

test("store arquiva, filtra a listagem e desarquiva preservando pedido e fulfillment", async () => {
  const kept = buildOrder("kept");
  const hidden = buildOrder("hidden");
  await createOrder(kept);
  await createOrder(hidden);
  const before = await getOrderById(hidden.id);

  const archived = await setOrderArchived(hidden.id, true);
  assert.equal(isOrderArchived(archived), true);
  assert.equal(archived.status, before.status);
  assert.equal(archived.paymentStatus, before.paymentStatus);
  assert.equal(archived.updatedAt, before.updatedAt);
  assert.deepEqual(archived.metadata.fulfillment, before.metadata.fulfillment);

  const ids = async (archive) => (await listOrders({ limit: 50, archive })).map((order) => order.id).sort();
  assert.deepEqual(await ids("exclude"), [kept.id]);
  assert.deepEqual(await ids("only"), [hidden.id]);
  assert.deepEqual(await ids("all"), [hidden.id, kept.id].sort());
  assert.deepEqual((await listOrders({ limit: 50 })).length, 2);

  // Salvar uma etapa de um pedido arquivado nao desfaz o arquivamento.
  await updateOrderFulfillmentState(hidden.id, { invoice: { notes: "Conferido" } });
  assert.equal(isOrderArchived(await getOrderById(hidden.id)), true);

  const restored = await setOrderArchived(hidden.id, false);
  assert.equal(getOrderArchive(restored), null);
  assert.equal(Object.hasOwn(restored.metadata, "adminArchive"), false);
  assert.equal(restored.metadata.fulfillment.invoice.notes, "Conferido");
  assert.deepEqual(await ids("exclude"), [hidden.id, kept.id].sort());
  assert.deepEqual(await ids("only"), []);

  assert.equal(await setOrderArchived("pedido-inexistente", true), null);
});

test("impressao digital do token admin muda com o token e ignora BOM e espacos", () => {
  assert.equal(getAdminTokenFingerprint("segredo-forte"), getAdminTokenFingerprint("﻿segredo-forte\r\n"));
  assert.notEqual(getAdminTokenFingerprint("segredo-forte"), getAdminTokenFingerprint("segredo-novo"));
  assert.equal(getAdminTokenFingerprint("segredo-forte").includes("segredo"), false);
});

function buildOrder(suffix) {
  const timestamp = "2026-11-01T12:00:00.000Z";
  return {
    id: `archive-order-${suffix}`, orderNumber: `BF-ARCHIVE-${suffix.toUpperCase()}`, source: "configurator",
    status: "paid_ready_for_production", paymentStatus: "approved", totalBrl: 42, leadTimeDays: 5,
    customer: { id: `archive-customer-${suffix}`, name: "Cliente", email: `${suffix}@example.com`, contact: "", document: "52998224725" },
    items: [{ id: `archive-item-${suffix}`, sku: "TEST", categorySlug: "sapata-base-lisa", categoryName: "Sapata", formatSlug: "redonda", formatName: "Redonda", values: { diametro: 30 }, quantity: 2, unitPriceBrl: 21, totalPriceBrl: 42 }],
    metadata: { fulfillment: {
      production: { status: "queued", updatedAt: timestamp },
      invoice: { status: "manual_pending", updatedAt: timestamp },
      shipment: { status: "pending", updatedAt: timestamp }
    } },
    createdAt: timestamp, updatedAt: timestamp
  };
}
