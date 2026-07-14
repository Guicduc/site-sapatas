import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getGrasshopperPayload } from "./cad-contract.js";
import {
  buildPrintJobInputsFromOrder,
  buildPrintJobRecord,
  normalizePrintArtifacts,
  normalizePrintJobError,
  PRINT_JOB_STATUS,
  printJobError
} from "./print-job.js";

let pool;
let schemaReady = false;

export function getPrintJobStoreMode() {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL precisa estar configurada em producao.");
  }
  return process.env.DATABASE_URL ? "postgres" : "local";
}

export async function checkPrintJobStoreHealth() {
  const mode = getPrintJobStoreMode();
  if (mode === "postgres") {
    await ensurePostgresSchema();
    await query("select 1 as ok");
  } else {
    await readLocalStore();
  }
  return { ok: true, mode };
}

export async function enqueuePrintJob(input) {
  const now = new Date().toISOString();
  const job = buildPrintJobRecord(input, { id: randomUUID(), now });

  let stored;
  if (getPrintJobStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const inserted = await query(
      `insert into print_jobs (
        id, schema_version, idempotency_key, source, source_id, source_item_id,
        source_label, origin, material, contract, status, priority, attempts,
        max_attempts, available_at, artifacts, error, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19)
      on conflict (idempotency_key) do nothing
      returning *`,
      postgresJobValues(job)
    );
    stored = inserted.rows[0]
      ? mapPrintJobRow(inserted.rows[0])
      : await getPrintJobByIdempotencyKey(job.idempotencyKey);
  } else {
    const store = await readLocalStore();
    stored = store.jobs.find((item) => item.idempotencyKey === job.idempotencyKey);
    if (!stored) {
      store.jobs.push(job);
      await writeLocalStore(store);
      stored = job;
    }
  }

  observe("enqueued", stored, { duplicate: stored.id !== job.id });
  return stored;
}

export async function syncSiteOrderPrintJobs(orders) {
  const inputs = (Array.isArray(orders) ? orders : []).flatMap((order) =>
    buildPrintJobInputsFromOrder(order, {
      contractPayload: getGrasshopperPayload(order),
      defaultMaterialCode: process.env.ORCA_MATERIAL_ID || "tpu",
      defaultProfileId: process.env.ORCA_SLICER_PROFILE_ID || "",
      maxAttempts: process.env.PRINT_JOB_MAX_ATTEMPTS || 3
    })
  );
  const jobs = [];
  for (const input of inputs) {
    jobs.push(await enqueuePrintJob(input));
  }
  return { candidates: inputs.length, jobs };
}

export async function listPrintJobs({ limit = 100, status = "" } = {}) {
  const requestedLimit = Number(limit);
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.min(500, Math.max(1, requestedLimit))
    : 100;
  if (getPrintJobStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const params = status ? [status, safeLimit] : [safeLimit];
    const result = await query(
      status
        ? `select * from print_jobs where status = $1 order by created_at desc limit $2`
        : `select * from print_jobs order by created_at desc limit $1`,
      params
    );
    return result.rows.map(mapPrintJobRow);
  }

  const store = await readLocalStore();
  return store.jobs
    .filter((job) => !status || job.status === status)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, safeLimit);
}

export async function getPrintJobById(id) {
  if (!id) return null;
  if (getPrintJobStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const result = await query(`select * from print_jobs where id = $1`, [id]);
    return result.rows[0] ? mapPrintJobRow(result.rows[0]) : null;
  }
  const store = await readLocalStore();
  return store.jobs.find((job) => job.id === id) || null;
}

