import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import { getGrasshopperPayload } from "../lib/cad-contract.js";
import {
  buildConfigurationSku,
  calculatePriceBreakdown,
  getCategoryBySlug,
  getFormat,
  getInitialValues,
  validateConfiguration
} from "../lib/configurator-data.js";
import { buildPrintJobInputsFromOrder, normalizePrintJobInput } from "../lib/print-job.js";
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
  assert.deepEqual(jobs[0].contract.configurationParameters, { diametro: 28, alturaBase: 6 });
  assert.deepEqual(jobs[0].contract.parameterTransforms, {});
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

test("traduz medida publica do tubo redondo para o slider usado na precificacao", () => {
  const order = {
    ...buildPaidOrder(),
    items: [{
      ...buildPaidOrder().items[0],
      sku: "BF-RD-PI-DB28-AB6-AP18-PT1.5",
      categorySlug: "ponteira-interna-tubo",
      formatSlug: "redondo",
      values: {
        diametroBase: 28,
        alturaBase: 6,
        alturaPescoco: 18,
        paredeTubo: 1.5
      }
    }]
  };
  const payload = getGrasshopperPayload(order);
  const jobs = buildPrintJobInputsFromOrder(order, { contractPayload: payload });
  const normalizedJob = normalizePrintJobInput(jobs[0]);

  assert.equal(payload.items[0].modelVersion, "tube-round-gh-v2");
  assert.deepEqual(payload.items[0].configurationParameters, {
    diametroBase: 28,
    alturaBase: 6,
    alturaPescoco: 18,
    paredeTubo: 1.5
  });
  assert.deepEqual(payload.items[0].parameterTransforms, {
    diametroBase: { scale: 1, offset: 10 }
  });
  assert.deepEqual(payload.items[0].parameters, {
    diametroBase: 38,
    alturaBase: 6,
    alturaPescoco: 18,
    paredeTubo: 1.5
  });
  assert.deepEqual(jobs[0].contract.configurationParameters, payload.items[0].configurationParameters);
  assert.deepEqual(jobs[0].contract.parameterTransforms, payload.items[0].parameterTransforms);
  assert.deepEqual(jobs[0].contract.parameters, payload.items[0].parameters);
  assert.deepEqual(normalizedJob.contract.configurationParameters, payload.items[0].configurationParameters);
  assert.deepEqual(normalizedJob.contract.parameterTransforms, payload.items[0].parameterTransforms);
  assert.deepEqual(normalizedJob.contract.parameters, payload.items[0].parameters);
});

test("mantem catalogo e contrato CAD da sapata U e do pino inserido alinhados", () => {
  const uFormat = getFormat(getCategoryBySlug("sapata-u"), "u");
  const pinFormat = getFormat(getCategoryBySlug("sapata-pino"), "pino-inserido");
  const uValues = { ...getInitialValues(uFormat), pescoco: true };
  const pinValues = getInitialValues(pinFormat);
  const order = {
    ...buildPaidOrder(),
    items: [
      {
        ...buildPaidOrder().items[0],
        id: "item-u",
        sku: buildConfigurationSku(uFormat, uValues, { color: "Preta" }),
        categorySlug: "sapata-u",
        formatSlug: "u",
        values: uValues
      },
      {
        ...buildPaidOrder().items[0],
        id: "item-pin",
        sku: buildConfigurationSku(pinFormat, pinValues, { color: "Preta" }),
        categorySlug: "sapata-pino",
        formatSlug: "pino-inserido",
        values: pinValues
      }
    ]
  };

  assert.equal(uFormat.status, "active");
  assert.equal(pinFormat.status, "active");
  assert.equal(order.items[0].sku, "BF-SU-V2-HA-DI17P8-ES1P5-CO29P4-PR");
  assert.equal(order.items[1].sku, "BF-PN-IN-V2-SH-DI5P7-AB5-PR");

  const payload = getGrasshopperPayload(order);
  assert.deepEqual(payload.items[0].configurationParameters, {
    diametro: 17.8,
    espessura: 1.5,
    comprimento: 29.4
  });
  assert.equal(payload.items[0].modelVersion, "base-u-neck-gh-v1");
  assert.equal(payload.items[0].sourceGh, "Produtos/Scripts-GH/Sapata_U_ComHaste.gh");
  assert.equal(payload.items[0].technicalDefaults.baseHeightMm, 8);
  assert.equal(payload.items[0].technicalDefaults.cornerRadiusMm, 4);
  assert.equal(payload.items[0].technicalDefaults.neckRadiusMm, 2.5);
  assert.deepEqual(validateConfiguration(uFormat, uValues), []);
  assert.equal(calculatePriceBreakdown(uFormat, uValues, 1).pricingAvailable, true);

  assert.deepEqual(payload.items[1].configurationParameters, { diametro: 5.7, alturaBase: 5 });
  assert.equal(payload.items[1].modelVersion, "inserted-pin-gh-v1");
  assert.equal(payload.items[1].sourceGh, "Produtos/Scripts-GH/Sapata_PinoInserido.gh");
  assert.equal(payload.items[1].technicalDefaults.filletRadiusMm, 0.5);
});

test("resolve sapata com furo para parafuso no SKU, CAD e guardrails de fabricacao", () => {
  const round = getFormat(getCategoryBySlug("sapata-base-lisa"), "redonda");
  const values = {
    ...getInitialValues(round),
    pescoco: false,
    parafuso: true,
    diametro: 28,
    alturaBase: 6,
    diametroParafuso: 3
  };
  const item = {
    ...buildPaidOrder().items[0],
    categorySlug: "sapata-base-lisa",
    formatSlug: "redonda",
    values,
    sku: buildConfigurationSku(round, values, { color: "Preta" })
  };
  const payload = getGrasshopperPayload({ ...buildPaidOrder(), items: [item] });

  assert.equal(item.sku, "BF-BL-RD-V2-CP-DI28-AB6-DF3-PR");
  assert.deepEqual(payload.items[0].configurationParameters, {
    diametro: 28,
    alturaBase: 6,
    diametroParafuso: 3
  });
  assert.equal(payload.items[0].modelVersion, "base-round-screw-gh-v1");
  assert.equal(payload.items[0].sourceGh, "Produtos/Scripts-GH/Sapata_Lisa_Redonda-com parafuso.gh");
  assert.deepEqual(validateConfiguration(round, values), []);
  assert.ok(validateConfiguration(round, { ...values, pescoco: true }).some((issue) => issue.includes("nao podem ser combinadas")));
  assert.ok(validateConfiguration(round, { ...values, diametro: 8, diametroParafuso: 8 }).some((issue) => issue.includes("material ao redor do furo")));
  assert.ok(validateConfiguration(round, { ...values, alturaBase: 1 }).some((issue) => issue.includes("ao menos 2 mm")));

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
