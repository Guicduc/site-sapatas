import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { closePool } from "../lib/db.js";

import {
  assertProductionSystemRequest,
  getProductionSystemMode
} from "../lib/production-handoff-auth.js";
import { getProductionHandoffHttpError } from "../lib/production-handoff-http.js";
import {
  buildProductionWorkSnapshot,
  normalizeProductionMilestoneInput,
  resolveProductionMilestoneTransition
} from "../lib/production-handoff.js";
import {
  acknowledgeProductionWork,
  claimProductionWorkRoute,
  pullProductionWork,
  PRODUCTION_WORK_ROUTE,
  recordProductionMilestone,
  stageProductionHandoff
} from "../lib/production-handoff-store.js";

const originalEnv = {
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL,
  mode: process.env.PRODUCTION_SYSTEM_MODE,
  token: process.env.PRODUCTION_SYSTEM_TOKEN,
  adminToken: process.env.ADMIN_ACCESS_TOKEN
};

process.env.DATABASE_URL = "postgresql://production-handoff-test";
process.env.PRODUCTION_SYSTEM_MODE = "active";
process.env.PRODUCTION_SYSTEM_TOKEN = "production-only-secret";
process.env.ADMIN_ACCESS_TOKEN = "human-admin-secret";

test.after(() => {
  restoreEnv("DATABASE_URL", originalEnv.databaseUrl);
  restoreEnv("DATABASE_SSL", originalEnv.databaseSsl);
  restoreEnv("PRODUCTION_SYSTEM_MODE", originalEnv.mode);
  restoreEnv("PRODUCTION_SYSTEM_TOKEN", originalEnv.token);
  restoreEnv("ADMIN_ACCESS_TOKEN", originalEnv.adminToken);
});

test("autentica apenas o bearer dedicado e falha fechado", () => {
  assert.equal(getProductionSystemMode(), "active");
  assert.equal(assertProductionSystemRequest(requestWithBearer("production-only-secret")).allowed, true);
  assert.throws(
    () => assertProductionSystemRequest(requestWithBearer("human-admin-secret")),
    (error) => error.code === "production_system_unauthorized"
  );
  assert.throws(
    () => assertProductionSystemRequest(requestWithBearer("")),
    (error) => error.code === "production_system_unauthorized"
  );

  delete process.env.PRODUCTION_SYSTEM_TOKEN;
  assert.throws(
    () => assertProductionSystemRequest(requestWithBearer("production-only-secret")),
    (error) => error.code === "production_system_not_configured"
  );
  process.env.PRODUCTION_SYSTEM_TOKEN = "production-only-secret";

  process.env.PRODUCTION_SYSTEM_MODE = "actve";
  assert.throws(
    () => assertProductionSystemRequest(requestWithBearer("production-only-secret")),
    (error) => error.code === "production_system_mode_invalid"
  );
  process.env.PRODUCTION_SYSTEM_MODE = "active";

  process.env.PRODUCTION_SYSTEM_MODE = "disabled";
  assert.throws(
    () => assertProductionSystemRequest(requestWithBearer("production-only-secret")),
    (error) => error.code === "production_system_disabled"
  );
  process.env.PRODUCTION_SYSTEM_MODE = "active";
});

test("snapshot de producao usa allowlist e exclui dados comerciais, pessoais e CAD", () => {
  const snapshot = buildProductionWorkSnapshot(buildPaidOrder());
  assert.deepEqual(snapshot, {
    schemaVersion: 1,
    workId: "production-work-v1:order-1",
    order: {
      orderId: "order-1",
      orderNumber: "BF-001"
    },
    items: [{
      itemId: "item-1",
      sku: "BF-RD-28",
      categorySlug: "sapata-base-lisa",
      formatSlug: "redonda",
      configuration: { diametro: 28, alturaBase: 6, pescoco: false },
      color: "Preta",
      finish: "Fosco",
      quantity: 4
    }]
  });

  const forbidden = new Set([
    "customer", "email", "document", "shippingAddress", "payment", "paymentStatus",
    "totalBrl", "unitPriceBrl", "priceBreakdown", "invoice", "cad", "sourceGh",
    "machine", "lease", "artifacts", "metadata"
  ]);
  assert.deepEqual(findForbiddenKeys(snapshot, forbidden), []);
});

