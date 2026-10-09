import assert from "node:assert/strict";
import test from "node:test";

import {
  dispatchOutboxEvent,
  isRetryableOutboxError,
  NON_RETRYABLE_OUTBOX_CODES,
  processOutboxBatch
} from "../lib/outbox-processor.js";
import { OUTBOX_EVENT } from "../lib/outbox-store.js";
import { persistAndDispatchMercadoPagoUpdate } from "../lib/post-payment-dispatch.js";
import {
  classifyResendFailure,
  getResendTimeoutMs,
  notifyPaymentResolved,
  sendAccountAccessCodeEmail,
  sendAccountPasswordChangedEmail
} from "../lib/transactional-email.js";

function codedError(code, extra = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

async function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

async function silenceConsole(fn) {
  const { warn, error } = console;
  const logs = [];
  console.warn = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  try {
    await fn(logs);
  } finally {
    console.warn = warn;
    console.error = error;
  }
  return logs;
}

const resendEnv = {
  RESEND_API_KEY: "re_test_key",
  TRANSACTIONAL_EMAIL_FROM: "Baseforma <teste@example.com>",
  TRANSACTIONAL_EMAIL_REPLY_TO: undefined
};

test("falhas deterministicas nao sao repetidas; transitorias sim", () => {
  for (const code of [
    "missing_customer_email",
    "missing_resend_api_key",
    "missing_email_from",
    "missing_customer_document",
    "invoice_credentials_missing",
    "focus_nfe_payload_invalid",
    "focus_nfe_total_mismatch",
    "send_rejected",
    "idempotency_conflict"
  ]) {
    assert.ok(NON_RETRYABLE_OUTBOX_CODES.has(code), code);
    assert.equal(isRetryableOutboxError(codedError(code)), false, code);
  }
  for (const code of ["send_failed", "network_failed", "outbox_lease_lost", "focus_nfe_rejected", undefined]) {
    assert.equal(isRetryableOutboxError(codedError(code)), true, String(code));
  }
  assert.equal(isRetryableOutboxError(codedError("send_failed", { retryable: false })), false);
  assert.equal(isRetryableOutboxError(new Error("db down")), true);
});

test("processador envia falha deterministica direto para failed e conta lease perdido", async () => {
  const claims = [
    { event: { id: "missing-email" }, leaseToken: "a" },
    { event: { id: "transient" }, leaseToken: "b" },
    { event: { id: "lost" }, leaseToken: "c" }
  ];
  const failOptions = {};
  const result = await processOutboxBatch({ limit: 5 }, {
    claim: async () => claims.shift() || null,
    dispatch: async (event) => {
      if (event.id === "missing-email") throw codedError("missing_customer_email");
      if (event.id === "transient") throw codedError("send_failed");
      return { outcome: "email_sent" };
    },
    complete: async (id) => (id === "lost" ? null : { id }),
    fail: async (id, _token, _error, options) => {
      failOptions[id] = options.retryable;
      if (id === "lost") return null;
      return { id, status: options.retryable ? "queued" : "failed" };
    }
  });
  assert.equal(failOptions["missing-email"], false);
  assert.equal(failOptions.transient, true);
  assert.equal(result.failed, 1);
  assert.equal(result.queuedForRetry, 1);
  assert.equal(result.leaseLost, 1);
});

test("dispatch de e-mail marca skip deterministico como nao repetivel", async () => {
  const order = { status: "paid_ready_for_production", paymentStatus: "approved" };
  const event = {
    type: OUTBOX_EVENT.PAYMENT_CUSTOMER_EMAIL,
    orderId: "o",
    createdAt: "2026-09-01T12:00:00.000Z",
    payload: { paymentStatus: "approved", paymentId: "mp-1" }
  };
  let options;
  await assert.rejects(
    dispatchOutboxEvent(event, {
      getOrder: async () => order,
      notifyPayment: async (_order, _status, _id, opts) => {
        options = opts;
        return { sent: false, skipped: "missing_customer_email" };
      }
    }),
    (error) => error.code === "missing_customer_email" && error.retryable === false
  );
  assert.equal(options.confirmedAt, "2026-09-01T12:00:00.000Z");

  await assert.rejects(
    dispatchOutboxEvent(event, {
      getOrder: async () => order,
      notifyPayment: async () => ({ sent: false, skipped: "send_failed" })
    }),
    (error) => error.code === "send_failed" && error.retryable === true
  );
});

test("aviso inline inclui lease perdido", async () => {
  const logs = await silenceConsole(async () => {
    await persistAndDispatchMercadoPagoUpdate({ paymentId: "mp-1" }, {
      persist: async () => ({ id: "order-1" }),
      mode: () => "postgres",
      processingMode: () => "inline",
      processOutbox: async () => ({ queuedForRetry: 0, failed: 0, leaseLost: 1 })
    });
  });
  assert.ok(logs.some((args) => String(args[0]).includes("post_payment.retry_required")));
});

test("classifica respostas de erro do Resend", () => {
  assert.equal(classifyResendFailure(429, {}), "send_failed");
  assert.equal(classifyResendFailure(408, {}), "send_failed");
  assert.equal(classifyResendFailure(500, {}), "send_failed");
  assert.equal(classifyResendFailure(503, {}), "send_failed");
  assert.equal(classifyResendFailure(409, { name: "concurrent_idempotent_requests" }), "send_failed");
  assert.equal(classifyResendFailure(409, { name: "invalid_idempotent_request" }), "idempotency_conflict");
  assert.equal(classifyResendFailure(400, { name: "validation_error" }), "send_rejected");
  assert.equal(classifyResendFailure(401, {}), "send_rejected");
  assert.equal(classifyResendFailure(403, {}), "send_rejected");
  assert.equal(classifyResendFailure(422, {}), "send_rejected");
});

test("timeout do Resend e configuravel e limitado", () => {
  assert.equal(getResendTimeoutMs(undefined), 10000);
  assert.equal(getResendTimeoutMs(""), 10000);
  assert.equal(getResendTimeoutMs("abc"), 10000);
  assert.equal(getResendTimeoutMs("0"), 10000);
  assert.equal(getResendTimeoutMs("2500"), 2500);
  assert.equal(getResendTimeoutMs("999999"), 60000);
});

test("timeout do Resend vira falha de rede", async () => {
  await withEnv(resendEnv, async () => {
    let signal;
    await silenceConsole(async () => {
      const result = await withFetch(async (_url, init) => {
        signal = init.signal;
        throw new DOMException("The operation timed out.", "TimeoutError");
      }, () => notifyPaymentResolved(
        { id: "o1", orderNumber: "BF-1", customer: { email: "c@example.com" }, items: [], totalBrl: 10 },
        "approved",
        "mp-1"
      ));
      assert.deepEqual(result, { sent: false, skipped: "network_failed" });
    });
    assert.ok(signal instanceof AbortSignal);
  });
});

test("e-mail de pagamento aprovado tem corpo estavel entre webhooks", async () => {
  const calls = [];
  const baseOrder = {
    id: "o1",
    orderNumber: "BF-1",
    customer: { email: "c@example.com" },
    items: [{ formatName: "Sapata", quantity: 1, totalPriceBrl: 10 }],
    totalBrl: 10
  };
  const payment = (updatedAt) => ({
    providerPaymentId: "mp-1", amountBrl: 10, createdAt: "2026-09-01T11:00:00.000Z", updatedAt
  });
  await withEnv(resendEnv, () => withFetch(async (_url, init) => {
    calls.push(init);
    return new Response(JSON.stringify({ id: "email-1" }), { status: 200 });
  }, async () => {
    const options = { confirmedAt: "2026-09-01T12:00:00.000Z" };
    await notifyPaymentResolved({ ...baseOrder, payments: [payment("2026-09-01T12:00:01.000Z")] }, "approved", "mp-1", options);
    await notifyPaymentResolved({ ...baseOrder, payments: [payment("2026-09-03T08:30:00.000Z")] }, "approved", "mp-1", options);
  }));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls[0].headers["Idempotency-Key"], "payment-approved-mp-1");
  assert.equal(calls[0].headers["Idempotency-Key"], calls[1].headers["Idempotency-Key"]);
  assert.match(JSON.parse(calls[0].body).html, /Confirmado em/);
});

