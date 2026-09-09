import { randomUUID } from "node:crypto";

import { getDatabaseMode, query, withTransaction } from "./db.js";
import {
  buildFulfillmentMetadata,
  getOrderStatusForFulfillment,
  normalizeFulfillment
} from "./fulfillment.js";
import {
  buildMilestoneFulfillmentPatch,
  buildProductionWorkId,
  buildProductionWorkSnapshot,
  hashCanonical,
  isProductionEligibleOrder,
  normalizeAcknowledgementInput,
  normalizeProductionMilestoneInput,
  productionHandoffError,
  resolveProductionMilestoneTransition
} from "./production-handoff.js";
import {
  getProductionSystemMode,
  getProductionSystemModeConfig,
  hasProductionSystemCredential,
  PRODUCTION_SYSTEM_MODE
} from "./production-handoff-auth.js";

export const PRODUCTION_WORK_ROUTE = Object.freeze({
  LEGACY_PRINT_QUEUE: "legacy_print_queue",
  EXTERNAL: "external"
});

const blockedOrderStatuses = ["cancelled", "shipped", "needs_technical_review", "paid_pending_review"];
const blockedProductionStatuses = ["blocked", "ready_to_ship", "shipped", "cancelled"];

export async function stageProductionHandoff(executor, order) {
  if (getProductionSystemMode() === PRODUCTION_SYSTEM_MODE.DISABLED || !isProductionEligibleOrder(order)) {
    return null;
  }
  const workId = buildProductionWorkId(order.id);
  let snapshot;
  try {
    snapshot = buildProductionWorkSnapshot(order, workId);
  } catch (error) {
    if (error?.code !== "production_work_invalid_snapshot") throw error;
    await executor.query(
      `insert into production_handoff_rejections (order_id, code, details)
       values ($1,'invalid_snapshot',$2::jsonb)
       on conflict (order_id) do nothing`,
      [order.id, JSON.stringify({ itemCount: order.items.length })]
    );
    observe("rejected", { orderId: order.id, code: "invalid_snapshot" });
    return null;
  }
  const snapshotHash = hashCanonical(snapshot);
  const result = await executor.query(
    `insert into production_handoffs (
       id, order_id, schema_version, snapshot, snapshot_sha256
     ) values ($1,$2,$3,$4::jsonb,$5)
     on conflict (order_id) do nothing
     returning *`,
    [workId, order.id, snapshot.schemaVersion, JSON.stringify(snapshot), snapshotHash]
  );
  let handoff = result.rows[0] ? mapHandoffRow(result.rows[0]) : null;
  if (!handoff) {
    const existing = await executor.query(`select * from production_handoffs where order_id = $1`, [order.id]);
    handoff = existing.rows[0] ? mapHandoffRow(existing.rows[0]) : null;
  }

  if (handoff && getProductionSystemMode() === PRODUCTION_SYSTEM_MODE.ACTIVE) {
    const route = await claimProductionWorkRoute(
      order.id,
      PRODUCTION_WORK_ROUTE.EXTERNAL,
      "active_mode_paid_order",
      executor
    );
    if (route === PRODUCTION_WORK_ROUTE.EXTERNAL && !handoff.availableAt) {
      const released = await executor.query(
        `update production_handoffs
         set available_at = coalesce(available_at, now()), updated_at = now()
         where id = $1 and acknowledged_at is null
         returning *`,
        [handoff.id]
      );
      if (released.rows[0]) handoff = mapHandoffRow(released.rows[0]);
    }
  }
  return handoff;
}

