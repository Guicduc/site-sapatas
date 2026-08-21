import { createHash, randomBytes, randomUUID } from "node:crypto";

import { query } from "./db.js";

export const OUTBOX_EVENT = Object.freeze({
  PAYMENT_CUSTOMER_EMAIL: "payment_customer_email",
  PAYMENT_REVIEW_EMAIL: "payment_review_email",
  FOCUS_NFE_INVOICE: "focus_nfe_invoice"
});

export function buildPostPaymentOutboxEvents({
  orderId,
  orderStatus,
  paymentStatus,
  paymentId,
  preferenceId,
  hasPaymentReview = false,
  review
}) {
  const events = [];
  const paymentKey = String(paymentId || preferenceId || orderId);
  const blocked = orderStatus === "cancelled" || hasPaymentReview || Boolean(review);

  if (!blocked && ["approved", "rejected"].includes(paymentStatus)) {
    events.push({
      type: OUTBOX_EVENT.PAYMENT_CUSTOMER_EMAIL,
      orderId,
      idempotencyKey: `payment-email:${paymentStatus}:${paymentKey}`,
      payload: { paymentStatus, paymentId: paymentId || null }
    });
  }

  if (!blocked && paymentStatus === "approved") {
    events.push({
      type: OUTBOX_EVENT.FOCUS_NFE_INVOICE,
      orderId,
      idempotencyKey: `focus-nfe-invoice:${orderId}`,
      payload: { paymentId: paymentId || null }
    });
  }

  if (review) {
    events.push({
      type: OUTBOX_EVENT.PAYMENT_REVIEW_EMAIL,
      orderId,
      idempotencyKey: `payment-review:${review.reason}:${paymentKey}`,
      payload: {
        paymentId: paymentId || null,
        review: {
          reason: review.reason,
          providerPaymentId: review.providerPaymentId || paymentId || null,
          paidAmountBrl: review.paidAmountBrl ?? null,
          expectedAmountBrl: review.expectedAmountBrl ?? null,
          detectedAt: review.detectedAt || null
        }
      }
    });
  }

  return events;
}

export async function enqueueOutboxEvents(executor, events) {
  const stored = [];
  const maxAttempts = boundedInteger(process.env.OUTBOX_MAX_ATTEMPTS, 8, 1, 30);
  for (const event of events) {
    const result = await executor.query(
      `insert into post_payment_outbox (
         id, event_type, order_id, idempotency_key, payload, max_attempts
       ) values ($1,$2,$3,$4,$5::jsonb,$6)
       on conflict (idempotency_key) do update
         set idempotency_key = excluded.idempotency_key
       returning *`,
      [
        randomUUID(),
        event.type,
        event.orderId,
        event.idempotencyKey,
        JSON.stringify(event.payload || {}),
        maxAttempts
      ]
    );
    if (result.rows[0]) stored.push(mapOutboxRow(result.rows[0]));
  }
  return stored;
}

export async function claimNextOutboxEvent({ workerId, leaseSeconds, now = new Date() } = {}) {
  const timestamp = toIso(now);
  const safeWorkerId = String(workerId || "outbox-worker").trim().slice(0, 120);
  const safeLeaseSeconds = boundedInteger(
    leaseSeconds || process.env.OUTBOX_LEASE_SECONDS,
    120,
    30,
    900
  );
  const leaseToken = randomBytes(32).toString("base64url");
  const leaseTokenHash = hashToken(leaseToken);
  const leasedUntil = new Date(new Date(timestamp).getTime() + safeLeaseSeconds * 1000).toISOString();

  await query(
    `update post_payment_outbox
     set status = 'failed',
         last_error = jsonb_build_object('code', 'lease_expired_after_max_attempts'),
         worker_id = null, lease_token_hash = null, leased_until = null,
         updated_at = $1, completed_at = $1
     where status = 'processing' and leased_until <= $1 and attempts >= max_attempts`,
    [timestamp]
  );

  const result = await query(
    `with candidate as (
       select id from post_payment_outbox
       where attempts < max_attempts
         and (
           (status = 'queued' and available_at <= $1)
           or (status = 'processing' and leased_until <= $1)
         )
       order by available_at asc, created_at asc
       for update skip locked
       limit 1
     )
     update post_payment_outbox as event
     set status = 'processing', attempts = event.attempts + 1,
         worker_id = $2, lease_token_hash = $3, leased_until = $4,
         started_at = coalesce(event.started_at, $1), updated_at = $1
     from candidate
     where event.id = candidate.id
     returning event.*`,
    [timestamp, safeWorkerId, leaseTokenHash, leasedUntil]
  );

  return result.rows[0]
    ? { event: mapOutboxRow(result.rows[0]), leaseToken }
    : null;
}

