import assert from "node:assert/strict";
import test from "node:test";

import { persistAndDispatchMercadoPagoUpdate } from "../lib/post-payment-dispatch.js";

test("Postgres retorna depois da persistencia sem chamar provedores externos", async () => {
  const sequence = [];
  const order = await persistAndDispatchMercadoPagoUpdate(paymentInput(), {
    persist: async () => {
      sequence.push("payment_and_outbox_committed");
      return { id: "order-1", paymentStatus: "approved" };
    },
    mode: () => "postgres",
    processingMode: () => "async",
    dispatchLocal: async () => sequence.push("external_provider_called")
  });
  assert.equal(order.id, "order-1");
  assert.deepEqual(sequence, ["payment_and_outbox_committed"]);
});

test("falha de persistencia impede acknowledgement e efeitos", async () => {
  let dispatched = false;
  await assert.rejects(
    persistAndDispatchMercadoPagoUpdate(paymentInput(), {
      persist: async () => { throw new Error("database unavailable"); },
      mode: () => "postgres",
    processingMode: () => "async",
      dispatchLocal: async () => { dispatched = true; }
    }),
    /database unavailable/
  );
  assert.equal(dispatched, false);
});

test("fallback JSON continua aguardando os efeitos sincronamente", async () => {
  const sequence = [];
  await persistAndDispatchMercadoPagoUpdate(paymentInput(), {
    persist: async () => {
      sequence.push("payment_persisted");
      return { id: "order-1", paymentStatus: "approved" };
    },
    mode: () => "local",
    dispatchLocal: async () => sequence.push("providers_completed")
  });
  assert.deepEqual(sequence, ["payment_persisted", "providers_completed"]);
});

function paymentInput() {
  return {
    orderId: "order-1",
    preferenceId: "pref-1",
    paymentId: "mp-1",
    status: "approved",
    amountBrl: 42,
    raw: { id: "mp-1" }
  };
}


test("Postgres drains only the paid order after commit by default", async () => {
  const calls = [];
  await persistAndDispatchMercadoPagoUpdate(paymentInput(), {
    persist: async () => { calls.push("commit"); return { id: "order-1" }; },
    mode: () => "postgres",
    processingMode: () => "inline",
    processOutbox: async (options) => { calls.push(options); return {}; }
  });
  assert.deepEqual(calls, ["commit", { orderId: "order-1", paymentId: "mp-1", limit: 3, workerId: "payment-request" }]);
});