export async function pullProductionWork({ limit = 10, consumerId = "production-system" } = {}, dependencies = {}) {
  assertPostgresMode();
  const mode = getProductionSystemMode();
  if (mode === PRODUCTION_SYSTEM_MODE.DISABLED) {
    throw productionHandoffError("production_system_disabled", "A integracao de producao esta desativada.");
  }
  const safeLimit = boundedInteger(limit, 10, 1, 50);
  const safeConsumerId = cleanText(consumerId, 120) || "production-system";
  const transaction = dependencies.withTransaction || withTransaction;

  return transaction(async (client) => {
    const staged = await reconcileEligibleHandoffs(client, safeLimit);
    if (mode !== PRODUCTION_SYSTEM_MODE.ACTIVE) {
      return { schemaVersion: 1, mode, works: [], staged };
    }

    const pending = await client.query(
      `select h.* from production_handoffs h
       join orders o on o.id = h.order_id
       where h.available_at is not null and h.acknowledged_at is null
         and o.payment_status = 'approved'
         and coalesce(o.metadata->'paymentReview', 'null'::jsonb) = 'null'::jsonb
         and o.status <> all($1::text[])
         and coalesce(o.metadata->'fulfillment'->'production'->>'status', '') <> all($2::text[])
       order by h.available_at asc, h.created_at asc, h.id asc
       for update of h skip locked
       limit $3`,
      [blockedOrderStatuses, blockedProductionStatuses, safeLimit]
    );
    const handoffs = pending.rows.map(mapHandoffRow);
    const remaining = safeLimit - handoffs.length;
    if (remaining > 0) {
      const released = await releaseStagedHandoffs(client, remaining);
      handoffs.push(...released);
    }

    if (handoffs.length) {
      const ids = handoffs.map((handoff) => handoff.id);
      const delivered = await client.query(
        `update production_handoffs
         set delivery_count = delivery_count + 1,
             first_delivered_at = coalesce(first_delivered_at, now()),
             last_delivered_at = now(), updated_at = now()
         where id = any($1::text[])
         returning *`,
        [ids]
      );
      const byId = new Map(delivered.rows.map((row) => [row.id, mapHandoffRow(row)]));
      for (let index = 0; index < handoffs.length; index += 1) {
        handoffs[index] = byId.get(handoffs[index].id) || handoffs[index];
      }
    }

    observe("pulled", { consumerId: safeConsumerId, count: handoffs.length });
    return {
      schemaVersion: 1,
      mode,
      works: handoffs.map((handoff) => handoff.snapshot)
    };
  });
}

export async function acknowledgeProductionWork(input, dependencies = {}) {
  assertPostgresMode();
  assertActiveMode();
  const normalized = normalizeAcknowledgementInput(input);
  const transaction = dependencies.withTransaction || withTransaction;

  try {
    return await transaction(async (client) => {
      const reusedKey = await client.query(
        `select * from production_handoffs where acknowledgement_idempotency_key = $1`,
        [normalized.idempotencyKey]
      );
      if (reusedKey.rows[0] && reusedKey.rows[0].id !== normalized.workId) {
        throw productionHandoffError(
          "production_idempotency_conflict",
          "A chave de idempotencia ja foi usada para outro trabalho."
        );
      }

      await lockHandoffOrder(client, normalized.workId);
      const locked = await client.query(
        `select h.*, o.status as order_status, o.payment_status,
                o.metadata as order_metadata
         from production_handoffs h
         join orders o on o.id = h.order_id
         where h.id = $1
         for update of h, o`,
        [normalized.workId]
      );
      if (!locked.rows[0]) {
        throw productionHandoffError("production_work_not_found", "Trabalho de producao nao encontrado.");
      }
      const current = mapHandoffRow(locked.rows[0]);
      if (!current.availableAt) {
        throw productionHandoffError("production_work_not_released", "Trabalho ainda nao liberado para consumo.");
      }
      if (current.acknowledgedAt) {
        if (current.acknowledgementIdempotencyKey !== normalized.idempotencyKey) {
          throw productionHandoffError(
            "production_ack_conflict",
            "O trabalho ja foi reconhecido com outra chave de idempotencia."
          );
        }
        return buildAcknowledgement(current);
      }
      if (!isActiveHandoffOrderRow(locked.rows[0])) {
        throw productionHandoffError(
          "production_order_not_active",
          "O pedido nao esta mais elegivel para acknowledgement externo."
        );
      }

      const updated = await client.query(
        `update production_handoffs
         set acknowledged_at = now(), acknowledgement_idempotency_key = $2,
             acknowledged_by = $3, updated_at = now()
         where id = $1 and acknowledged_at is null
         returning *`,
        [normalized.workId, normalized.idempotencyKey, normalized.consumerId]
      );
      if (!updated.rows[0]) {
        throw productionHandoffError("production_ack_conflict", "Reconhecimento concorrente nao concluido.");
      }
      const handoff = mapHandoffRow(updated.rows[0]);
      observe("acknowledged", { workId: handoff.id, consumerId: normalized.consumerId });
      return buildAcknowledgement(handoff);
    });
  } catch (error) {
    if (error?.code === "23505") {
      throw productionHandoffError(
        "production_idempotency_conflict",
        "A chave de idempotencia ja foi usada para outro trabalho."
      );
    }
    throw error;
  }
}