test("snapshot rejeita dados comprados que seriam truncados ou alterados", () => {
  const invalidItems = [
    { quantity: 0 }, { quantity: -1 }, { quantity: 1.5 }, { quantity: 10001 },
    { quantity: NaN }, { quantity: Infinity }, { quantity: "4" },
    { values: {} }, { values: null }, { values: [] },
    { values: { diametro: NaN } }, { values: { diametro: Infinity } },
    { values: { diametro: null } }, { values: { diametro: { nested: 28 } } },
    { sku: "X".repeat(161) }
  ];
  for (const invalid of invalidItems) {
    const order = buildPaidOrder();
    Object.assign(order.items[0], invalid);
    assert.throws(() => buildProductionWorkSnapshot(order), { code: "production_work_invalid_snapshot" });
  }
  const order = buildPaidOrder();
  order.items.push(structuredClone(order.items[0]));
  assert.throws(() => buildProductionWorkSnapshot(order), { code: "production_work_invalid_snapshot" });
});

test("revisao de pagamento impede staging, acknowledgement e novos marcos", async () => {
  const order = buildPaidOrder();
  order.metadata.paymentReview = { reason: "amount_mismatch" };
  assert.throws(() => buildProductionWorkSnapshot(order), { code: "production_work_not_eligible" });
  const database = fakeProductionDatabase(buildPaidOrder());
  const dependencies = { withTransaction: database.withTransaction, query: database.client.query };
  assert.equal(await stageProductionHandoff(database.client, order), null);
  const handoff = await stageProductionHandoff(database.client, buildPaidOrder());
  const stored = database.orders.get(order.id);
  stored.metadata.paymentReview = order.metadata.paymentReview;
  await assert.rejects(() => acknowledgeProductionWork({
    workId: handoff.id, idempotencyKey: "review-ack"
  }, dependencies), { code: "production_order_not_active" });
  delete stored.metadata.paymentReview;
  await acknowledgeProductionWork({ workId: handoff.id, idempotencyKey: "review-ack" }, dependencies);
  stored.metadata.paymentReview = order.metadata.paymentReview;
  await assert.rejects(() => recordProductionMilestone({
    workId: handoff.id, eventId: "review-event", milestone: "accepted", occurredAt: "2026-08-21T11:00:00Z"
  }, dependencies), { code: "production_order_not_active" });
});

test("valida marcos comerciais sem regressao e reduz falha a motivo coarse", () => {
  assert.deepEqual(resolveProductionMilestoneTransition("queued", "accepted"), {
    status: "in_production", changed: true
  });
  assert.deepEqual(resolveProductionMilestoneTransition("in_production", "produced"), {
    status: "ready_to_ship", changed: true
  });
  assert.deepEqual(resolveProductionMilestoneTransition("in_production", "failed"), {
    status: "blocked", changed: true
  });
  assert.throws(
    () => resolveProductionMilestoneTransition("ready_to_ship", "accepted"),
    (error) => error.code === "production_milestone_transition_invalid"
  );
  assert.equal(normalizeProductionMilestoneInput({
    workId: "work-1",
    eventId: "event-1",
    milestone: "failed",
    occurredAt: "2026-08-21T11:00:00Z",
    failureReason: "grasshopper_stack_trace"
  }).failureReason, "unknown");
});