export async function claimNextPrintJob({ workerId, leaseSeconds, now = new Date().toISOString() } = {}) {
  await failExhaustedExpiredLeases(now);
  const claimToken = randomBytes(32).toString("base64url");
  const leaseTokenHash = hashToken(claimToken);
  const safeWorkerId = String(workerId || "anonymous-worker").trim().slice(0, 120);
  const safeLeaseSeconds = boundedSeconds(
    leaseSeconds || process.env.PRINT_JOB_LEASE_SECONDS,
    300,
    30,
    3600
  );
  const leasedUntil = new Date(new Date(now).getTime() + safeLeaseSeconds * 1000).toISOString();

  let job;
  if (getPrintJobStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const result = await query(
      `with candidate as (
        select id from print_jobs
        where attempts < max_attempts
          and (
            (status = 'queued' and available_at <= $1::timestamptz)
            or (status = 'processing' and leased_until <= $1::timestamptz)
          )
        order by
          case priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
          available_at asc,
          created_at asc
        for update skip locked
        limit 1
      )
      update print_jobs as job
      set status = 'processing', attempts = job.attempts + 1, worker_id = $2,
          lease_token_hash = $3, leased_until = $4, started_at = coalesce(job.started_at, $1),
          updated_at = $1
      from candidate
      where job.id = candidate.id
      returning job.*`,
      [now, safeWorkerId, leaseTokenHash, leasedUntil]
    );
    job = result.rows[0] ? mapPrintJobRow(result.rows[0]) : null;
  } else {
    const store = await readLocalStore();
    const candidate = store.jobs
      .filter((item) => isClaimable(item, now))
      .sort(compareClaimCandidates)[0];
    if (candidate) {
      candidate.status = PRINT_JOB_STATUS.PROCESSING;
      candidate.attempts += 1;
      candidate.workerId = safeWorkerId;
      candidate.leaseTokenHash = leaseTokenHash;
      candidate.leasedUntil = leasedUntil;
      candidate.startedAt ||= now;
      candidate.updatedAt = now;
      await writeLocalStore(store);
      job = candidate;
    }
  }

  if (!job) return null;
  observe("claimed", job, { workerId: safeWorkerId, leasedUntil });
  return { job: redactJob(job), claimToken };
}

export async function completePrintJob(id, {
  claimToken,
  eventId,
  artifacts,
  now = new Date().toISOString()
} = {}) {
  const eventKey = String(eventId || "").trim();
  if (!eventKey) throw printJobError("print_job_event_required", "eventId e obrigatorio.");
  const current = await getPrintJobById(id);
  if (!current) throw printJobError("print_job_not_found", "Job de impressao nao encontrado.");
  if (current.lastEventKey === eventKey) return redactJob(current);
  const normalizedArtifacts = normalizePrintArtifacts(artifacts, now);
  assertClaim(current, claimToken);

  let updated;
  if (getPrintJobStoreMode() === "postgres") {
    const result = await query(
      `update print_jobs
       set status = 'succeeded', artifacts = $1::jsonb, error = null,
           last_event_key = $2, completed_at = $3, updated_at = $3,
           lease_token_hash = null, leased_until = null
       where id = $4 and status = 'processing' and lease_token_hash = $5
       returning *`,
      [JSON.stringify(normalizedArtifacts), eventKey, now, id, hashToken(claimToken)]
    );
    updated = result.rows[0] ? mapPrintJobRow(result.rows[0]) : null;
  } else {
    const store = await readLocalStore();
    const job = store.jobs.find((item) => item.id === id);
    assertClaim(job, claimToken);
    job.status = PRINT_JOB_STATUS.SUCCEEDED;
    job.artifacts = normalizedArtifacts;
    job.error = null;
    job.lastEventKey = eventKey;
    job.completedAt = now;
    job.updatedAt = now;
    job.leaseTokenHash = "";
    job.leasedUntil = null;
    await writeLocalStore(store);
    updated = job;
  }

  if (!updated) throw printJobError("print_job_claim_conflict", "Lease do job nao e mais valida.");
  observe("succeeded", updated, { artifacts: normalizedArtifacts.length });
  return redactJob(updated);
}