export async function recordProductionMilestone(input, dependencies = {}) {
  assertPostgresMode();
  assertActiveMode();
  const normalized = normalizeProductionMilestoneInput(input);
  const requestHash = hashCanonical(normalized);
  const transaction = dependencies.withTransaction || withTransaction;
  const queryExecutor = dependencies.query || query;

  try {
    return await transaction(async (client) => {
      const existing = await findMilestoneEvent(client, normalized.eventId);
      if (existing) return resolveExistingEvent(existing, requestHash);

      await lockHandoffOrder(client, normalized.workId);
      const locked = await client.query(
        `select h.*, o.order_number, o.source as order_source, o.status as order_status,
                o.payment_status, o.total_brl, o.lead_time_days, o.notes as order_notes,
                o.metadata as order_metadata, o.created_at as order_created_at,
                o.updated_at as order_updated_at
         from production_handoffs h
         join orders o on o.id = h.order_id
         where h.id = $1
         for update of h, o`,
        [normalized.workId]
      );
      if (!locked.rows[0]) {
        throw productionHandoffError("production_work_not_found", "Trabalho de producao nao encontrado.");
      }
      const row = locked.rows[0];
      if (!row.acknowledged_at) {
        throw productionHandoffError(
          "production_work_not_acknowledged",
          "Reconheca o trabalho antes de registrar marcos comerciais."
        );
      }
      if (row.payment_status !== "approved" || blockedOrderStatuses.includes(row.order_status) || row.order_metadata?.paymentReview) {
        throw productionHandoffError(
          "production_order_not_active",
          "O pedido nao aceita novos marcos de producao."
        );
      }

      const concurrentReplay = await findMilestoneEvent(client, normalized.eventId);
      if (concurrentReplay) return resolveExistingEvent(concurrentReplay, requestHash);

      const latestEvent = await client.query(
        `select external_event_id, occurred_at
         from production_milestone_events
         where handoff_id = $1
         order by occurred_at desc, created_at desc
         limit 1`,
        [normalized.workId]
      );
      if (latestEvent.rows[0]
        && new Date(normalized.occurredAt) <= new Date(latestEvent.rows[0].occurred_at)) {
        throw productionHandoffError(
          "production_milestone_out_of_order",
          "O marco ocorreu antes do ultimo evento de producao aplicado."
        );
      }

      const items = await loadOrderItems(client, [row.order_id]);
      const order = mapLockedOrder(row, items.get(row.order_id) || []);
      const currentFulfillment = normalizeFulfillment(order);
      const transition = resolveProductionMilestoneTransition(
        currentFulfillment.production.status,
        normalized.milestone
      );
      const nextFulfillment = buildFulfillmentMetadata(
        order,
        buildMilestoneFulfillmentPatch(normalized, transition),
        new Date().toISOString()
      );
      const nextMetadata = { ...(order.metadata || {}), fulfillment: nextFulfillment };
      const nextOrderStatus = getOrderStatusForFulfillment(order.status, nextFulfillment);

      await client.query(
        `update orders set status = $1, metadata = $2::jsonb, updated_at = now() where id = $3`,
        [nextOrderStatus, JSON.stringify(nextMetadata), row.order_id]
      );

      const result = {
        schemaVersion: 1,
        eventId: normalized.eventId,
        workId: normalized.workId,
        orderId: row.order_id,
        milestone: normalized.milestone,
        productionStatus: transition.status,
        occurredAt: normalized.occurredAt
      };
      const inserted = await client.query(
        `insert into production_milestone_events (
           id, external_event_id, handoff_id, order_id, milestone, occurred_at,
           request_hash, failure_reason, result
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
         returning *`,
        [
          randomUUID(), normalized.eventId, normalized.workId, row.order_id,
          normalized.milestone, normalized.occurredAt, requestHash,
          normalized.failureReason || null, JSON.stringify(result)
        ]
      );
      observe("milestone", result);
      return mapMilestoneEventRow(inserted.rows[0]).result;
    });
  } catch (error) {
    if (error?.code !== "23505") throw error;
    const existing = await findMilestoneEvent({ query: queryExecutor }, normalized.eventId);
    if (existing) return resolveExistingEvent(existing, requestHash);
    throw error;
  }
}