test("pull repete snapshot ate ack e ack concorrente permanece idempotente", async () => {
  const database = fakeProductionDatabase(buildPaidOrder());
  const dependencies = { withTransaction: database.withTransaction };

  const first = await pullProductionWork({ limit: 5, consumerId: "factory-a" }, dependencies);
  const retry = await pullProductionWork({ limit: 5, consumerId: "factory-a" }, dependencies);
  assert.equal(first.works.length, 1);
  assert.deepEqual(retry.works, first.works);
  assert.equal(database.handoffs.get(first.works[0].workId).delivery_count, 2);

  const [ack1, ack2] = await Promise.all([
    acknowledgeProductionWork({
      workId: first.works[0].workId,
      idempotencyKey: "ack-order-1",
      consumerId: "factory-a"
    }, dependencies),
    acknowledgeProductionWork({
      workId: first.works[0].workId,
      idempotencyKey: "ack-order-1",
      consumerId: "factory-a"
    }, dependencies)
  ]);
  assert.deepEqual(ack2, ack1);
  assert.equal((await pullProductionWork({ limit: 5 }, dependencies)).works.length, 0);
  await assert.rejects(
    acknowledgeProductionWork({
      workId: first.works[0].workId,
      idempotencyKey: "different-ack"
    }, dependencies),
    (error) => error.code === "production_ack_conflict"
  );
});

test("pull e ack suprimem trabalho que deixou de ser elegivel", async () => {
  const database = fakeProductionDatabase(buildPaidOrder());
  const dependencies = { withTransaction: database.withTransaction };
  const first = await pullProductionWork({ limit: 1 }, dependencies);
  const workId = first.works[0].workId;
  database.orders.get("order-1").metadata.fulfillment.production.status = "blocked";

  assert.equal((await pullProductionWork({ limit: 1 }, dependencies)).works.length, 0);
  await assert.rejects(
    acknowledgeProductionWork({ workId, idempotencyKey: "stale-ack" }, dependencies),
    (error) => error.code === "production_order_not_active"
  );
});

test("marcos concorrentes serializam, preservam metadados e repetem por eventId", async () => {
  const database = fakeProductionDatabase(buildPaidOrder());
  const dependencies = { withTransaction: database.withTransaction, query: database.client.query };
  const pulled = await pullProductionWork({ limit: 1 }, dependencies);
  const workId = pulled.works[0].workId;
  const acknowledgement = await acknowledgeProductionWork({ workId, idempotencyKey: "ack-1" }, dependencies);

  const acceptedInput = {
    workId,
    eventId: "event-accepted-1",
    milestone: "accepted",
    occurredAt: "2026-08-21T11:00:00Z"
  };
  const producedInput = {
    workId,
    eventId: "event-produced-1",
    milestone: "produced",
    occurredAt: "2026-08-21T12:00:00Z"
  };
  const [producedBeforeAccepted, acceptedResult] = await Promise.allSettled([
    recordProductionMilestone(producedInput, dependencies),
    recordProductionMilestone(acceptedInput, dependencies)
  ]);
  assert.equal(producedBeforeAccepted.status, "rejected");
  assert.equal(producedBeforeAccepted.reason.code, "production_milestone_transition_invalid");
  assert.equal(acceptedResult.status, "fulfilled");
  const accepted = acceptedResult.value;
  const produced = await recordProductionMilestone(producedInput, dependencies);
  assert.equal(accepted.productionStatus, "in_production");
  assert.equal(produced.productionStatus, "ready_to_ship");
  assert.deepEqual(await recordProductionMilestone(producedInput, dependencies), produced);
  assert.deepEqual(
    await acknowledgeProductionWork({ workId, idempotencyKey: "ack-1" }, dependencies),
    acknowledgement
  );

  const order = database.orders.get("order-1");
  assert.equal(order.metadata.fulfillment.production.status, "ready_to_ship");
  assert.equal(order.metadata.fulfillment.invoice.status, "api_issued");
  assert.equal(order.metadata.fulfillment.shipment.carrier, "Correios");
  assert.equal(database.events.size, 2);

  await assert.rejects(
    recordProductionMilestone({ ...producedInput, milestone: "failed" }, dependencies),
    (error) => error.code === "production_idempotency_conflict"
  );
});

test("roteamento concorrente escolhe uma unica fila por pedido", async () => {
  const database = fakeProductionDatabase(buildPaidOrder());
  const [legacy, external] = await Promise.all([
    claimProductionWorkRoute(
      "order-1",
      PRODUCTION_WORK_ROUTE.LEGACY_PRINT_QUEUE,
      "legacy-test",
      database.client
    ),
    claimProductionWorkRoute(
      "order-1",
      PRODUCTION_WORK_ROUTE.EXTERNAL,
      "external-test",
      database.client
    )
  ]);
  assert.equal(legacy, PRODUCTION_WORK_ROUTE.EXTERNAL);
  assert.equal(external, legacy);
  assert.equal(database.routes.size, 1);
});