test("conflito de idempotencia do Resend nao e repetido", async () => {
  await withEnv(resendEnv, async () => {
    await silenceConsole(async () => {
      const result = await withFetch(
        async () => new Response(JSON.stringify({ name: "invalid_idempotent_request" }), { status: 409 }),
        () => notifyPaymentResolved(
          { id: "o1", orderNumber: "BF-1", customer: { email: "c@example.com" }, items: [], totalBrl: 10 },
          "approved",
          "mp-1"
        )
      );
      assert.deepEqual(result, { sent: false, skipped: "idempotency_conflict" });
    });
  });
});

test("cada troca de senha usa chave de idempotencia propria", async () => {
  const keys = [];
  await withEnv(resendEnv, () => withFetch(async (_url, init) => {
    keys.push(init.headers["Idempotency-Key"]);
    return new Response(JSON.stringify({ id: "x" }), { status: 200 });
  }, async () => {
    await sendAccountPasswordChangedEmail("c@example.com");
    await sendAccountPasswordChangedEmail("c@example.com");
  }));
  assert.equal(keys.length, 2);
  assert.notEqual(keys[0], keys[1]);
});

test("codigo de acesso usa sha256 na chave de idempotencia", async () => {
  const keys = [];
  await withEnv({ ...resendEnv, NODE_ENV: "production" }, () => withFetch(async (_url, init) => {
    keys.push(init.headers["Idempotency-Key"]);
    return new Response(JSON.stringify({ id: "x" }), { status: 200 });
  }, async () => {
    await sendAccountAccessCodeEmail("c@example.com", "123456");
    await sendAccountAccessCodeEmail("c@example.com", "123456");
    await sendAccountAccessCodeEmail("c@example.com", "654321");
  }));
  assert.match(keys[0], /^account-access-[0-9a-f]{64}$/);
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[0], keys[2]);
});