export async function completeOutboxEvent(id, leaseToken, result = {}) {
  const updated = await query(
    `update post_payment_outbox
     set status = 'succeeded', result = $3::jsonb, last_error = null,
         worker_id = null, lease_token_hash = null, leased_until = null,
         updated_at = now(), completed_at = now()
     where id = $1 and status = 'processing' and lease_token_hash = $2 and leased_until > now()
     returning *`,
    [id, hashToken(leaseToken), JSON.stringify(sanitizeResult(result))]
  );
  return updated.rows[0] ? mapOutboxRow(updated.rows[0]) : null;
}

export async function failOutboxEvent(id, leaseToken, error, { retryable = true } = {}) {
  const current = await query(
    `select attempts, max_attempts from post_payment_outbox
     where id = $1 and status = 'processing' and lease_token_hash = $2 and leased_until > now()`,
    [id, hashToken(leaseToken)]
  );
  if (!current.rows[0]) return null;

  const attempts = Number(current.rows[0].attempts || 0);
  const terminal = !retryable || attempts >= Number(current.rows[0].max_attempts || 0);
  const retrySeconds = getRetrySeconds(attempts);
  const updated = await query(
    `update post_payment_outbox
     set status = $3,
         available_at = case when $3 = 'queued' then now() + ($4 * interval '1 second') else available_at end,
         last_error = $5::jsonb, result = null,
         worker_id = null, lease_token_hash = null, leased_until = null,
         updated_at = now(), completed_at = case when $3 = 'failed' then now() else null end
     where id = $1 and status = 'processing' and lease_token_hash = $2 and leased_until > now()
     returning *`,
    [
      id,
      hashToken(leaseToken),
      terminal ? "failed" : "queued",
      retrySeconds,
      JSON.stringify(sanitizeError(error))
    ]
  );
  return updated.rows[0] ? mapOutboxRow(updated.rows[0]) : null;
}

export async function retryOutboxEvent(id) {
  const updated = await query(
    `update post_payment_outbox
     set status = 'queued', attempts = 0, available_at = now(), last_error = null,
         result = null, worker_id = null, lease_token_hash = null, leased_until = null,
         updated_at = now(), completed_at = null
     where id = $1 and status = 'failed'
     returning *`,
    [id]
  );
  return updated.rows[0] ? mapOutboxRow(updated.rows[0]) : null;
}

export async function listOutboxEvents({ limit = 100, status = "" } = {}) {
  const safeLimit = boundedInteger(limit, 100, 1, 500);
  const result = status
    ? await query(
        `select * from post_payment_outbox where status = $1 order by created_at desc limit $2`,
        [status, safeLimit]
      )
    : await query(`select * from post_payment_outbox order by created_at desc limit $1`, [safeLimit]);
  return result.rows.map(mapOutboxRow);
}

export async function getOutboxSummary() {
  const result = await query(`
    select status, count(*)::integer as count, min(created_at) as oldest_at
    from post_payment_outbox
    group by status
  `);
  return Object.fromEntries(result.rows.map((row) => [row.status, {
    count: Number(row.count || 0),
    oldestAt: row.oldest_at || null
  }]));
}

export function getRetrySeconds(attempts) {
  const base = boundedInteger(process.env.OUTBOX_RETRY_SECONDS, 30, 1, 3600);
  return Math.min(3600, base * (2 ** Math.max(0, Number(attempts || 1) - 1)));
}

function mapOutboxRow(row) {
  return {
    id: row.id,
    type: row.event_type,
    orderId: row.order_id,
    idempotencyKey: row.idempotency_key,
    payload: row.payload || {},
    status: row.status,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 0),
    availableAt: row.available_at,
    workerId: row.worker_id || "",
    leasedUntil: row.leased_until,
    lastError: row.last_error || null,
    result: row.result || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

function sanitizeError(error) {
  return {
    code: String(error?.code || "outbox_processing_failed").slice(0, 120),
    message: String(error?.message || "Falha ao processar evento.").slice(0, 300),
    failedAt: new Date().toISOString()
  };
}

function sanitizeResult(result) {
  return {
    outcome: String(result?.outcome || "completed").slice(0, 80),
    providerId: result?.providerId ? String(result.providerId).slice(0, 160) : null
  };
}

function hashToken(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function boundedInteger(value, fallback, minimum, maximum) {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