export async function failPrintJob(id, {
  claimToken,
  eventId,
  error,
  retryAfterSeconds,
  now = new Date().toISOString()
} = {}) {
  const eventKey = String(eventId || "").trim();
  if (!eventKey) throw printJobError("print_job_event_required", "eventId e obrigatorio.");
  const current = await getPrintJobById(id);
  if (!current) throw printJobError("print_job_not_found", "Job de impressao nao encontrado.");
  if (current.lastEventKey === eventKey) return redactJob(current);
  assertClaim(current, claimToken);

  const normalizedError = normalizePrintJobError(error, now);
  const canRetry = normalizedError.retryable && current.attempts < current.maxAttempts;
  const nextStatus = canRetry ? PRINT_JOB_STATUS.QUEUED : PRINT_JOB_STATUS.FAILED;
  const delaySeconds = boundedSeconds(
    retryAfterSeconds ?? process.env.PRINT_JOB_RETRY_SECONDS,
    60,
    0,
    86400
  );
  const availableAt = canRetry
    ? new Date(new Date(now).getTime() + delaySeconds * 1000).toISOString()
    : current.availableAt;

  let updated;
  if (getPrintJobStoreMode() === "postgres") {
    const result = await query(
      `update print_jobs
       set status = $1, error = $2::jsonb, last_event_key = $3,
           available_at = $4, completed_at = case when $1 = 'failed' then $5 else null end,
           updated_at = $5, lease_token_hash = null, leased_until = null
       where id = $6 and status = 'processing' and lease_token_hash = $7
       returning *`,
      [nextStatus, JSON.stringify(normalizedError), eventKey, availableAt, now, id, hashToken(claimToken)]
    );
    updated = result.rows[0] ? mapPrintJobRow(result.rows[0]) : null;
  } else {
    const store = await readLocalStore();
    const job = store.jobs.find((item) => item.id === id);
    assertClaim(job, claimToken);
    job.status = nextStatus;
    job.error = normalizedError;
    job.lastEventKey = eventKey;
    job.availableAt = availableAt;
    job.completedAt = canRetry ? null : now;
    job.updatedAt = now;
    job.leaseTokenHash = "";
    job.leasedUntil = null;
    await writeLocalStore(store);
    updated = job;
  }

  if (!updated) throw printJobError("print_job_claim_conflict", "Lease do job nao e mais valida.");
  observe(canRetry ? "retry_scheduled" : "failed", updated, { errorCode: normalizedError.code });
  return redactJob(updated);
}

export function summarizePrintJobs(jobs) {
  const summary = {
    total: 0,
    queued: 0,
    processing: 0,
    succeeded: 0,
    failed: 0,
    retrying: 0
  };
  for (const job of Array.isArray(jobs) ? jobs : []) {
    summary.total += 1;
    if (Object.prototype.hasOwnProperty.call(summary, job.status)) summary[job.status] += 1;
    if (job.status === PRINT_JOB_STATUS.QUEUED && job.attempts > 0) summary.retrying += 1;
  }
  return summary;
}

export function serializePrintJob(job) {
  return redactJob(job);
}

function isClaimable(job, now) {
  if (Number(job.attempts || 0) >= Number(job.maxAttempts || 0)) return false;
  if (job.status === PRINT_JOB_STATUS.QUEUED) return String(job.availableAt || "") <= now;
  return job.status === PRINT_JOB_STATUS.PROCESSING && String(job.leasedUntil || "") <= now;
}

async function failExhaustedExpiredLeases(now) {
  const expiredError = normalizePrintJobError({
    code: "print_job_lease_expired",
    message: "O worker nao concluiu a ultima tentativa antes do fim do lease.",
    retryable: false
  }, now);

  if (getPrintJobStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const result = await query(
      `update print_jobs
       set status = 'failed', error = $1::jsonb, completed_at = $2, updated_at = $2,
           lease_token_hash = null, leased_until = null
       where status = 'processing' and leased_until <= $2::timestamptz and attempts >= max_attempts
       returning *`,
      [JSON.stringify(expiredError), now]
    );
    for (const row of result.rows) {
      observe("failed", mapPrintJobRow(row), { errorCode: expiredError.code });
    }
    return;
  }

  const store = await readLocalStore();
  const expired = store.jobs.filter((job) =>
    job.status === PRINT_JOB_STATUS.PROCESSING
      && String(job.leasedUntil || "") <= now
      && Number(job.attempts || 0) >= Number(job.maxAttempts || 0)
  );
  if (!expired.length) return;

  for (const job of expired) {
    job.status = PRINT_JOB_STATUS.FAILED;
    job.error = expiredError;
    job.completedAt = now;
    job.updatedAt = now;
    job.leaseTokenHash = "";
    job.leasedUntil = null;
    observe("failed", job, { errorCode: expiredError.code });
  }
  await writeLocalStore(store);
}

function compareClaimCandidates(left, right) {
  const ranks = { urgent: 0, high: 1, normal: 2, low: 3 };
  const priority = (ranks[left.priority] ?? 2) - (ranks[right.priority] ?? 2);
  if (priority) return priority;
  const availability = String(left.availableAt).localeCompare(String(right.availableAt));
  return availability || String(left.createdAt).localeCompare(String(right.createdAt));
}

