export const CAD_CONTRACT_VERSION = "rhino-gh-v2";

export const CAD_MODEL_VERSION = {
  TUBE_ROUND: "tube-round-gh-v2",
  TUBE_SQUARE: "tube-square-gh-v1",
  TUBE_OBLONG: "tube-oblong-gh-v1",
  BASE_ROUND: "base-round-gh-v1",
  BASE_ROUND_NECK: "base-round-neck-gh-v1",
  BASE_ROUND_SCREW: "base-round-screw-gh-v1",
  BASE_SQUARE: "base-square-gh-v1",
  BASE_SQUARE_NECK: "base-square-neck-gh-v1",
  BASE_SQUARE_SCREW: "base-square-screw-gh-v1",
  BASE_U: "base-u-gh-v1",
  BASE_U_NECK: "base-u-neck-gh-v1",
  INSERTED_PIN: "inserted-pin-gh-v1"
};

// Folgas/chanfros aplicados no Grasshopper alem dos parametros do cliente.
// Os valores de base lisa ainda precisam de validacao em bancada (sem press-fit, sem fitAllowance).
const TUBE_TECHNICAL_DEFAULTS = {
  fitAllowanceMm: -0.2,
  topChamferMm: 0.8,
  baseBottomChamferMm: 0.6,
  shoulderRadiusMm: 1.2,
  meshToleranceMm: 0.15
};

const BASE_TECHNICAL_DEFAULTS = {
  topChamferMm: 0.8,
  baseBottomChamferMm: 0.6,
  meshToleranceMm: 0.15
};

// Os sliders sem nome dos novos scripts ficam deliberadamente fora do
// configurador: sao decisoes tecnicas fixas do modelo, nao medidas vendidas.
const U_TECHNICAL_DEFAULTS = {
  ...BASE_TECHNICAL_DEFAULTS,
  baseHeightMm: 8,
  cornerRadiusMm: 4
};

const U_NECK_TECHNICAL_DEFAULTS = {
  ...U_TECHNICAL_DEFAULTS,
  neckRadiusMm: 2.5
};

const INSERTED_PIN_TECHNICAL_DEFAULTS = {
  ...BASE_TECHNICAL_DEFAULTS,
  filletRadiusMm: 0.5
};

