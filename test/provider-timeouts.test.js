import assert from "node:assert/strict";
import test from "node:test";

import { buildBeginStatement, getPoolTimeouts, getTransactionTimeouts, withTransaction } from "../lib/db.js";
import { fetchMercadoPagoPayment, searchMercadoPagoPaymentsByReference } from "../lib/mercado-pago.js";
import { fetchWithTimeout, readTimeoutMs } from "../lib/provider-timeout.js";
import { quoteShipping, sanitizePostalCode } from "../lib/shipping.js";

const shippingItem = {
  id: "item-1",
  categorySlug: "sapata-base-lisa",
  formatSlug: "redonda",
  values: { diametro: 28, alturaBase: 6 },
  quantity: 4,
  unitPriceBrl: 10,
  totalPriceBrl: 40
};

function hangingFetch() {
  return (_url, { signal } = {}) => new Promise((_resolve, reject) => {
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

function jsonFetch(payload, status = 200) {
  return async () => new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function withEnv(values, operation) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const melhorEnvioEnv = {
  SHIPPING_PROVIDER: "melhor_envio",
  MELHOR_ENVIO_ACCESS_TOKEN: "test-token",
  SHIPPING_ORIGIN_POSTAL_CODE: "01001000",
  MELHOR_ENVIO_TIMEOUT_MS: "100",
  MELHOR_ENVIO_PREFERRED_SERVICE_IDS: undefined
};

test("readTimeoutMs usa padrao para valores ausentes ou invalidos e limita a faixa", () => {
  return withEnv({ TEST_PROVIDER_TIMEOUT_MS: undefined }, () => {
    assert.equal(readTimeoutMs("TEST_PROVIDER_TIMEOUT_MS", 8000), 8000);
    process.env.TEST_PROVIDER_TIMEOUT_MS = "abc";
    assert.equal(readTimeoutMs("TEST_PROVIDER_TIMEOUT_MS", 8000), 8000);
    process.env.TEST_PROVIDER_TIMEOUT_MS = "0";
    assert.equal(readTimeoutMs("TEST_PROVIDER_TIMEOUT_MS", 8000), 8000);
    process.env.TEST_PROVIDER_TIMEOUT_MS = "999999";
    assert.equal(readTimeoutMs("TEST_PROVIDER_TIMEOUT_MS", 8000), 60_000);
    process.env.TEST_PROVIDER_TIMEOUT_MS = "2500";
    assert.equal(readTimeoutMs("TEST_PROVIDER_TIMEOUT_MS", 8000), 2500);
  });
});

test("fetchWithTimeout converte timeout em erro com code e devolve corpo bufferizado", async () => {
  await withEnv({}, async () => {
    globalThis.fetch = hangingFetch();
    await assert.rejects(
      fetchWithTimeout("https://provider.test", {}, { timeoutMs: 50, timeoutCode: "provider_x_timeout" }),
      (error) => error.code === "provider_x_timeout" && error.retryable === true && error.timeoutMs === 50
    );

    globalThis.fetch = jsonFetch({ ok: true }, 201);
    const response = await fetchWithTimeout("https://provider.test", {}, { timeoutMs: 50 });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });

    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal((await fetchWithTimeout("https://provider.test", {}, { timeoutMs: 50 })).status, 204);

    globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
    await assert.rejects(
      fetchWithTimeout("https://provider.test", {}, { timeoutMs: 50 }),
      (error) => error instanceof TypeError
    );
  });
});

test("Mercado Pago lento vira erro mercado_pago_timeout", async () => {
  await withEnv({ MERCADO_PAGO_ACCESS_TOKEN: "test-token", MERCADO_PAGO_TIMEOUT_MS: "100" }, async () => {
    const signals = [];
    globalThis.fetch = (url, init) => {
      signals.push(init.signal);
      return hangingFetch()(url, init);
    };
    await assert.rejects(fetchMercadoPagoPayment("123"), { code: "mercado_pago_timeout" });
    await assert.rejects(searchMercadoPagoPaymentsByReference("order-1"), { code: "mercado_pago_timeout" });
    assert.ok(signals.every((signal) => signal instanceof AbortSignal));
  });
});

test("timeout do Melhor Envio cai no fallback manual com provider_error", async () => {
  await withEnv(melhorEnvioEnv, async () => {
    globalThis.fetch = hangingFetch();
    const quote = await quoteShipping({
      items: [shippingItem],
      shippingAddress: { postalCode: "01310-100", state: "SP" },
      itemsSubtotalBrl: 40
    });
    assert.equal(quote.status, "provider_error");
    assert.equal(quote.source, "manual_fallback");
    assert.equal(quote.error.code, "melhor_envio_timeout");
  });
});

test("cotacao Melhor Envio nunca usa o desconto como preco", async () => {
  await withEnv(melhorEnvioEnv, async () => {
    globalThis.fetch = jsonFetch([
      { id: 1, name: "PAC", price: null, discount: "5.00", delivery_time: 8 },
      { id: 2, name: "SEDEX", price: "30.50", discount: "2.00", delivery_time: 3 }
    ]);
    const quote = await quoteShipping({
      items: [shippingItem],
      shippingAddress: { postalCode: "01310100", state: "SP" },
      itemsSubtotalBrl: 40
    });
    assert.equal(quote.status, "quoted");
    assert.equal(quote.serviceId, "2");
    assert.equal(quote.amountBrl, 30.5);
    assert.deepEqual(quote.alternatives, []);

    globalThis.fetch = jsonFetch([{ id: 1, name: "PAC", discount: "5.00" }]);
    const onlyDiscount = await quoteShipping({
      items: [shippingItem],
      shippingAddress: { postalCode: "01310100", state: "SP" },
      itemsSubtotalBrl: 40
    });
    assert.equal(onlyDiscount.status, "provider_error");
    assert.equal(onlyDiscount.error.code, "melhor_envio_no_service");
  });
});

test("CEP com mais de 8 digitos e rejeitado em vez de truncado", async () => {
  assert.equal(sanitizePostalCode("01310-100"), "01310100");
  assert.equal(sanitizePostalCode("0131"), "0131");
  assert.equal(sanitizePostalCode("013101009"), "");
  assert.equal(sanitizePostalCode("01310-100-9"), "");

  await withEnv(melhorEnvioEnv, async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response("[]");
    };
    const quote = await quoteShipping({
      items: [shippingItem],
      shippingAddress: { postalCode: "013101009", state: "SP" },
      itemsSubtotalBrl: 40
    });
    assert.equal(quote.status, "pending_address");
    assert.equal(called, false);
  });
});

