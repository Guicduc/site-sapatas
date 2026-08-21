import assert from "node:assert/strict";
import test from "node:test";

import { processOutboxBatch } from "../lib/outbox-processor.js";
import {
  buildPostPaymentOutboxEvents,
  enqueueOutboxEvents,
  getRetrySeconds,
  OUTBOX_EVENT
} from "../lib/outbox-store.js";

test("gera chaves estaveis e bloqueia efeitos de pedido em revisao", () => {
  const input = {
    orderId: "order-1",
    orderStatus: "paid_ready_for_production",
    paymentStatus: "approved",
    paymentId: "mp-1"
  };
  const first = buildPostPaymentOutboxEvents(input);
  const second = buildPostPaymentOutboxEvents(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((event) => event.type), [
    OUTBOX_EVENT.PAYMENT_CUSTOMER_EMAIL,
    OUTBOX_EVENT.FOCUS_NFE_INVOICE
  ]);

  const reviewed = buildPostPaymentOutboxEvents({
    ...input,
    hasPaymentReview: true,
    review: { reason: "amount_mismatch", providerPaymentId: "mp-1" }
  });
  assert.deepEqual(reviewed.map((event) => event.type), [OUTBOX_EVENT.PAYMENT_REVIEW_EMAIL]);
});

test("enqueue usa a chave unica para devolver o mesmo evento", async () => {
  const rowsByKey = new Map();
  const executor = {
    async query(sql, params) {
      assert.match(sql, /on conflict \(idempotency_key\)/);
      const [, type, orderId, key, payload, maxAttempts] = params;
      if (!rowsByKey.has(key)) {
        rowsByKey.set(key, {
          id: params[0], event_type: type, order_id: orderId, idempotency_key: key,
          payload: JSON.parse(payload), status: "queued", attempts: 0,
          max_attempts: maxAttempts, created_at: "2026-08-21T00:00:00.000Z"
        });
      }
      return { rows: [rowsByKey.get(key)] };
    }
  };
  const events = buildPostPaymentOutboxEvents({
    orderId: "order-1", orderStatus: "paid_ready_for_production",
    paymentStatus: "approved", paymentId: "mp-1"
  });
  const first = await enqueueOutboxEvents(executor, events);
  const second = await enqueueOutboxEvents(executor, events);
  assert.equal(rowsByKey.size, 2);
  assert.deepEqual(second.map((event) => event.id), first.map((event) => event.id));
});

test("processador conclui sucesso e agenda falha retryable", async () => {
  const claims = [
    { event: { id: "ok" }, leaseToken: "lease-ok" },
    { event: { id: "retry" }, leaseToken: "lease-retry" }
  ];
  const completed = [];
  const failed = [];
  const result = await processOutboxBatch({ limit: 5 }, {
    claim: async () => claims.shift() || null,
    dispatch: async (event) => {
      if (event.id === "retry") {
        const error = new Error("temporary");
        error.code = "provider_unavailable";
        throw error;
      }
      return { outcome: "email_sent" };
    },
    complete: async (id, token, value) => {
      completed.push({ id, token, value });
      return { id, status: "succeeded" };
    },
    fail: async (id, token, error, options) => {
      failed.push({ id, token, error, options });
      return { id, status: "queued" };
    }
  });
  assert.equal(result.processed, 2);
  assert.equal(result.succeeded, 1);
  assert.equal(result.queuedForRetry, 1);
  assert.equal(completed[0].token, "lease-ok");
  assert.equal(failed[0].options.retryable, true);
});

test("retry usa backoff exponencial limitado", () => {
  const previous = process.env.OUTBOX_RETRY_SECONDS;
  process.env.OUTBOX_RETRY_SECONDS = "10";
  try {
    assert.equal(getRetrySeconds(1), 10);
    assert.equal(getRetrySeconds(3), 40);
    assert.equal(getRetrySeconds(20), 3600);
  } finally {
    if (previous === undefined) delete process.env.OUTBOX_RETRY_SECONDS;
    else process.env.OUTBOX_RETRY_SECONDS = previous;
  }
});