test("evento atrasado nao desfaz falha de producao mais nova", async () => {
  const database = fakeProductionDatabase(buildPaidOrder());
  const dependencies = { withTransaction: database.withTransaction, query: database.client.query };
  const workId = (await pullProductionWork({ limit: 1 }, dependencies)).works[0].workId;
  await acknowledgeProductionWork({ workId, idempotencyKey: "ack-chronology" }, dependencies);
  await recordProductionMilestone({
    workId,
    eventId: "accepted-on-time",
    milestone: "accepted",
    occurredAt: "2026-08-21T11:00:00Z"
  }, dependencies);
  await recordProductionMilestone({
    workId,
    eventId: "failed-newer",
    milestone: "failed",
    occurredAt: "2026-08-21T13:00:00Z",
    failureReason: "quality_issue"
  }, dependencies);

  await assert.rejects(
    recordProductionMilestone({
      workId,
      eventId: "accepted-delayed",
      milestone: "accepted",
      occurredAt: "2026-08-21T12:00:00Z"
    }, dependencies),
    (error) => error.code === "production_milestone_out_of_order"
  );
  assert.equal(database.orders.get("order-1").metadata.fulfillment.production.status, "blocked");
});

test("schema versionado contem handoff, eventos e roteamento sem DDL no runtime", async () => {
  const migration = await readFile(
    new URL("../docs/ops/migrations/20260821_production_system_handoff.sql", import.meta.url),
    "utf8"
  );
  const runtimeStore = await readFile(new URL("../lib/production-handoff-store.js", import.meta.url), "utf8");
  assert.match(migration, /create table if not exists production_work_routes/i);
  assert.match(migration, /create table if not exists production_handoffs/i);
  assert.match(migration, /create table if not exists production_handoff_rejections/i);
  assert.match(migration, /create table if not exists production_milestone_events/i);
  assert.doesNotMatch(runtimeStore, /\bcreate\s+table\b/i);
  assert.doesNotMatch(runtimeStore, /\balter\s+table\b/i);
});

test("snapshot historico invalido e isolado sem abortar pagamento ou pull", async () => {
  const database = fakeProductionDatabase(buildPaidOrder());
  const invalidOrder = {
    ...buildPaidOrder(),
    id: "order-invalid",
    orderNumber: "BF-INVALID",
    items: [{ ...buildPaidOrder().items[0], id: "item-invalid", sku: "" }]
  };
  assert.equal(await stageProductionHandoff(database.client, invalidOrder), null);
  assert.deepEqual(database.rejections.get("order-invalid"), {
    code: "invalid_snapshot",
    details: { itemCount: 1 }
  });
  assert.equal(database.handoffs.size, 0);
});

