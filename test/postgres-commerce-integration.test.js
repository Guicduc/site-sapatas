import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { closePool, query } from "../lib/db.js";
import {
  createOrder,
  getOrCreatePendingMercadoPagoPayment,
  getOrderById,
  recordMercadoPagoUpdate
} from "../lib/order-store.js";
import { claimNextOutboxEvent, completeOutboxEvent, failOutboxEvent } from "../lib/outbox-store.js";

// Run against a disposable database with docs/ops/database.sql already applied.
test("Postgres commerce transactions", { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
  const originalEnvironment = Object.fromEntries(
    ["DATABASE_URL", "DATABASE_SSL", "PRODUCTION_SYSTEM_MODE"].map((key) => [key, process.env[key]])
  );
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL || "false";
  process.env.PRODUCTION_SYSTEM_MODE = "disabled";
  const drafts = [];
  const fixture = () => {
    const draft = buildDraft();
    drafts.push(draft);
    return draft;
  };

  try {
    await t.test("concurrent preference requests call the provider once", async () => {
      const draft = fixture();
      await createOrder(draft);
      let providerCalls = 0;
      const createPendingPayment = async () => {
        providerCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return buildPayment(draft.id);
      };
      const results = await Promise.all(Array.from({ length: 6 }, () =>
        getOrCreatePendingMercadoPagoPayment(draft.id, createPendingPayment)
      ));
      assert.equal(providerCalls, 1);
      assert.equal(new Set(results.map(({ payment }) => payment.id)).size, 1);
      assert.equal(results.filter(({ reused }) => !reused).length, 1);
      assert.equal((await getOrderById(draft.id)).payments.length, 1);
    });

    await t.test("duplicate approvals stage one invoice and leases cannot be claimed twice", async () => {
      const draft = fixture();
      await createOrder(draft);
      const { payment } = await getOrCreatePendingMercadoPagoPayment(draft.id, async () => buildPayment(draft.id));
      const approvedId = randomUUID();
      const update = (paymentId, status) => recordMercadoPagoUpdate({
        orderId: draft.id,
        preferenceId: payment.providerPreferenceId,
        paymentId,
        status,
        amountBrl: draft.totalBrl,
        raw: { id: paymentId, status }
      });
      await Promise.all(Array.from({ length: 4 }, () => update(approvedId, "approved")));
      const order = await getOrderById(draft.id);
      assert.equal(order.paymentStatus, "approved");
      assert.equal(order.payments.length, 1);
      const { rows: events } = await query(
        "select * from post_payment_outbox where order_id = $1", [draft.id]
      );
      assert.equal(events.length, 2);
      assert.equal(events.filter((event) => event.event_type === "focus_nfe_invoice").length, 1);
      assert.equal(events.filter((event) => event.event_type === "payment_customer_email").length, 1);

      const claims = (await Promise.all(Array.from({ length: 6 }, (_, index) =>
        claimNextOutboxEvent({ workerId: `integration-${index}`, orderId: draft.id })
      ))).filter(Boolean);
      assert.equal(claims.length, 2);
      assert.equal(new Set(claims.map(({ event }) => event.id)).size, 2);
      assert.ok(claims.every(({ event }) => event.attempts === 1));
      assert.equal(await completeOutboxEvent(claims[0].event.id, "wrong-token"), null);
      for (const { event, leaseToken } of claims) {
        assert.equal((await completeOutboxEvent(event.id, leaseToken)).status, "succeeded");
        assert.equal(await completeOutboxEvent(event.id, leaseToken), null);
      }
      await update(randomUUID(), "rejected");
      const afterRejection = await getOrderById(draft.id);
      assert.equal(afterRejection.paymentStatus, "approved");
      assert.equal(afterRejection.status, "paid_ready_for_production");
      assert.equal(afterRejection.payments.length, 2);
      assert.equal(afterRejection.payments.find((attempt) => attempt.providerPaymentId === approvedId).status, "approved");
      await assert.rejects(() => getOrCreatePendingMercadoPagoPayment(draft.id, () => {
        assert.fail("paid order must not call the payment provider");
      }), { code: "order_not_payable" });
    });

    await t.test("current approval bypasses old mail backlog and failures omit provider details", async () => {
      const draft = fixture();
      await createOrder(draft);
      for (const [paymentId, status] of [["old1", "rejected"], ["old2", "rejected"], ["old3", "rejected"], ["current", "approved"]]) {
        await recordMercadoPagoUpdate({orderId: draft.id, paymentId: `${draft.id}-${paymentId}`, status, amountBrl: 42, raw: {status}});
      }
      const first = await claimNextOutboxEvent({orderId: draft.id, paymentId: `${draft.id}-current`});
      const second = await claimNextOutboxEvent({orderId: draft.id, paymentId: `${draft.id}-current`});
      assert.deepEqual(new Set([first.event.type, second.event.type]), new Set(["focus_nfe_invoice", "payment_customer_email"]));
      assert.equal(await claimNextOutboxEvent({orderId: draft.id, paymentId: `${draft.id}-current`}), null);
      const failure = await failOutboxEvent(first.event.id, first.leaseToken, Object.assign(new Error("private@example.com token=secret"), {code: "invalid token=secret"}));
      assert.equal(failure.status, "queued");
      assert.equal(failure.lastError.code, "outbox_processing_failed");
      assert.doesNotMatch(JSON.stringify(failure.lastError), /private|secret/);
    });

    await t.test("concurrent promotion reservations persist only the winning order", async () => {
      const first = fixture();
      const second = fixture();
      const claim = { promotionId: randomUUID(), identityHash: randomUUID() };
      first.metadata.promotionClaim = claim;
      second.metadata.promotionClaim = claim;
      const results = await Promise.allSettled([createOrder(first), createOrder(second)]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.find((result) => result.status === "rejected").reason.code, "promotion_not_eligible");
      const { rows: claims } = await query(
        "select order_id from promotion_redemptions where promotion_id = $1 and identity_hash = $2",
        [claim.promotionId, claim.identityHash]
      );
      assert.equal(claims.length, 1);
      const orders = await Promise.all([getOrderById(first.id), getOrderById(second.id)]);
      assert.equal(orders.filter(Boolean).length, 1);
      assert.equal(orders.find(Boolean).id, claims[0].order_id);
      const { rows: customers } = await query(
        "select id from customers where id = any($1::text[])", [[first.customer.id, second.customer.id]]
      );
      assert.equal(customers.length, 1, "losing transaction also rolls back its customer");
    });
  } finally {
    try {
      for (const draft of drafts) {
        await query("delete from orders where id = $1", [draft.id]);
        await query("delete from customers where id = $1", [draft.customer.id]);
      }
    } finally {
      await closePool();
      for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }
});

function buildDraft() {
  const id = randomUUID();
  const now = new Date().toISOString();
  return {
    id, orderNumber: `BF-PG-${id}`, source: "configurator", status: "pending_payment",
    paymentStatus: "pending", totalBrl: 42, leadTimeDays: 5, notes: "",
    customer: {
      id: randomUUID(), name: "Integration test", contact: "integration@example.com",
      email: "integration@example.com", document: "52998224725"
    },
    items: [{
      id: randomUUID(), categorySlug: "sapata-lisa", categoryName: "Sapata lisa",
      formatSlug: "redonda", formatName: "Redonda", sku: `TEST-${id}`,
      values: { diametro: 30 }, color: "Preto", finish: "", quantity: 2,
      unitPriceBrl: 21, totalPriceBrl: 42, leadTimeDays: 5, status: "valid",
      validationIssues: [], priceBreakdown: { printMinutes: 10 }
    }],
    metadata: { commerce: { source: "postgres-integration-test" } }, createdAt: now, updatedAt: now
  };
}

function buildPayment(orderId) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(), orderId, provider: "mercado_pago", providerPreferenceId: randomUUID(),
    providerPaymentId: null, status: "pending", checkoutUrl: "https://example.com/test-payment",
    amountBrl: 42, raw: {}, createdAt: now, updatedAt: now
  };
}
