import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import { getGrasshopperPayload } from "../lib/cad-contract.js";
import { buildPrintJobInputsFromOrder } from "../lib/print-job.js";
import {
  claimNextPrintJob,
  completePrintJob,
  enqueuePrintJob,
  failPrintJob,
  listPrintJobs,
  summarizePrintJobs
} from "../lib/print-job-store.js";

const tempDir = path.join(os.tmpdir(), `baseforma-print-job-${randomUUID()}`);
process.env.DATABASE_URL = "";
process.env.PRINT_JOB_LOCAL_STORE_PATH = path.join(tempDir, "print-jobs.json");

after(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

test("converte apenas pedidos pagos ativos com contrato CAD em jobs completos", () => {
  const order = buildPaidOrder();
  const jobs = buildPrintJobInputsFromOrder(order, {
    contractPayload: getGrasshopperPayload(order),
    defaultProfileId: "p2s-tpu-v1",
    maxAttempts: 4
  });

  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0].origin, {
    source: "site_order",
    sourceId: "order-1",
    sourceItemId: "item-1",
    label: "BF-001",
    metadata: { orderNumber: "BF-001", sku: "BF-RD-28", quantity: 4 }
  });
  assert.equal(jobs[0].material.code, "tpu");
  assert.equal(jobs[0].material.color, "Preta");
  assert.equal(jobs[0].material.profileId, "p2s-tpu-v1");
  assert.equal(jobs[0].contract.sourceFile, "Produtos/Scripts-GH/Sapata_Lisa_Redonda.gh");
  assert.deepEqual(jobs[0].contract.parameters, { diametro: 28, alturaBase: 6 });
  assert.match(jobs[0].idempotencyKey, /^print-file-v1:site_order:order-1:item-1:/);

  assert.deepEqual(buildPrintJobInputsFromOrder(
    { ...order, paymentStatus: "pending" },
    { contractPayload: getGrasshopperPayload(order) }
  ), []);
  assert.deepEqual(buildPrintJobInputsFromOrder(
    { ...order, status: "shipped" },
    { contractPayload: getGrasshopperPayload(order) }
  ), []);
});

test("mantem enqueue e callbacks idempotentes com lease, retry e artefatos", async () => {
  const [input] = buildPrintJobInputsFromOrder(buildPaidOrder(), {
    contractPayload: getGrasshopperPayload(buildPaidOrder()),
    defaultProfileId: "p2s-tpu-v1",
    maxAttempts: 3
  });
  const first = await enqueuePrintJob(input);
  const duplicate = await enqueuePrintJob(input);

  assert.equal(duplicate.id, first.id);
  assert.equal((await listPrintJobs()).length, 1);

  const firstClaimAt = new Date(Date.now() + 1000).toISOString();
  const firstClaim = await claimNextPrintJob({
    workerId: "cad-worker-01",
    leaseSeconds: 30,
    now: firstClaimAt
  });
  assert.equal(firstClaim.job.status, "processing");
  assert.equal(firstClaim.job.attempts, 1);
  assert.ok(firstClaim.claimToken);
  assert.equal("leaseTokenHash" in firstClaim.job, false);

  const failedAt = new Date(new Date(firstClaimAt).getTime() + 1000).toISOString();
  const retrying = await failPrintJob(first.id, {
    claimToken: firstClaim.claimToken,
    eventId: "failure-1",
    error: { code: "grasshopper_busy", message: "Rhino ocupado.", retryable: true },
    retryAfterSeconds: 1,
    now: failedAt
  });
  assert.equal(retrying.status, "queued");
  assert.equal(retrying.error.code, "grasshopper_busy");

  const secondClaimAt = new Date(new Date(failedAt).getTime() + 2000).toISOString();
  const secondClaim = await claimNextPrintJob({ workerId: "cad-worker-02", now: secondClaimAt });
  assert.equal(secondClaim.job.attempts, 2);

  const completedAt = new Date(new Date(secondClaimAt).getTime() + 1000).toISOString();
  const succeeded = await completePrintJob(first.id, {
    claimToken: secondClaim.claimToken,
    eventId: "success-1",
    artifacts: [{
      type: "stl",
      name: "ORDER-BF-001-BF-RD-28.stl",
      uri: "s3://print-artifacts/BF-001/model.stl",
      checksum: "sha256:abc",
      sizeBytes: 1200
    }],
    now: completedAt
  });
  assert.equal(succeeded.status, "succeeded");
  assert.equal(succeeded.artifacts[0].type, "stl");

  const repeated = await completePrintJob(first.id, {
    claimToken: "token-ja-descartado",
    eventId: "success-1",
    artifacts: succeeded.artifacts,
    now: completedAt
  });
  assert.equal(repeated.status, "succeeded");
  assert.equal(await claimNextPrintJob({ workerId: "idle-worker" }), null);
  assert.deepEqual(summarizePrintJobs(await listPrintJobs()), {
    total: 1,
    queued: 0,
    processing: 0,
    succeeded: 1,
    failed: 0,
    retrying: 0
  });
});

test("encerra como falha quando o lease da ultima tentativa expira", async () => {
  const job = await enqueuePrintJob({
    origin: { source: "lease_test", sourceId: "expired-final-attempt" },
    material: { code: "tpu" },
    contract: { contractVersion: "test-v1", modelVersion: "lease-v1" },
    maxAttempts: 1
  });
  const claimedAt = new Date(Date.now() + 1000).toISOString();
  const claim = await claimNextPrintJob({ workerId: "unstable-worker", leaseSeconds: 30, now: claimedAt });
  assert.equal(claim.job.id, job.id);

  const afterLease = new Date(new Date(claimedAt).getTime() + 31000).toISOString();
  assert.equal(await claimNextPrintJob({ workerId: "replacement-worker", now: afterLease }), null);
  const stored = (await listPrintJobs()).find((item) => item.id === job.id);
  assert.equal(stored.status, "failed");
  assert.equal(stored.error.code, "print_job_lease_expired");
});

test("aceita origem externa sem acoplar o job a um pedido do site", async () => {
  const job = await enqueuePrintJob({
    origin: {
      source: "design_lab",
      sourceId: "sample-42",
      sourceItemId: "variant-a",
      label: "Amostra 42"
    },
    material: { code: "petg", color: "Natural", profileId: "petg-04" },
    contract: {
      contractVersion: "lab-cad-v1",
      modelVersion: "fixture-v2",
      engine: "custom_cad_worker",
      parameters: { widthMm: 40 },
      outputs: { modelFileName: "sample-42.3mf" }
    },
    priority: "high"
  });

  assert.equal(job.origin.source, "design_lab");
  assert.equal(job.material.code, "petg");
  assert.equal(job.priority, "high");
});

function buildPaidOrder() {
  return {
    id: "order-1",
    orderNumber: "BF-001",
    paymentStatus: "approved",
    status: "paid_ready_for_production",
    items: [{
      id: "item-1",
      sku: "BF-RD-28",
      categorySlug: "sapata-base-lisa",
      formatSlug: "redonda",
      values: { diametro: 28, alturaBase: 6, pescoco: 0 },
      color: "Preta",
      quantity: 4,
      priceBreakdown: {}
    }],
    metadata: {
      fulfillment: { production: { priority: "urgent" } }
    }
  };
}