test("timeouts do banco tem padroes conservadores e aceitam override", () => {
  assert.deepEqual(getTransactionTimeouts({}), {
    statementTimeoutMs: 15_000,
    lockTimeoutMs: 5_000,
    idleInTransactionTimeoutMs: 30_000
  });
  assert.deepEqual(getPoolTimeouts({}), { connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 });
  assert.equal(
    buildBeginStatement({ DATABASE_STATEMENT_TIMEOUT_MS: "20000", DATABASE_LOCK_TIMEOUT_MS: "x" }),
    "begin; set local statement_timeout = 20000; set local lock_timeout = 5000; "
      + "set local idle_in_transaction_session_timeout = 30000"
  );
  assert.equal(getTransactionTimeouts({ DATABASE_STATEMENT_TIMEOUT_MS: "1; drop table x" }).statementTimeoutMs, 15_000);
});

test("rollback com falha nao mascara o erro original e descarta a conexao", async () => {
  const databaseUrl = "postgres://test@localhost:5432/test";
  const stateKey = Symbol.for("baseforma.postgres.pool");
  const previousState = globalThis[stateKey];
  const released = [];
  const statements = [];
  const listeners = new Map();
  const client = {
    async query(text) {
      statements.push(text);
      if (text === "rollback") throw new Error("connection terminated");
      return { rows: [] };
    },
    on(event, listener) { listeners.set(event, listener); },
    removeListener(event) { listeners.delete(event); },
    release(error) { released.push(error); }
  };
  globalThis[stateKey] = {
    pool: { connect: async () => client },
    connectionKey: `${databaseUrl}|ssl:off`,
    creating: null
  };

  try {
    await withEnv({ DATABASE_URL: databaseUrl }, async () => {
      await assert.rejects(
        withTransaction(async () => { throw new Error("operation failed"); }),
        { message: "operation failed" }
      );
    });
    assert.match(statements[0], /^begin; set local statement_timeout = \d+/);
    assert.equal(released.length, 1);
    assert.equal(released[0]?.message, "connection terminated");
    assert.equal(listeners.size, 0);
  } finally {
    globalThis[stateKey] = previousState;
  }
});