function assertClaim(job, token) {
  if (!job || job.status !== PRINT_JOB_STATUS.PROCESSING || !safeEqual(job.leaseTokenHash, hashToken(token))) {
    throw printJobError("print_job_claim_conflict", "Lease do job nao e mais valida.");
  }
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length > 0
    && leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}

function hashToken(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function redactJob(job) {
  if (!job) return job;
  const { leaseTokenHash, ...safeJob } = job;
  return safeJob;
}

async function getPrintJobByIdempotencyKey(idempotencyKey) {
  const result = await query(`select * from print_jobs where idempotency_key = $1`, [idempotencyKey]);
  return result.rows[0] ? mapPrintJobRow(result.rows[0]) : null;
}

function postgresJobValues(job) {
  return [
    job.id,
    job.schemaVersion,
    job.idempotencyKey,
    job.origin.source,
    job.origin.sourceId,
    job.origin.sourceItemId || null,
    job.origin.label || null,
    JSON.stringify(job.origin),
    JSON.stringify(job.material),
    JSON.stringify(job.contract),
    job.status,
    job.priority,
    job.attempts,
    job.maxAttempts,
    job.availableAt,
    JSON.stringify(job.artifacts),
    JSON.stringify(job.error),
    job.createdAt,
    job.updatedAt
  ];
}

function mapPrintJobRow(row) {
  return {
    id: row.id,
    schemaVersion: Number(row.schema_version || 1),
    idempotencyKey: row.idempotency_key,
    origin: row.origin || {
      source: row.source,
      sourceId: row.source_id,
      sourceItemId: row.source_item_id || "",
      label: row.source_label || "",
      metadata: {}
    },
    material: row.material || {},
    contract: row.contract || {},
    status: row.status,
    priority: row.priority,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 0),
    workerId: row.worker_id || "",
    leaseTokenHash: row.lease_token_hash || "",
    leasedUntil: row.leased_until,
    availableAt: row.available_at,
    artifacts: row.artifacts || [],
    error: row.error || null,
    lastEventKey: row.last_event_key || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

async function query(sql, params = []) {
  const database = await getPool();
  return database.query(sql, params);
}

async function getPool() {
  if (!pool) {
    const { Pool } = await import("pg");
    const connectionString = process.env.DATABASE_URL;
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || "");
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "false" || isLocal ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensurePostgresSchema() {
  if (schemaReady) return;
  await query(`
    create table if not exists print_jobs (
      id text primary key,
      schema_version integer not null default 1,
      idempotency_key text not null unique,
      source text not null,
      source_id text not null,
      source_item_id text,
      source_label text,
      origin jsonb not null default '{}'::jsonb,
      material jsonb not null default '{}'::jsonb,
      contract jsonb not null default '{}'::jsonb,
      status text not null check (status in ('queued','processing','succeeded','failed','cancelled')),
      priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
      attempts integer not null default 0,
      max_attempts integer not null default 3,
      worker_id text,
      lease_token_hash text,
      leased_until timestamptz,
      available_at timestamptz not null default now(),
      artifacts jsonb not null default '[]'::jsonb,
      error jsonb,
      last_event_key text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      started_at timestamptz,
      completed_at timestamptz
    );
    create index if not exists print_jobs_claim_idx
      on print_jobs (status, available_at, priority, created_at);
    create index if not exists print_jobs_origin_idx
      on print_jobs (source, source_id, source_item_id);
  `);
  schemaReady = true;
}

function getLocalStorePath() {
  return process.env.PRINT_JOB_LOCAL_STORE_PATH
    ? path.resolve(process.env.PRINT_JOB_LOCAL_STORE_PATH)
    : path.join(process.cwd(), ".local-data", "print-jobs.dev.json");
}

async function readLocalStore() {
  try {
    const raw = await fs.readFile(getLocalStorePath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      schemaVersion: 1,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : []
    };
  } catch {
    return { schemaVersion: 1, jobs: [] };
  }
}

async function writeLocalStore(store) {
  const filePath = getLocalStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2));
}

function boundedSeconds(value, fallback, minimum, maximum) {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
}

function observe(event, job, details = {}) {
  const payload = JSON.stringify({
    level: event === "failed" ? "error" : "info",
    event: `print_job.${event}`,
    jobId: job?.id,
    source: job?.origin?.source,
    sourceId: job?.origin?.sourceId,
    status: job?.status,
    attempts: job?.attempts,
    ...details
  });
  if (event === "failed") console.error(payload);
  else console.info(payload);
}