export async function claimProductionWorkRoute(
  orderId,
  route,
  reason,
  executor = { query }
) {
  if (getDatabaseMode() !== "postgres") return route;
  if (!Object.values(PRODUCTION_WORK_ROUTE).includes(route)) {
    throw productionHandoffError("production_route_invalid", "Rota de producao invalida.");
  }
  const decidedRoute = getProductionSystemMode() === PRODUCTION_SYSTEM_MODE.ACTIVE
    ? PRODUCTION_WORK_ROUTE.EXTERNAL
    : route;
  await executor.query(
    `insert into production_work_routes (order_id, route, reason)
     values ($1,$2,$3)
     on conflict (order_id) do nothing`,
    [
      orderId,
      decidedRoute,
      cleanText(
        decidedRoute === route ? reason : `${reason || "route_request"}:active_cutover`,
        200
      )
    ]
  );
  const stored = await executor.query(
    `select route from production_work_routes where order_id = $1`,
    [orderId]
  );
  return stored.rows[0]?.route || decidedRoute;
}

export async function checkProductionHandoffStoreHealth() {
  const modeConfig = getProductionSystemModeConfig();
  const mode = modeConfig.valid ? modeConfig.mode : "invalid";
  const configured = hasProductionSystemCredential();
  const storeMode = getDatabaseMode();
  if (!modeConfig.valid) {
    return { ok: false, mode, configured, storeMode, summary: null };
  }
  if (storeMode !== "postgres") {
    if (mode === PRODUCTION_SYSTEM_MODE.DISABLED) {
      return { ok: true, mode, configured, storeMode, summary: null };
    }
    assertPostgresMode();
  }
  const result = await query(`
    select
      count(*) filter (where h.available_at is null)::integer as staged,
      count(*) filter (
        where h.available_at is not null and h.acknowledged_at is null
          and o.payment_status = 'approved'
         and coalesce(o.metadata->'paymentReview', 'null'::jsonb) = 'null'::jsonb
          and o.status <> all($1::text[])
          and coalesce(o.metadata->'fulfillment'->'production'->>'status', '') <> all($2::text[])
      )::integer as pending,
      count(*) filter (
        where h.available_at is not null and h.acknowledged_at is null
          and not (
            o.payment_status = 'approved'
         and coalesce(o.metadata->'paymentReview', 'null'::jsonb) = 'null'::jsonb
            and o.status <> all($1::text[])
            and coalesce(o.metadata->'fulfillment'->'production'->>'status', '') <> all($2::text[])
          )
      )::integer as suppressed,
      count(*) filter (where h.acknowledged_at is not null)::integer as acknowledged,
      min(h.available_at) filter (
        where h.available_at is not null and h.acknowledged_at is null
          and o.payment_status = 'approved'
         and coalesce(o.metadata->'paymentReview', 'null'::jsonb) = 'null'::jsonb
          and o.status <> all($1::text[])
          and coalesce(o.metadata->'fulfillment'->'production'->>'status', '') <> all($2::text[])
      ) as oldest_pending_at
    from production_handoffs h
    join orders o on o.id = h.order_id
  `, [blockedOrderStatuses, blockedProductionStatuses]);
  const routes = await query(`
    select route, count(*)::integer as count from production_work_routes group by route
  `);
  const milestones = await query(`
    select milestone, count(*)::integer as count, max(occurred_at) as latest_at
    from production_milestone_events
    group by milestone
  `);
  const rejections = await query(`
    select count(*)::integer as count from production_handoff_rejections
  `);
  return {
    ok: mode === PRODUCTION_SYSTEM_MODE.DISABLED || configured,
    mode,
    configured,
    storeMode: "postgres",
    summary: {
      staged: Number(result.rows[0]?.staged || 0),
      pending: Number(result.rows[0]?.pending || 0),
      suppressed: Number(result.rows[0]?.suppressed || 0),
      acknowledged: Number(result.rows[0]?.acknowledged || 0),
      rejected: Number(rejections.rows[0]?.count || 0),
      oldestPendingAt: result.rows[0]?.oldest_pending_at || null,
      routes: Object.fromEntries(routes.rows.map((row) => [row.route, Number(row.count || 0)])),
      milestones: Object.fromEntries(milestones.rows.map((row) => [row.milestone, {
        count: Number(row.count || 0),
        latestAt: row.latest_at || null
      }]))
    }
  };
}