test("Postgres serializa ack e marcos concorrentes quando TEST_DATABASE_URL existe", {
  skip: !process.env.TEST_DATABASE_URL
}, async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousDatabaseSsl = process.env.DATABASE_SSL;
  const orderId = `production-pg-${randomUUID()}`;
  const itemId = `item-${randomUUID()}`;
  const orderNumber = `BF-PG-${randomUUID().slice(0, 8)}`;
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, ssl: false });
  const migration = await readFile(
    new URL("../docs/ops/migrations/20260821_production_system_handoff.sql", import.meta.url),
    "utf8"
  );

  try {
    await closePool();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.DATABASE_SSL = "false";
    process.env.PRODUCTION_SYSTEM_MODE = "active";
    await pool.query(migration);
    await pool.query(
      `insert into orders (
         id, order_number, source, status, payment_status, total_brl,
         lead_time_days, metadata
       ) values ($1,$2,'configurator','paid_ready_for_production','approved',42,5,$3::jsonb)`,
      [orderId, orderNumber, JSON.stringify({
        fulfillment: {
          production: { status: "queued" },
          invoice: { status: "api_pending" },
          shipment: { status: "pending" },
          history: []
        }
      })]
    );
    await pool.query(
      `insert into order_items (
         id, order_id, category_slug, category_name, format_slug, format_name,
         sku, values, color, finish, quantity
       ) values ($1,$2,'sapata-base-lisa','Sapata base lisa','redonda','Redonda',
                 'BF-PG-RD-28',$3::jsonb,'Preta','Fosco',4)`,
      [itemId, orderId, JSON.stringify({ diametro: 28, alturaBase: 6 })]
    );

    const workId = (await pullProductionWork({ limit: 50 })).works
      .find((work) => work.order.orderId === orderId)?.workId;
    assert.ok(workId);
    await pool.query(`update orders set metadata = metadata || '{"paymentReview":{"reason":"amount_mismatch"}}'::jsonb where id = $1`, [orderId]);
    assert.equal((await pullProductionWork({ limit: 50 })).works.some((work) => work.workId === workId), false);
    await assert.rejects(() => acknowledgeProductionWork({ workId, idempotencyKey: `ack:${orderId}` }), {
      code: "production_order_not_active"
    });
    await pool.query(`update orders set metadata = metadata - 'paymentReview' where id = $1`, [orderId]);
    const acknowledgements = await Promise.all([
      acknowledgeProductionWork({ workId, idempotencyKey: `ack:${orderId}` }),
      acknowledgeProductionWork({ workId, idempotencyKey: `ack:${orderId}` })
    ]);
    assert.deepEqual(acknowledgements[1], acknowledgements[0]);

    await Promise.allSettled([
      recordProductionMilestone({
        workId, eventId: `accepted:${orderId}`, milestone: "accepted",
        occurredAt: "2026-08-21T11:00:00Z"
      }),
      recordProductionMilestone({
        workId, eventId: `failed:${orderId}`, milestone: "failed",
        occurredAt: "2026-08-21T12:00:00Z", failureReason: "production_error"
      })
    ]);
    const stored = await pool.query(`select metadata from orders where id = $1`, [orderId]);
    assert.equal(stored.rows[0].metadata.fulfillment.production.status, "blocked");
  } finally {
    await pool.query(`delete from orders where id = $1`, [orderId]).catch(() => {});
    await pool.end();
    await closePool();
    process.env.DATABASE_URL = previousDatabaseUrl;
    restoreEnv("DATABASE_SSL", previousDatabaseSsl);
  }
});

test("erros de contrato recebem status HTTP estavel", () => {
  assert.equal(getProductionHandoffHttpError({ code: "production_system_unauthorized" }).status, 401);
  assert.equal(getProductionHandoffHttpError({ code: "production_work_not_found" }).status, 404);
  assert.equal(getProductionHandoffHttpError({ code: "production_idempotency_conflict" }).status, 409);
  assert.equal(getProductionHandoffHttpError({ code: "production_system_requires_postgres" }).status, 503);
});

