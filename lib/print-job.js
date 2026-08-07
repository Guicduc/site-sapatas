export const PRINT_JOB_SCHEMA_VERSION = 1;

export const PRINT_JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled"
};

export const PRINT_JOB_PRIORITY = {
  URGENT: "urgent",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low"
};

const VALID_PRIORITIES = Object.values(PRINT_JOB_PRIORITY);

export function buildPrintJobInputsFromOrder(order, options = {}) {
  if (order?.paymentStatus !== "approved") return [];
  if (["cancelled", "shipped"].includes(order?.status)) return [];

  const cad = options.contractPayload || order?.metadata?.cad || {};
  if (!Array.isArray(cad.items)) return [];

  return cad.items.map((cadItem) => {
    const orderItem = order.items?.find((item) => item.id === cadItem.itemId) || {};
    const materialCode = cleanText(
      orderItem.material?.code || orderItem.priceBreakdown?.materialId || options.defaultMaterialCode || "tpu"
    ).toLowerCase();
    const profileId = cleanText(
      orderItem.priceBreakdown?.profileId || options.defaultProfileId
    );
    const material = {
      code: materialCode,
      color: cleanText(cadItem.color || orderItem.color),
      profileId,
      batch: "",
      notes: ""
    };
    const origin = {
      source: "site_order",
      sourceId: cleanText(order.id),
      sourceItemId: cleanText(cadItem.itemId),
      label: cleanText(order.orderNumber),
      metadata: {
        orderNumber: cleanText(order.orderNumber),
        sku: cleanText(cadItem.sku),
        quantity: positiveInteger(cadItem.quantity, 1)
      }
    };
    const contract = {
      contractVersion: cleanText(cadItem.contractVersion || cad.contractVersion),
      modelVersion: cleanText(cadItem.modelVersion),
      engine: cleanText(cadItem.engine),
      generationMode: cleanText(cadItem.generationMode),
      sourceFile: cleanText(cadItem.sourceGh),
      configurationParameters: objectValue(cadItem.configurationParameters),
      parameterTransforms: objectValue(cadItem.parameterTransforms),
      parameters: objectValue(cadItem.parameters),
      technicalDefaults: objectValue(cadItem.technicalDefaults),
      outputs: objectValue(cadItem.outputs)
    };

    return {
      idempotencyKey: buildPrintJobIdempotencyKey({ origin, material, contract }),
      origin,
      material,
      contract,
      priority: normalizePriority(order.metadata?.fulfillment?.production?.priority),
      maxAttempts: positiveInteger(options.maxAttempts, 3)
    };
  });
}

export function normalizePrintJobInput(input = {}, options = {}) {
  const origin = {
    source: cleanText(input.origin?.source).toLowerCase(),
    sourceId: cleanText(input.origin?.sourceId),
    sourceItemId: cleanText(input.origin?.sourceItemId),
    label: cleanText(input.origin?.label),
    metadata: objectValue(input.origin?.metadata)
  };
  const material = {
    code: cleanText(input.material?.code).toLowerCase(),
    color: cleanText(input.material?.color),
    profileId: cleanText(input.material?.profileId),
    batch: cleanText(input.material?.batch),
    notes: cleanText(input.material?.notes)
  };
  const contract = {
    contractVersion: cleanText(input.contract?.contractVersion),
    modelVersion: cleanText(input.contract?.modelVersion),
    engine: cleanText(input.contract?.engine),
    generationMode: cleanText(input.contract?.generationMode),
    sourceFile: cleanText(input.contract?.sourceFile),
    configurationParameters: objectValue(input.contract?.configurationParameters),
    parameterTransforms: objectValue(input.contract?.parameterTransforms),
    parameters: objectValue(input.contract?.parameters),
    technicalDefaults: objectValue(input.contract?.technicalDefaults),
    outputs: objectValue(input.contract?.outputs)
  };

  if (!origin.source || !origin.sourceId) {
    throw printJobError("print_job_invalid_origin", "Origem e identificador da origem sao obrigatorios.");
  }
  if (!material.code) {
    throw printJobError("print_job_invalid_material", "Material do job e obrigatorio.");
  }
  if (!contract.contractVersion || !contract.modelVersion) {
    throw printJobError(
      "print_job_invalid_contract",
      "Versao do contrato e versao do modelo CAD sao obrigatorias."
    );
  }

  return {
    schemaVersion: PRINT_JOB_SCHEMA_VERSION,
    idempotencyKey: cleanText(input.idempotencyKey)
      || buildPrintJobIdempotencyKey({ origin, material, contract }),
    origin,
    material,
    contract,
    priority: normalizePriority(input.priority),
    maxAttempts: positiveInteger(input.maxAttempts || options.maxAttempts, 3)
  };
}

export function buildPrintJobRecord(input, { id, now = new Date().toISOString() } = {}) {
  const normalized = normalizePrintJobInput(input);
  return {
    id,
    ...normalized,
    status: PRINT_JOB_STATUS.QUEUED,
    attempts: 0,
    workerId: "",
    leaseTokenHash: "",
    leasedUntil: null,
    availableAt: now,
    artifacts: [],
    error: null,
    lastEventKey: "",
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null
  };
}

export function buildPrintJobIdempotencyKey({ origin, material, contract }) {
  return [
    "print-file-v1",
    origin?.source,
    origin?.sourceId,
    origin?.sourceItemId || "root",
    contract?.contractVersion,
    contract?.modelVersion,
    material?.code,
    material?.color || "default",
    material?.profileId || "default"
  ].map(keyPart).join(":");
}

export function normalizePrintArtifacts(artifacts, now = new Date().toISOString()) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw printJobError("print_job_artifacts_required", "Ao menos um artefato gerado e obrigatorio.");
  }

  return artifacts.map((artifact, index) => {
    const type = cleanText(artifact?.type).toLowerCase();
    const name = cleanText(artifact?.name);
    const uri = cleanText(artifact?.uri);

    if (!type || !name || !uri) {
      throw printJobError(
        "print_job_invalid_artifact",
        `Artefato ${index + 1} precisa informar type, name e uri.`
      );
    }

    return {
      id: cleanText(artifact.id) || `${type}-${index + 1}`,
      type,
      name,
      uri,
      checksum: cleanText(artifact.checksum),
      sizeBytes: Math.max(0, Number(artifact.sizeBytes || 0)),
      createdAt: cleanText(artifact.createdAt) || now,
      metadata: objectValue(artifact.metadata)
    };
  });
}

export function normalizePrintJobError(error = {}, now = new Date().toISOString()) {
  return {
    code: cleanText(error.code) || "print_job_processing_failed",
    message: cleanText(error.message) || "O processador nao concluiu o job.",
    retryable: error.retryable !== false,
    happenedAt: cleanText(error.happenedAt) || now,
    details: objectValue(error.details)
  };
}

export function normalizePriority(value) {
  const priority = cleanText(value).toLowerCase();
  return VALID_PRIORITIES.includes(priority) ? priority : PRINT_JOB_PRIORITY.NORMAL;
}

export function printJobError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanText(value) {
  return String(value || "").trim();
}

function positiveInteger(value, fallback) {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(20, numeric) : fallback;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function keyPart(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "none";
}
