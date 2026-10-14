import assert from "node:assert/strict";
import test from "node:test";

import { getOutboxEventBudgetMs, processOutboxBatch } from "../lib/outbox-processor.js";

async function withProviderTimeouts(values, operation) {
  const previous = Object.fromEntries(
    ["FOCUS_NFE_TIMEOUT_MS", "RESEND_TIMEOUT_MS"].map((key) => [key, process.env[key]])
  );
  for (const key of Object.keys(previous)) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    return await operation();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("HTTP outbox leaves the next event unclaimed after a slow invoice", async () => {
  await withProviderTimeouts({}, async () => {
    let elapsed = 0;
    let claims = 0;
    let completions = 0;
    const result = await processOutboxBatch({ limit: 10, deadlineAt: 55_000 }, {
      now: () => elapsed,
      claim: async () => ({ event: { id: `event-${++claims}` }, leaseToken: "lease" }),
      dispatch: async () => {
        // POST followed by GET after a duplicate-reference response.
        elapsed += 30_000;
        return { outcome: "invoice_requested" };
      },
      complete: async () => { completions += 1; return {}; }
    });
    assert.equal(result.processed, 1);
    assert.equal(result.succeeded, 1);
    assert.equal(result.budgetExhausted, true);
    assert.equal(result.eventBudgetMs, 45_000);
    assert.equal(claims, 1);
    assert.equal(completions, 1);
  });
});

test("fast outbox batches keep the requested limit within the deadline", async () => {
  await withProviderTimeouts({}, async () => {
    let claims = 0;
    const result = await processOutboxBatch({ limit: 25, deadlineAt: 55_000 }, {
      now: () => claims * 100,
      claim: async () => ({ event: { id: `event-${++claims}` }, leaseToken: "lease" }),
      dispatch: async () => ({ outcome: "email_sent" }),
      complete: async () => ({})
    });
    assert.equal(result.processed, 25);
    assert.equal(result.budgetExhausted, false);
  });
});

test("configured provider timeouts determine whether another event fits", async () => {
  await withProviderTimeouts({ FOCUS_NFE_TIMEOUT_MS: "30000" }, async () => {
    assert.equal(getOutboxEventBudgetMs(), 75_000);
    const result = await processOutboxBatch({ deadlineAt: 55_000 }, {
      now: () => 0,
      claim: async () => assert.fail("an event cannot fit and must remain queued")
    });
    assert.equal(result.processed, 0);
    assert.equal(result.budgetExhausted, true);
    assert.equal(result.eventBudgetMs, 75_000);
  });
  await withProviderTimeouts({ RESEND_TIMEOUT_MS: "60000" }, async () => {
    assert.equal(getOutboxEventBudgetMs(), 75_000);
  });
});