function fakeProductionDatabase(order) {
  const orders = new Map([[order.id, toOrderRow(order)]]);
  const items = order.items.map((item) => toItemRow(order.id, item));
  const handoffs = new Map();
  const routes = new Map();
  const events = new Map();
  const rejections = new Map();
  let transactionTail = Promise.resolve();

  const client = {
    async query(sql, params = []) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      if (statement.startsWith("select o.id from orders o")) return { rows: [] };
      if (statement.startsWith("select o.* from orders o")) {
        const rows = [...orders.values()].filter((row) => !handoffs.has(`production-work-v1:${row.id}`));
        return { rows: rows.slice(0, Number(params[2] || 10)) };
      }
      if (statement.startsWith("select * from order_items")) {
        return { rows: items.filter((item) => params[0].includes(item.order_id)) };
      }
      if (statement.startsWith("insert into production_handoffs")) {
        if ([...handoffs.values()].some((row) => row.order_id === params[1])) return { rows: [] };
        const row = {
          id: params[0], order_id: params[1], schema_version: params[2],
          snapshot: JSON.parse(params[3]), snapshot_sha256: params[4],
          available_at: null, delivery_count: 0, first_delivered_at: null,
          last_delivered_at: null, acknowledged_at: null,
          acknowledgement_idempotency_key: null, acknowledged_by: null,
          created_at: now(), updated_at: now()
        };
        handoffs.set(row.id, row);
        return { rows: [row] };
      }
      if (statement.startsWith("insert into production_handoff_rejections")) {
        if (!rejections.has(params[0])) {
          rejections.set(params[0], { code: "invalid_snapshot", details: JSON.parse(params[1]) });
        }
        return { rows: [] };
      }
      if (statement.startsWith("select * from production_handoffs where order_id")) {
        return { rows: [...handoffs.values()].filter((row) => row.order_id === params[0]) };
      }
      if (statement.includes("where h.available_at is not null and h.acknowledged_at is null")) {
        return {
          rows: [...handoffs.values()].filter((row) => {
            const order = orders.get(row.order_id);
            const productionStatus = order.metadata.fulfillment.production.status;
            return row.available_at && !row.acknowledged_at
              && order.payment_status === "approved"
              && !params[0].includes(order.status)
              && !params[1].includes(productionStatus);
          }).slice(0, params[2])
        };
      }
      if (statement.startsWith("select h.* from production_handoffs h")) {
        return {
          rows: [...handoffs.values()].filter((row) => (
            !row.available_at && !row.acknowledged_at && routes.get(row.order_id) !== "legacy_print_queue"
          )).slice(0, params[2])
        };
      }
      if (statement.startsWith("insert into production_work_routes")) {
        if (!routes.has(params[0])) routes.set(params[0], params[1]);
        return { rows: [] };
      }
      if (statement.startsWith("select route from production_work_routes")) {
        return { rows: routes.has(params[0]) ? [{ route: routes.get(params[0]) }] : [] };
      }
      if (statement.startsWith("update production_handoffs set available_at")) {
        const row = handoffs.get(params[0]);
        if (!row || row.acknowledged_at) return { rows: [] };
        row.available_at ||= now();
        row.updated_at = now();
        return { rows: [row] };
      }
      if (statement.startsWith("update production_handoffs set delivery_count")) {
        const rows = params[0].map((id) => handoffs.get(id)).filter(Boolean);
        for (const row of rows) {
          row.delivery_count += 1;
          row.first_delivered_at ||= now();
          row.last_delivered_at = now();
          row.updated_at = now();
        }
        return { rows };
      }
      if (statement.startsWith("select * from production_handoffs where acknowledgement_idempotency_key")) {
        return { rows: [...handoffs.values()].filter((row) => row.acknowledgement_idempotency_key === params[0]) };
      }
      if (statement.startsWith("select h.*, o.status as order_status")) {
        const handoff = handoffs.get(params[0]);
        if (!handoff) return { rows: [] };
        const order = orders.get(handoff.order_id);
        return { rows: [{
          ...handoff,
          order_status: order.status,
          payment_status: order.payment_status,
          order_metadata: order.metadata
        }] };
      }
      if (statement.startsWith("update production_handoffs set acknowledged_at")) {
        const row = handoffs.get(params[0]);
        if (!row || row.acknowledged_at) return { rows: [] };
        row.acknowledged_at = now();
        row.acknowledgement_idempotency_key = params[1];
        row.acknowledged_by = params[2];
        row.updated_at = now();
        return { rows: [row] };
      }
      if (statement.startsWith("select * from production_milestone_events")) {
        return { rows: events.has(params[0]) ? [events.get(params[0])] : [] };
      }
      if (statement.startsWith("select external_event_id, occurred_at")) {
        const rows = [...events.values()]
          .filter((row) => row.handoff_id === params[0])
          .sort((left, right) => String(right.occurred_at).localeCompare(String(left.occurred_at)));
        return { rows: rows.slice(0, 1) };
      }
      if (statement.startsWith("select h.*, o.order_number")) {
        const handoff = handoffs.get(params[0]);
        if (!handoff) return { rows: [] };
        const row = orders.get(handoff.order_id);
        return { rows: [{
          ...handoff,
          order_number: row.order_number,
          order_source: row.source,
          order_status: row.status,
          payment_status: row.payment_status,
          total_brl: row.total_brl,
          lead_time_days: row.lead_time_days,
          order_notes: row.notes,
          order_metadata: row.metadata,
          order_created_at: row.created_at,
          order_updated_at: row.updated_at
        }] };
      }
      if (statement.startsWith("update orders set status")) {
        const row = orders.get(params[2]);
        row.status = params[0];
        row.metadata = JSON.parse(params[1]);
        row.updated_at = now();
        return { rows: [] };
      }
      if (statement.startsWith("insert into production_milestone_events")) {
        if (events.has(params[1])) {
          const error = new Error("duplicate");
          error.code = "23505";
          throw error;
        }
        const row = {
          id: params[0], external_event_id: params[1], handoff_id: params[2],
          order_id: params[3], milestone: params[4], occurred_at: params[5],
          request_hash: params[6], failure_reason: params[7], result: JSON.parse(params[8]),
          created_at: now()
        };
        events.set(row.external_event_id, row);
        return { rows: [row] };
      }
      throw new Error(`Fake DB query not implemented: ${statement}`);
    }
  };

  async function withTransaction(operation) {
    const previous = transactionTail;
    let release;
    transactionTail = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation(client);
    } finally {
      release();
    }
  }

  return { orders, handoffs, routes, events, rejections, client, withTransaction };
}

