export const CAD_CONTRACT_VERSION = "rhino-gh-v1";
export const CAD_MODEL_VERSION = {
  TUBE_ROUND: "tube-round-gh-v1"
};

export const CAD_STATUS = {
  NOT_REQUIRED: "not_required",
  PENDING_PAYMENT: "pending_payment",
  PENDING: "cad_pending",
  GENERATED: "cad_generated",
  READY_FOR_PRINT: "ready_for_print"
};

const tubeRoundKeys = [
  "diametroInterno",
  "diametroBase",
  "profundidadeInsercao",
  "alturaApoio"
];

export function buildInitialCadMetadata(orderDraft) {
  const cadItems = orderDraft.items
    .map((item) => buildCadItemPayload(orderDraft, item))
    .filter(Boolean);

  return {
    contractVersion: CAD_CONTRACT_VERSION,
    status: cadItems.length > 0 ? CAD_STATUS.PENDING_PAYMENT : CAD_STATUS.NOT_REQUIRED,
    modelVersion: cadItems[0]?.modelVersion || null,
    fileName: "",
    generatedAt: null,
    items: cadItems
  };
}

export function buildCadItemPayload(order, item) {
  if (item.categorySlug !== "ponteira-interna-tubo" || item.formatSlug !== "redondo") {
    return null;
  }

  return {
    contractVersion: CAD_CONTRACT_VERSION,
    modelVersion: CAD_MODEL_VERSION.TUBE_ROUND,
    engine: "rhino_grasshopper",
    generationMode: "local_manual",
    orderNumber: order.orderNumber,
    itemId: item.id,
    sku: item.sku,
    categorySlug: item.categorySlug,
    formatSlug: item.formatSlug,
    quantity: item.quantity,
    color: item.color,
    finish: item.finish,
    units: "mm",
    parameters: Object.fromEntries(tubeRoundKeys.map((key) => [key, Number(item.values?.[key] || 0)])),
    technicalDefaults: {
      fitAllowanceMm: -0.2,
      topChamferMm: 0.8,
      baseBottomChamferMm: 0.6,
      shoulderRadiusMm: 1.2,
      meshToleranceMm: 0.15
    },
    outputs: {
      stlFileName: buildCadFileName(order.orderNumber, item.sku),
      optionalPreviewFileName: buildCadFileName(order.orderNumber, item.sku).replace(/\.stl$/i, ".glb")
    }
  };
}

export function buildCadFileName(orderNumber, sku) {
  return `ORDER-${sanitizeFilePart(orderNumber)}-${sanitizeFilePart(sku)}.stl`;
}

export function getGrasshopperPayload(order) {
  const cad = order?.metadata?.cad || {};
  return {
    contractVersion: cad.contractVersion || CAD_CONTRACT_VERSION,
    orderId: order.id,
    orderNumber: order.orderNumber,
    cadStatus: cad.status || CAD_STATUS.NOT_REQUIRED,
    items: Array.isArray(cad.items) ? cad.items : []
  };
}

export function shouldRequireCad(order) {
  return Array.isArray(order?.metadata?.cad?.items) && order.metadata.cad.items.length > 0;
}

function sanitizeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