async function reconcileEligibleHandoffs(client, limit) {
  const candidates = await client.query(
    `select o.* from orders o
     where o.payment_status = 'approved'
         and coalesce(o.metadata->'paymentReview', 'null'::jsonb) = 'null'::jsonb
       and o.status <> all($1::text[])
       and coalesce(o.metadata->'fulfillment'->'production'->>'status', '') <> all($2::text[])
       and not exists (select 1 from production_handoffs h where h.order_id = o.id)
       and not exists (select 1 from production_handoff_rejections r where r.order_id = o.id)
     order by o.created_at asc, o.id asc
     for update skip locked
     limit $3`,
    [blockedOrderStatuses, blockedProductionStatuses, limit]
  );
  if (!candidates.rows.length) return 0;
  const items = await loadOrderItems(client, candidates.rows.map((row) => row.id));
  let staged = 0;
  for (const row of candidates.rows) {
    const order = mapOrderRow(row, items.get(row.id) || []);
    if (await stageProductionHandoff(client, order)) staged += 1;
  }
  return staged;
}

async function releaseStagedHandoffs(client, limit) {
  const candidates = await client.query(
    `select h.* from production_handoffs h
     join orders o on o.id = h.order_id
     where h.available_at is null and h.acknowledged_at is null
       and o.payment_status = 'approved'
         and coalesce(o.metadata->'paymentReview', 'null'::jsonb) = 'null'::jsonb
       and o.status <> all($1::text[])
       and coalesce(o.metadata->'fulfillment'->'production'->>'status', '') <> all($2::text[])
       and not exists (
         select 1 from production_work_routes r
         where r.order_id = h.order_id and r.route = 'legacy_print_queue'
       )
       and not exists (
         select 1 from print_jobs p
         where p.source = 'site_order' and p.source_id = h.order_id
       )
     order by h.created_at asc, h.id asc
     for update of h skip locked
     limit $3`,
    [blockedOrderStatuses, blockedProductionStatuses, limit]
  );
  const released = [];
  for (const row of candidates.rows) {
    const route = await claimProductionWorkRoute(
      row.order_id,
      PRODUCTION_WORK_ROUTE.EXTERNAL,
      "production_system_active_pull",
      client
    );
    if (route !== PRODUCTION_WORK_ROUTE.EXTERNAL) continue;
    const updated = await client.query(
      `update production_handoffs
       set available_at = coalesce(available_at, now()), updated_at = now()
       where id = $1 and acknowledged_at is null
       returning *`,
      [row.id]
    );
    if (updated.rows[0]) released.push(mapHandoffRow(updated.rows[0]));
  }
  return released;
}

// Payment staging locks the order before the handoff. Callbacks use the same order.
async function lockHandoffOrder(client, workId) {
  await client.query(
    `select o.id from orders o
     join production_handoffs h on h.order_id = o.id
     where h.id = $1 for update of o`,
    [workId]
  );
}

async function loadOrderItems(client, orderIds) {
  if (!orderIds.length) return new Map();
  const result = await client.query(
    `select * from order_items where order_id = any($1::text[]) order by created_at asc`,
    [orderIds]
  );
  const items = new Map(orderIds.map((id) => [id, []]));
  for (const row of result.rows) items.get(row.order_id)?.push(mapOrderItemRow(row));
  return items;
}