function buildPaidOrder() {
  return {
    id: "order-1",
    orderNumber: "BF-001",
    source: "configurator",
    status: "paid_ready_for_production",
    paymentStatus: "approved",
    totalBrl: 500,
    leadTimeDays: 5,
    customer: { email: "secret@example.com", document: "52998224725" },
    items: [{
      id: "item-1",
      categorySlug: "sapata-base-lisa",
      categoryName: "Sapata base lisa",
      formatSlug: "redonda",
      formatName: "Redonda",
      sku: "BF-RD-28",
      values: { diametro: 28, alturaBase: 6, pescoco: false },
      color: "Preta",
      finish: "Fosco",
      quantity: 4,
      unitPriceBrl: 125,
      totalPriceBrl: 500,
      priceBreakdown: { materialGrams: 40, sourceGh: "secret.gh" }
    }],
    metadata: {
      shippingAddress: { street: "Rua secreta" },
      payment: { providerPaymentId: "mp-secret" },
      cad: { sourceGh: "Produtos/secret.gh", machine: "P2S-04" },
      fulfillment: {
        production: { status: "queued", machine: "P2S-04" },
        invoice: { status: "api_issued", accessKey: "secret" },
        shipment: { status: "pending", carrier: "Correios" },
        history: []
      }
    },
    createdAt: "2026-08-21T10:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z"
  };
}

function toOrderRow(order) {
  return {
    id: order.id, order_number: order.orderNumber, source: order.source, status: order.status,
    payment_status: order.paymentStatus, total_brl: order.totalBrl,
    lead_time_days: order.leadTimeDays, notes: "", metadata: structuredClone(order.metadata),
    created_at: order.createdAt, updated_at: order.updatedAt
  };
}

function toItemRow(orderId, item) {
  return {
    id: item.id, order_id: orderId, category_slug: item.categorySlug,
    category_name: item.categoryName, format_slug: item.formatSlug,
    format_name: item.formatName, sku: item.sku, values: structuredClone(item.values),
    color: item.color, finish: item.finish, quantity: item.quantity,
    unit_price_brl: item.unitPriceBrl, total_price_brl: item.totalPriceBrl,
    lead_time_days: 5, status: "valid", validation_issues: [],
    price_breakdown: structuredClone(item.priceBreakdown), created_at: now()
  };
}

function requestWithBearer(token) {
  return { headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}) };
}

function findForbiddenKeys(value, forbidden, path = "root") {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(forbidden.has(key) ? [`${path}.${key}`] : []),
    ...findForbiddenKeys(entry, forbidden, `${path}.${key}`)
  ]);
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function now() {
  return "2026-08-21T13:00:00.000Z";
}