// Registro de modelos CAD por "categoria:formato". As chaves de `parameterKeys`
// precisam bater com `format.parameters` em lib/configurator-data.js e com os
// sliders esperados pelo script GH (`sourceGh`, ver Produtos/scripts/gh_export_variations.py).
// Formatos com haste opcional declaram `variants` resolvidas pelo toggle `pescoco`.
// Passo a passo para novos produtos: docs/catalog/contracts.md, secao "Como adicionar um produto ao contrato CAD".
const CAD_MODELS = {
  "ponteira-interna-tubo:redondo": {
    modelVersion: CAD_MODEL_VERSION.TUBE_ROUND,
    sourceGh: "Produtos/Scripts-GH/Sapata_Interna_Tubo-Redondo.gh",
    parameterKeys: ["diametroBase", "alturaBase", "alturaPescoco", "paredeTubo"],
    sliderTransforms: {
      diametroBase: { scale: 1, offset: 10 }
    },
    technicalDefaults: TUBE_TECHNICAL_DEFAULTS
  },
  "ponteira-interna-tubo:quadrado": {
    modelVersion: CAD_MODEL_VERSION.TUBE_SQUARE,
    sourceGh: "Produtos/Scripts-GH/Sapata_Interna_Tubo-Quadrado.gh",
    parameterKeys: ["tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "paredeTubo"],
    technicalDefaults: TUBE_TECHNICAL_DEFAULTS
  },
  "ponteira-interna-tubo:oblongo": {
    modelVersion: CAD_MODEL_VERSION.TUBE_OBLONG,
    sourceGh: "Produtos/Scripts-GH/Sapata_Interna_Tubo-Oblongo.gh",
    parameterKeys: ["tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "paredeTubo"],
    technicalDefaults: TUBE_TECHNICAL_DEFAULTS
  },
  "sapata-base-lisa:redonda": {
    variants: {
      default: {
        modelVersion: CAD_MODEL_VERSION.BASE_ROUND,
        sourceGh: "Produtos/Scripts-GH/Sapata_Lisa_Redonda.gh",
        parameterKeys: ["diametro", "alturaBase"],
        technicalDefaults: BASE_TECHNICAL_DEFAULTS
      },
      neck: {
        modelVersion: CAD_MODEL_VERSION.BASE_ROUND_NECK,
        sourceGh: "Produtos/Scripts-GH/Sapata_Lisa_Redonda-com Haste.gh",
        parameterKeys: ["diametro", "alturaBase", "alturaPescoco", "diametroPescoco"],
        technicalDefaults: BASE_TECHNICAL_DEFAULTS
      },
      screw: {
        modelVersion: CAD_MODEL_VERSION.BASE_ROUND_SCREW,
        sourceGh: "Produtos/Scripts-GH/Sapata_Lisa_Redonda-com parafuso.gh",
        parameterKeys: ["diametro", "alturaBase", "diametroParafuso"],
        technicalDefaults: BASE_TECHNICAL_DEFAULTS
      }
    }
  },
  "sapata-base-lisa:quadrada": {
    variants: {
      default: {
        modelVersion: CAD_MODEL_VERSION.BASE_SQUARE,
        sourceGh: "Produtos/Scripts-GH/Sapata_Lisa_Quadrada.gh",
        parameterKeys: ["tamanhoBaseX", "tamanhoBaseY", "alturaBase"],
        technicalDefaults: BASE_TECHNICAL_DEFAULTS
      },
      neck: {
        modelVersion: CAD_MODEL_VERSION.BASE_SQUARE_NECK,
        sourceGh: "Produtos/Scripts-GH/Sapata_Lisa_Quadrada-com haste.gh",
        parameterKeys: ["tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "diametroPescoco"],
        technicalDefaults: BASE_TECHNICAL_DEFAULTS
      },
      screw: {
        modelVersion: CAD_MODEL_VERSION.BASE_SQUARE_SCREW,
        sourceGh: "Produtos/Scripts-GH/Sapata_Lisa_Quadrada-com parafuso.gh",
        parameterKeys: ["tamanhoBaseX", "tamanhoBaseY", "alturaBase", "diametroParafuso"],
        technicalDefaults: BASE_TECHNICAL_DEFAULTS
      }
    }
  },
  "sapata-u:u": {
    variants: {
      default: {
        modelVersion: CAD_MODEL_VERSION.BASE_U,
        sourceGh: "Produtos/Scripts-GH/Sapata_U_SemHaste.gh",
        parameterKeys: ["diametro", "espessura", "comprimento"],
        technicalDefaults: U_TECHNICAL_DEFAULTS
      },
      neck: {
        modelVersion: CAD_MODEL_VERSION.BASE_U_NECK,
        sourceGh: "Produtos/Scripts-GH/Sapata_U_ComHaste.gh",
        parameterKeys: ["diametro", "espessura", "comprimento"],
        technicalDefaults: U_NECK_TECHNICAL_DEFAULTS
      }
    }
  },
  "sapata-pino:pino-inserido": {
    modelVersion: CAD_MODEL_VERSION.INSERTED_PIN,
    sourceGh: "Produtos/Scripts-GH/Sapata_PinoInserido.gh",
    parameterKeys: ["diametro", "alturaBase"],
    technicalDefaults: INSERTED_PIN_TECHNICAL_DEFAULTS
  }
};

export function getCadModelForItem(item) {
  const entry = CAD_MODELS[`${item?.categorySlug}:${item?.formatSlug}`];
  if (!entry) return null;
  if (!entry.variants) return entry;
  if (hasScrew(item)) return entry.variants.screw || entry.variants.default;
  return hasNeck(item) ? entry.variants.neck : entry.variants.default;
}

function hasScrew(item) {
  return Boolean(Number(item?.values?.parafuso || 0));
}

function hasNeck(item) {
  // O configurador normaliza o toggle `pescoco` para 0/1 (Number(boolean)).
  return Boolean(Number(item?.values?.pescoco || 0));
}

export function buildCadItemPayload(order, item) {
  const model = getCadModelForItem(item);
  if (!model) return null;
  const configurationParameters = Object.fromEntries(
    model.parameterKeys.map((key) => [key, Number(item.values?.[key] || 0)])
  );
  const parameterTransforms = model.sliderTransforms || {};

  return {
    contractVersion: CAD_CONTRACT_VERSION,
    modelVersion: model.modelVersion,
    engine: "rhino_grasshopper",
    generationMode: "local_manual",
    sourceGh: model.sourceGh,
    orderNumber: order.orderNumber,
    itemId: item.id,
    sku: item.sku,
    categorySlug: item.categorySlug,
    formatSlug: item.formatSlug,
    quantity: item.quantity,
    color: item.color,
    finish: item.finish,
    units: "mm",
    configurationParameters,
    parameterTransforms,
    parameters: applyParameterTransforms(configurationParameters, parameterTransforms),
    technicalDefaults: model.technicalDefaults,
    outputs: {
      stlFileName: buildCadFileName(order.orderNumber, item.sku),
      optionalPreviewFileName: buildCadFileName(order.orderNumber, item.sku).replace(/\.stl$/i, ".glb")
    }
  };
}

function applyParameterTransforms(parameters, transforms) {
  return Object.fromEntries(Object.entries(parameters).map(([key, value]) => {
    const transform = transforms[key] || {};
    const scale = Number.isFinite(Number(transform.scale)) ? Number(transform.scale) : 1;
    const offset = Number.isFinite(Number(transform.offset)) ? Number(transform.offset) : 0;
    return [key, value * scale + offset];
  }));
}

export function buildCadFileName(orderNumber, sku) {
  return `ORDER-${sanitizeFilePart(orderNumber)}-${sanitizeFilePart(sku)}.stl`;
}

export function getGrasshopperPayload(order) {
  return {
    contractVersion: CAD_CONTRACT_VERSION,
    orderId: order.id,
    orderNumber: order.orderNumber,
    items: (Array.isArray(order?.items) ? order.items : [])
      .map((item) => buildCadItemPayload(order, item) || buildGenericItemPayload(order, item))
  };
}

function buildGenericItemPayload(order, item) {
  return {
    contractVersion: "admin-order-v1",
    modelVersion: null,
    engine: "manual",
    generationMode: "local_manual",
    sourceGh: null,
    orderNumber: order.orderNumber,
    itemId: item.id,
    sku: item.sku,
    categorySlug: item.categorySlug,
    formatSlug: item.formatSlug,
    quantity: item.quantity,
    color: item.color,
    finish: item.finish,
    units: "mm",
    parameters: item.values || {},
    technicalDefaults: {},
    outputs: {
      stlFileName: buildCadFileName(order.orderNumber, item.sku),
      optionalPreviewFileName: buildCadFileName(order.orderNumber, item.sku).replace(/\.stl$/i, ".glb")
    }
  };
}

function sanitizeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