async function findMilestoneEvent(executor, eventId) {
  const result = await executor.query(
    `select * from production_milestone_events where external_event_id = $1`,
    [eventId]
  );
  return result.rows[0] ? mapMilestoneEventRow(result.rows[0]) : null;
}

function resolveExistingEvent(event, requestHash) {
  if (event.requestHash !== requestHash) {
    throw productionHandoffError(
      "production_idempotency_conflict",
      "eventId ja usado com outro conteudo."
    );
  }
  return event.result;
}

function mapOrderRow(row, items) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    source: row.source,
    status: row.status,
    paymentStatus: row.payment_status,
    totalBrl: Number(row.total_brl || 0),
    leadTimeDays: Number(row.lead_time_days || 0),
    notes: row.notes || "",
    metadata: row.metadata || {},
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLockedOrder(row, items) {
  return {
    id: row.order_id,
    orderNumber: row.order_number,
    source: row.order_source,
    status: row.order_status,
    paymentStatus: row.payment_status,
    totalBrl: Number(row.total_brl || 0),
    leadTimeDays: Number(row.lead_time_days || 0),
    notes: row.order_notes || "",
    metadata: row.order_metadata || {},
    items,
    createdAt: row.order_created_at,
    updatedAt: row.order_updated_at
  };
}

function mapOrderItemRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    formatSlug: row.format_slug,
    formatName: row.format_name,
    sku: row.sku,
    values: row.values || {},
    color: row.color,
    finish: row.finish,
    quantity: Number(row.quantity || 0),
    unitPriceBrl: Number(row.unit_price_brl || 0),
    totalPriceBrl: Number(row.total_price_brl || 0),
    leadTimeDays: Number(row.lead_time_days || 0),
    status: row.status,
    validationIssues: row.validation_issues || [],
    priceBreakdown: row.price_breakdown || {}
  };
}

function mapHandoffRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    schemaVersion: Number(row.schema_version || 1),
    snapshot: row.snapshot || {},
    snapshotSha256: row.snapshot_sha256,
    availableAt: row.available_at,
    deliveryCount: Number(row.delivery_count || 0),
    firstDeliveredAt: row.first_delivered_at,
    lastDeliveredAt: row.last_delivered_at,
    acknowledgedAt: row.acknowledged_at,
    acknowledgementIdempotencyKey: row.acknowledgement_idempotency_key || "",
    acknowledgedBy: row.acknowledged_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMilestoneEventRow(row) {
  return {
    id: row.id,
    eventId: row.external_event_id,
    workId: row.handoff_id,
    orderId: row.order_id,
    milestone: row.milestone,
    occurredAt: row.occurred_at,
    requestHash: row.request_hash,
    failureReason: row.failure_reason || "",
    result: row.result || {},
    createdAt: row.created_at
  };
}

function buildAcknowledgement(handoff) {
  return {
    schemaVersion: 1,
    workId: handoff.id,
    acknowledgedAt: handoff.acknowledgedAt,
    acknowledgedBy: handoff.acknowledgedBy
  };
}

function isActiveHandoffOrderRow(row) {
  const productionStatus = row.order_metadata?.fulfillment?.production?.status || "";
  return row.payment_status === "approved"
    && !row.order_metadata?.paymentReview
    && !blockedOrderStatuses.includes(row.order_status)
    && !blockedProductionStatuses.includes(productionStatus);
}

function assertActiveMode() {
  if (getProductionSystemMode() !== PRODUCTION_SYSTEM_MODE.ACTIVE) {
    throw productionHandoffError(
      "production_system_not_active",
      "A integracao precisa estar em modo active para esta operacao."
    );
  }
}

function assertPostgresMode() {
  if (getDatabaseMode() !== "postgres") {
    throw productionHandoffError(
      "production_system_requires_postgres",
      "A integracao de producao exige Postgres."
    );
  }
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function observe(event, details) {
  console.info(JSON.stringify({ event: `production_handoff.${event}`, ...details }));
}
