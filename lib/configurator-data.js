import { slicerPricingSamples, slicerPricingSource } from "./slicer-pricing-data.js";

const legacyProductCategories = [
  {
    slug: "ponteira-interna-tubo",
    name: "Ponteira interna para tubo",
    eyebrow: "Encaixe por medida real",
    description:
      "Ponteiras sob medida para tubos redondos, retangulares e oblongos, com encaixe sob pressão e ajuste de interferência.",
    baseType: "tubo",
    primaryFixation: "press-fit interno",
    image: {
      src: "/brand/categoria-ponteira-interna-tubo.png",
      alt: "Ponteiras internas Baseforma para tubos redondos, retangulares e oblongos"
    },
    applications: ["cadeiras", "mesas", "serralheria", "mobiliário autoral"],
    colors: ["Grafite", "Areia", "Terracota", "Cinza névoa"],
    finishes: ["fosco técnico", "base silenciosa", "trava reforçada"],
    formats: [
      {
        slug: "redondo",
        name: "Tubo redondo",
        skuPrefix: "BF-RD-PI",
        description: "Para tubo redondo medido pelo diâmetro interno real.",
        fixation: "press-fit interno",
        applications: ["cadeiras", "mesas tubulares", "reposição"],
        status: "active",
        drawingType: "tube-round",
        priceBaseBrl: 34,
        priceFactor: 0.42,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("diametroInterno", "Diâmetro interno", 12, 36, 22, "mm"),
          dimension("diametroBase", "Diâmetro da base", 16, 46, 28, "mm"),
          dimension("profundidadeInserção", "Profundidade de inserção", 8, 32, 18, "mm"),
          dimension("alturaApoio", "Altura de apoio", 4, 18, 8, "mm")
        ],
        notes: ["Meça o tubo por dentro, depois da pintura ou cromagem."]
      },
      {
        slug: "retangular",
        name: "Tubo retangular",
        skuPrefix: "BF-RT-PI",
        description: "Para metalon e tubos retangulares com parede fora do padrão comum.",
        fixation: "press-fit interno",
        applications: ["serralheria", "bancos", "aparadores", "linhas autorais"],
        status: "active",
        drawingType: "tube-rect",
        priceBaseBrl: 42,
        priceFactor: 0.34,
        leadTimeBaseDays: 6,
        parameters: [
          dimension("larguraInterna", "Largura interna", 14, 58, 30, "mm"),
          dimension("alturaInterna", "Altura interna", 10, 36, 20, "mm"),
          dimension("parede", "Espessura da parede", 0.8, 4, 1.5, "mm", 0.1),
          dimension("profundidadeInserção", "Profundidade de inserção", 8, 35, 20, "mm"),
          dimension("alturaBase", "Altura da base", 4, 18, 8, "mm")
        ],
        notes: ["Boa família para medidas 30 x 20, 40 x 20 e outras variações."]
      },
      {
        slug: "oblongo",
        name: "Tubo oblongo",
        skuPrefix: "BF-OB-PI",
        description: "Para perfis ovais ou oblongos que não fecham em medida nominal.",
        fixation: "press-fit interno",
        applications: ["cadeiras", "móveis importados", "reposição especial"],
        status: "review",
        drawingType: "tube-oblong",
        priceBaseBrl: 48,
        priceFactor: 0.36,
        leadTimeBaseDays: 8,
        parameters: [
          dimension("larguraInterna", "Largura interna", 18, 58, 36, "mm"),
          dimension("alturaInterna", "Altura interna", 10, 34, 18, "mm"),
          dimension("raioCanto", "Raio aproximado", 3, 18, 9, "mm"),
          dimension("profundidadeInserção", "Profundidade de inserção", 8, 35, 18, "mm")
        ],
        notes: ["Formato em validação: pedidos entram como sob avaliação técnica."]
      }
    ]
  },
  {
    slug: "sapata-base-lisa",
    name: "Sapata para base lisa",
    eyebrow: "Apoio para chapa, madeira e base plana",
    description:
      "Sapatas para bases lisas em formatos redondo, oblongo e retangular.",
    baseType: "base lisa",
    primaryFixation: "adesivo, parafuso ou fita técnica",
    image: {
      src: "/brand/categoria-sapata-base-lisa.png",
      alt: "Sapatas Baseforma para bases lisas, redondas, retangulares e encaixe U"
    },
    applications: ["poltronas", "banquinhos", "bases metálicas", "móveis autorais"],
    colors: ["Grafite", "Areia", "Terracota", "Verde mineral"],
    finishes: ["fosco técnico", "deslizante", "antiderrapante", "piso sensível"],
    formats: [
      {
        slug: "redonda",
        name: "Base redonda",
        skuPrefix: "BF-BL-RD",
        description: "Para pés e bases com área circular de contato.",
        fixation: "adesivo ou parafuso",
        applications: ["poltronas", "sofás", "bases circulares"],
        status: "active",
        drawingType: "base-round",
        calibratedPricingCategorySlug: "sapata-base-lisa",
        calibratedPricingFamilySlug: "sapata-lisa-redonda",
        priceBaseBrl: 29,
        priceFactor: 0.34,
        leadTimeBaseDays: 4,
        parameters: [
          dimension("diametro", "Diametro", 14, 60, 28, "mm"),
          dimension("altura", "Altura", 3, 16, 6, "mm")
        ],
        notes: ["Escolha adesivo para instalação sem furo ou parafuso para uso recorrente."]
      },
      {
        slug: "oblonga",
        name: "Base oblonga",
        skuPrefix: "BF-BL-OB",
        description: "Para chapa estreita, base retangular curta e área de contato alongada.",
        fixation: "adesivo protegido ou parafuso",
        applications: ["chapa metálica", "banquinhos", "bases estreitas"],
        status: "active",
        drawingType: "base-oblong",
        priceBaseBrl: 36,
        priceFactor: 0.28,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("comprimento", "Comprimento", 24, 110, 50, "mm"),
          dimension("largura", "Largura", 12, 42, 20, "mm"),
          dimension("altura", "Altura", 3, 16, 7, "mm"),
          dimension("distanciaFuros", "Distância entre furos", 0, 90, 0, "mm")
        ],
        notes: ["Use distância entre furos 0 quando a fixação for apenas adesiva."]
      },
      {
        slug: "retangular",
        name: "Base retangular",
        skuPrefix: "BF-BL-RT",
        description: "Para bases planas longas ou pés lâmina com area retangular.",
        fixation: "adesivo, parafuso ou fita técnica",
        applications: ["bases lâmina", "aparadores", "buffets"],
        status: "active",
        drawingType: "base-rect",
        priceBaseBrl: 39,
        priceFactor: 0.24,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("comprimento", "Comprimento", 24, 130, 75, "mm"),
          dimension("largura", "Largura", 12, 55, 25, "mm"),
          dimension("altura", "Altura", 3, 16, 6, "mm"),
          dimension("raioCanto", "Raio dos cantos", 1, 12, 4, "mm")
        ],
        notes: ["Cantos arredondados reduzem risco de descolamento e leitura improvisada."]
      }
    ]
  }
];

export const productCategories = [
  {
    slug: "ponteira-interna-tubo",
    name: "Sapata interna tubos",
    eyebrow: "Encaixe por medida real",
    description:
      "Sapatas sob medida para tubos redondos, quadrados e oblongos, com encaixe por medida real.",
    baseType: "tubo",
    primaryFixation: "press-fit interno",
    image: {
      src: "/brand/categoria-ponteira-interna-tubo.png",
      alt: "Sapatas Baseforma para tubos redondos, quadrados e oblongos"
    },
    applications: ["cadeiras", "mesas", "serralheria", "mobiliário autoral"],
    colors: ["Preta", "Areia", "Terracota", "Verde mineral"],
    finishes: [],
    formats: [
      {
        slug: "redondo",
        name: "Tubo redondo",
        skuPrefix: "BF-RD-PI",
        description: "Para tubo redondo medido pelo diâmetro interno real.",
        fixation: "press-fit interno",
        applications: ["cadeiras", "mesas tubulares", "reposição"],
        status: "active",
        drawingType: "tube-round",
        priceBaseBrl: 34,
        priceFactor: 0.42,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("diametroBase", "Tamanho base (Ø)", 3, 150, 28, "mm"),
          dimension("alturaBase", "Altura base", 1, 10, 6, "mm"),
          dimension("alturaPescoco", "Altura pescoço", 5, 35, 18, "mm"),
          dimension("paredeTubo", "Parede tubo", 0.8, 8, 1.5, "mm", 0.1)
        ],
        notes: ["Meça o tubo por dentro, depois da pintura ou cromagem."]
      },
      {
        slug: "quadrado",
        name: "Tubo quadrado",
        skuPrefix: "BF-QD-PI",
        description: "Para metalon e tubos quadrados medidos pela largura interna real.",
        fixation: "press-fit interno",
        applications: ["serralheria", "bancos", "aparadores", "linhas autorais"],
        status: "active",
        drawingType: "tube-rect",
        priceBaseBrl: 42,
        priceFactor: 0.34,
        leadTimeBaseDays: 6,
        parameters: [
          dimension("tamanhoBaseX", "Tamanho base X", 3, 150, 30, "mm"),
          dimension("tamanhoBaseY", "Tamanho base Y", 3, 150, 30, "mm"),
          dimension("alturaBase", "Altura base", 1, 10, 6, "mm"),
          dimension("alturaPescoco", "Altura pescoço", 5, 35, 20, "mm"),
          dimension("paredeTubo", "Parede tubo", 0.8, 8, 1.5, "mm", 0.1)
        ],
        notes: ["Informe a medida interna real do tubo quadrado."]
      },
      {
        slug: "oblongo",
        name: "Tubo oblongo",
        skuPrefix: "BF-OB-PI",
        description: "Para perfis ovais ou oblongos que não fecham em medida nominal.",
        fixation: "press-fit interno",
        applications: ["cadeiras", "móveis importados", "reposição especial"],
        status: "active",
        drawingType: "tube-oblong",
        priceBaseBrl: 48,
        priceFactor: 0.36,
        leadTimeBaseDays: 8,
        parameters: [
          dimension("tamanhoBaseX", "Tamanho base X", 3, 150, 36, "mm"),
          dimension("tamanhoBaseY", "Tamanho base Y", 3, 150, 18, "mm"),
          dimension("alturaBase", "Altura base", 1, 10, 6, "mm"),
          dimension("alturaPescoco", "Altura pescoço", 5, 35, 18, "mm"),
          dimension("paredeTubo", "Parede tubo", 0.8, 8, 1.5, "mm", 0.1)
        ],
        notes: ["Informe largura, altura e raio aproximado do perfil oblongo."]
      }
    ]
  },
  {
    slug: "sapata-base-lisa",
    name: "Sapata lisa",
    eyebrow: "Apoio plano customizável",
    description: "Sapatas lisas customizáveis em formatos redondo e quadrado, com ou sem pescoço.",
    baseType: "base lisa",
    primaryFixation: "apoio plano",
    image: {
      src: "/brand/categoria-sapata-base-lisa.png",
      alt: "Sapatas Baseforma para bases lisas redondas e quadradas"
    },
    applications: ["poltronas", "banquinhos", "bases metálicas", "móveis autorais"],
    colors: ["Preta", "Areia", "Terracota", "Verde mineral"],
    finishes: [],
    formats: [
      {
        slug: "redonda",
        name: "Lisa redonda",
        skuPrefix: "BF-BL-RD",
        description: "Para pés e bases com área circular de contato.",
        fixation: "apoio plano",
        applications: ["poltronas", "sofás", "bases circulares"],
        status: "active",
        drawingType: "base-round",
        calibratedPricingCategorySlug: "sapata-base-lisa",
        calibratedPricingFamilySlug: "sapata-lisa-redonda",
        priceBaseBrl: 29,
        priceFactor: 0.34,
        leadTimeBaseDays: 4,
        parameters: [
          dimension("diametro", "Diametro", 3, 150, 28, "mm"),
          dimension("alturaBase", "Altura da base", 1, 10, 6, "mm"),
          toggle("pescoco", "Haste", false),
          dimension("alturaPescoco", "Altura da haste", 5, 35, 12, "mm", 1, { dependsOn: "pescoco" }),
          dimension("diametroPescoco", "Diâmetro da haste", 3, 15, 8, "mm", 1, { dependsOn: "pescoco" })
        ],
        notes: ["Modelo paramétrico disponível para configuração."]
      },
      {
        slug: "quadrada",
        name: "Lisa quadrada",
        skuPrefix: "BF-BL-QD",
        description: "Para bases planas com área de contato quadrada.",
        fixation: "apoio plano",
        applications: ["chapa metálica", "banquinhos", "bases quadradas"],
        status: "active",
        drawingType: "base-rect",
        priceBaseBrl: 36,
        priceFactor: 0.28,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("tamanhoBaseX", "Tamanho base X", 3, 150, 50, "mm"),
          dimension("tamanhoBaseY", "Tamanho base Y", 3, 150, 50, "mm"),
          dimension("alturaBase", "Altura da base", 1, 10, 7, "mm"),
          toggle("pescoco", "Haste", false),
          dimension("alturaPescoco", "Altura da haste", 5, 35, 12, "mm", 1, { dependsOn: "pescoco" }),
          dimension("diametroPescoco", "Diâmetro da haste", 3, 15, 8, "mm", 1, { dependsOn: "pescoco" })
        ],
        notes: ["Modelo paramétrico disponível para configuração."]
      }
    ]
  }
];

function dimension(key, label, min, max, defaultValue, unit = "mm", step = 1, options = {}) {
  return {
    key,
    label,
    min,
    max,
    defaultValue,
    unit,
    step,
    required: true,
    type: "number",
    ...options
  };
}

function toggle(key, label, defaultValue = false) {
  return {
    key,
    label,
    defaultValue,
    required: false,
    type: "boolean"
  };
}

export function getCategoryBySlug(slug) {
  return productCategories.find((category) => category.slug === slug);
}

export function getFormat(category, formatSlug) {
  return category?.formats.find((format) => format.slug === formatSlug);
}

export function getInitialValues(format) {
  return Object.fromEntries(format.parameters.map((parameter) => [parameter.key, parameter.defaultValue]));
}

export function validateConfiguration(format, values) {
  const issues = [];

  for (const parameter of format.parameters) {
    if (parameter.dependsOn && !values[parameter.dependsOn]) {
      continue;
    }

    const rawValue = values[parameter.key];
    if (parameter.type === "boolean") {
      continue;
    }

    const value = Number(rawValue);

    if (parameter.required && (rawValue === "" || rawValue === null || Number.isNaN(value))) {
      issues.push(`${parameter.label} precisa ser informado.`);
      continue;
    }

    if (value < parameter.min || value > parameter.max) {
      issues.push(
        `${parameter.label} deve ficar entre ${parameter.min} e ${parameter.max} ${parameter.unit}.`
      );
    }
  }

  return issues;
}

export const pricingAssumptions = {
  tpuFilamentBrlPerKg: 170,
  printWasteRate: 0.05,
  printerPurchasePriceBrl: 7000,
  printerLifetimeHours: 7000,
  annualOperatingHours: 2000,
  annualMaintenanceBrl: 600,
  averagePowerDrawW: 200,
  electricityTariffBrlPerKwh: 0.95,
  channelFeeRate: 0.06,
  markupRate: 0.55,
  markup: 1.55,
  tubeInternalSaleMultiplier: 1.7,
  baseShoeSaleMultiplier: 4,
  salePriceRoundingIncrementBrl: 0.25,
  minOrderPriceBrl: 0.3
};

const progressiveDimensionKeys = new Set(["diametro", "diametroBase", "tamanhoBaseX", "tamanhoBaseY"]);

function progressiveAxisKeysForFormat(format) {
  return new Set(progressiveDimensionKeys);
}

export function calculatePrice(format, values, quantity = 1) {
  return calculatePriceBreakdown(format, values, quantity).totalPriceBrl;
}

export function calculatePriceBreakdown(format, values, quantity = 1) {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const resolved = resolveSlicerDatasetPricing(format, values);
  const pricingAvailable = resolved.pricingMode !== "slicer_dataset_missing";
  const pricingUnavailableReason = pricingAvailable
    ? ""
    : "Preço indisponível: a base de slice não cobre esta configuração. O item segue para avaliação técnica.";
  const cost = calculateDirectOrcaCost({
    materialGrams: resolved.materialGrams,
    printMinutes: resolved.printMinutes,
    quantity: safeQuantity
  });
  const progressiveUnitCostFloorBrl = Number(resolved.progressiveUnitCostFloorBrl || 0);
  const orcaDirectUnitCostBrl = cost.directUnitCostBrl;
  const directUnitCostBrl = Math.max(orcaDirectUnitCostBrl, progressiveUnitCostFloorBrl);
  const directOrderCostBrl = roundMoney(directUnitCostBrl * safeQuantity);
  const saleMultiplier = saleMultiplierForFormat(format);
  const unitPriceBrl = pricingAvailable
    ? Math.max(
        pricingAssumptions.minOrderPriceBrl,
        roundSalePrice(directUnitCostBrl * saleMultiplier)
      )
    : 0;
  const totalPriceBrl = roundMoney(unitPriceBrl * safeQuantity);
  const channelFeeBrl = roundMoney(totalPriceBrl * pricingAssumptions.channelFeeRate);
  const progressiveCostAdjustmentBrl = roundMoney(Math.max(0, directUnitCostBrl - cost.directUnitCostBrl));

  return {
    pricingAvailable,
    pricingUnavailableReason,
    materialGrams: roundMetric(resolved.materialGrams),
    materialCostBrl: cost.materialCostBrl,
    printHours: roundMetric(resolved.printMinutes / 60),
    printMinutes: roundMetric(resolved.printMinutes),
    machineCostBrl: cost.machineCostBrl,
    energyCostBrl: cost.energyCostBrl,
    maintenanceCostBrl: cost.maintenanceCostBrl,
    printerWearCostBrl: cost.printerWearCostBrl,
    channelFeeBrl,
    directUnitCostBrl,
    orcaDirectUnitCostBrl,
    directOrderCostBrl,
    progressiveUnitCostFloorBrl,
    progressiveCostAdjustmentBrl,
    saleMultiplier,
    unitPriceBrl,
    totalPriceBrl,
    quantity: safeQuantity,
    pricingMode: resolved.pricingMode,
    pricingSource: resolved.pricingSource,
    surfaceId: resolved.surfaceId,
    metricSurfaceId: "",
    benchmarkSurfaceId: "",
    referenceSampleId: resolved.referenceSampleId || "",
    referenceSampleIds: resolved.referenceSampleIds || [],
    benchmarkMissing: true,
    benchmarkTargetUnitPriceBrl: null,
    benchmark: null,
    marginRate: roundMetric(saleMultiplier - 1, 2),
    coverage: resolved.coverage,
    assumptions: pricingAssumptions
  };
}

function saleMultiplierForFormat(format) {
  return format.skuPrefix?.includes("PI")
    ? pricingAssumptions.tubeInternalSaleMultiplier
    : pricingAssumptions.baseShoeSaleMultiplier;
}

function roundSalePrice(value) {
  const increment = Math.max(0.01, Number(pricingAssumptions.salePriceRoundingIncrementBrl || 0.01));
  return roundMoney(Math.ceil(Number(value || 0) / increment) * increment);
}

export function calculateLeadTime(format, quantity = 1) {
  const extra = Number(quantity || 1) > 24 ? 2 : 0;
  return format.leadTimeBaseDays + extra + (format.status === "review" ? 3 : 0);
}

const skuParameterCodes = {
  diametroBase: "DB",
  alturaBase: "AB",
  alturaPescoco: "AP",
  paredeTubo: "PT",
  tamanhoBaseX: "BX",
  tamanhoBaseY: "BY",
  diametro: "DI",
  diametroPescoco: "DP"
};

const skuVariantCodes = {
  "sem-haste": "SH",
  haste: "HA",
  "com-parafuso": "CP"
};

const skuColorCodes = {
  Preta: "PR",
  Areia: "AR",
  Terracota: "TE",
  "Verde mineral": "VM"
};

export const SKU_VERSION_MARKER = "V2";

export function buildConfigurationSku(format, values, options = {}) {
  const variantSlug = resolveVariantSlug(format, values);
  const variantCode = skuVariantCodes[variantSlug] || variantSlug.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 2);
  const parts = format.parameters
    .filter((parameter) => {
      if (parameter.type === "boolean") {
        return false;
      }

      return !parameter.dependsOn || Boolean(values?.[parameter.dependsOn]);
    })
    .map((parameter) => {
      const code = skuParameterCodes[parameter.key] || parameter.key.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 2);
      const rawValue = values?.[parameter.key] ?? parameter.defaultValue;
      return `${code}${normalizeSkuValue(rawValue)}`;
    });
  const colorCode = skuColorCodes[options.color] || "";

  return [format.skuPrefix, SKU_VERSION_MARKER, variantCode, ...parts, colorCode]
    .filter(Boolean)
    .join("-");
}

export function isLegacySku(sku) {
  return !String(sku || "").includes(`-${SKU_VERSION_MARKER}-`);
}

function normalizeSkuValue(value) {
  return String(value ?? "").replace(",", ".").replace(".", "P");
}

function resolveSlicerDatasetPricing(format, values) {
  const categorySlug = format.calibratedPricingCategorySlug ||
    (format.skuPrefix?.includes("PI") ? "ponteira-interna-tubo" : "sapata-base-lisa");
  const variantSlug = resolveVariantSlug(format, values);
  const surfaceId = `${categorySlug}:${format.slug}:${variantSlug}`;
  const requestedParams = activePricingParams(format, values);
  const candidates = slicerPricingSamples.filter((sample) => {
    return (
      sample.categorySlug === categorySlug &&
      sample.formatSlug === format.slug &&
      sample.variantSlug === variantSlug
    );
  });

  if (candidates.length === 0) {
    return buildMissingSlicerPricing(surfaceId);
  }

  const activeKeys = Object.keys(requestedParams).filter((key) => {
    return candidates.some((sample) => Number.isFinite(Number(sample.params?.[key])));
  });
  const ranges = parameterRanges(candidates, activeKeys);
  const exact = findExactSlicerSample(candidates, requestedParams, activeKeys);
  const inRange = activeKeys.every((key) => {
    const range = ranges[key];
    const value = Number(requestedParams[key] || 0);
    return value >= range.min && value <= range.max;
  });
  const nearestSamples = candidates
    .map((sample) => ({
      ...sample,
      distance: normalizedSampleDistance(sample, requestedParams, ranges, activeKeys)
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 8);
  const resolvedMetrics = interpolatedSlicerMetrics(candidates, requestedParams, activeKeys, ranges);
  const progressiveUnitCostFloorBrl = progressiveSlicerUnitCostFloor(
    candidates,
    requestedParams,
    activeKeys,
    ranges,
    format.parameters,
    progressiveAxisKeysForFormat(format)
  );
  const pricingMode = exact ? "sliced_exact" : inRange ? "sliced_interpolated" : "sliced_extrapolated";

  return {
    pricingMode,
    pricingSource: "canonical_slicer_dataset",
    surfaceId,
    materialGrams: resolvedMetrics.materialGrams,
    printMinutes: resolvedMetrics.printMinutes,
    progressiveUnitCostFloorBrl,
    referenceSampleId: exact?.sampleId || nearestSamples[0]?.sampleId || "",
    referenceSampleIds: exact ? [exact.sampleId] : nearestSamples.map((sample) => sample.sampleId),
    coverage: buildCoverage({
      surfaceId,
      candidates,
      activeKeys,
      requestedParams,
      confidence: exact ? "exact" : inRange ? "interpolated" : "extrapolated",
      inRange,
      usingFallback: !inRange,
      nearestSamples: exact ? [exact] : nearestSamples
    })
  };
}

function buildMissingSlicerPricing(surfaceId) {
  return {
    pricingMode: "slicer_dataset_missing",
    pricingSource: "canonical_slicer_dataset",
    surfaceId,
    materialGrams: 0,
    printMinutes: 0,
    progressiveUnitCostFloorBrl: 0,
    referenceSampleId: "",
    referenceSampleIds: [],
    coverage: {
      requestedSurfaceId: surfaceId,
      datasetPath: slicerPricingSource,
      usingFallback: false,
      ownSampleCount: 0,
      metricSampleCount: 0,
      inRange: true,
      confidence: "missing_dataset",
      notes: "A base canonica de slice nao tem amostras para esta superficie."
    }
  };
}

function resolveVariantSlug(format, values) {
  if (format.skuPrefix?.includes("PI")) {
    return "sem-haste";
  }

  return Boolean(values?.pescoco) ? "haste" : "sem-haste";
}

function activePricingParams(format, values) {
  const params = {};

  for (const parameter of format.parameters) {
    if (parameter.type === "boolean" || (parameter.dependsOn && !values?.[parameter.dependsOn])) {
      continue;
    }

    params[parameter.key] = Number(values?.[parameter.key] ?? parameter.defaultValue ?? 0);
  }

  return params;
}

function findExactSlicerSample(candidates, requestedParams, activeKeys) {
  return candidates.find((sample) => {
    return activeKeys.every((key) => {
      return Math.abs(Number(sample.params?.[key] || 0) - Number(requestedParams[key] || 0)) <= 0.01;
    });
  });
}

function parameterRanges(candidates, activeKeys) {
  return Object.fromEntries(
    activeKeys.map((key) => {
      const values = candidates
        .map((sample) => Number(sample.params?.[key]))
        .filter((value) => Number.isFinite(value));
      return [
        key,
        {
          min: Math.min(...values),
          max: Math.max(...values)
        }
      ];
    })
  );
}

function normalizedSampleDistance(sample, requestedParams, ranges, activeKeys) {
  if (activeKeys.length === 0) {
    return 0;
  }

  const squaredDistance = activeKeys.reduce((sum, key) => {
    const range = ranges[key];
    const scale = Math.max(1, range.max - range.min);
    const sampleValue = Number(sample.params?.[key] || 0);
    const requestedValue = Number(requestedParams[key] || 0);
    return sum + Math.pow((sampleValue - requestedValue) / scale, 2);
  }, 0);

  return Math.sqrt(squaredDistance);
}

function weightedSlicerMetrics(samples) {
  if (samples.length === 0) {
    return { materialGrams: 0, printMinutes: 0 };
  }

  const weighted = samples.reduce(
    (sum, sample) => {
      const weight = 1 / Math.pow(sample.distance + 0.0001, 2);
      return {
        materialGrams: sum.materialGrams + Number(sample.materialGrams || 0) * weight,
        printMinutes: sum.printMinutes + Number(sample.printMinutes || 0) * weight,
        weight: sum.weight + weight
      };
    },
    { materialGrams: 0, printMinutes: 0, weight: 0 }
  );

  return {
    materialGrams: weighted.materialGrams / weighted.weight,
    printMinutes: weighted.printMinutes / weighted.weight
  };
}

function interpolatedSlicerMetrics(candidates, requestedParams, activeKeys, ranges) {
  const exact = findExactSlicerSample(candidates, requestedParams, activeKeys);
  if (exact) {
    return {
      materialGrams: Number(exact.materialGrams || 0),
      printMinutes: Number(exact.printMinutes || 0)
    };
  }

  const nearestSamples = candidates
    .map((sample) => ({
      ...sample,
      distance: normalizedSampleDistance(sample, requestedParams, ranges, activeKeys)
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 8);

  return weightedSlicerMetrics(nearestSamples);
}

function progressiveSlicerUnitCostFloor(candidates, requestedParams, activeKeys, ranges, parameters, progressiveAxisKeys) {
  let floor = slicerMetricsUnitCostBrl(interpolatedSlicerMetrics(candidates, requestedParams, activeKeys, ranges));

  const dominatedSamples = candidates.filter((sample) => {
    return activeKeys.every((key) => {
      const sampleValue = Number(sample.params?.[key]);
      const requestedValue = Number(requestedParams[key]);
      return Number.isFinite(sampleValue) && Number.isFinite(requestedValue) && sampleValue <= requestedValue + 0.01;
    });
  });

  for (const sample of dominatedSamples) {
    floor = Math.max(floor, slicerMetricsUnitCostBrl(sample));
  }

  const parameterByKey = new Map(parameters.map((parameter) => [parameter.key, parameter]));
  for (const key of activeKeys) {
    if (!progressiveAxisKeys.has(key)) {
      continue;
    }

    const parameter = parameterByKey.get(key);
    const range = ranges[key];
    if (!parameter || !range) {
      continue;
    }

    const currentValue = Number(requestedParams[key] || 0);
    const minValue = Math.max(Number(parameter.min ?? range.min), range.min);
    const maxValue = Math.min(currentValue, range.max);
    const step = Math.max(Number(parameter.step || 1), 0.01);

    for (const value of sweepValues(minValue, maxValue, step)) {
      const metrics = interpolatedSlicerMetrics(
        candidates,
        { ...requestedParams, [key]: value },
        activeKeys,
        ranges
      );
      floor = Math.max(floor, slicerMetricsUnitCostBrl(metrics));
    }
  }

  return floor;
}

function slicerMetricsUnitCostBrl(metrics) {
  return calculateDirectOrcaCost({
    materialGrams: Number(metrics.materialGrams || 0),
    printMinutes: Number(metrics.printMinutes || 0),
    quantity: 1
  }).directUnitCostBrl;
}

function sweepValues(min, max, step) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return [];
  }

  const values = [];
  const decimals = step < 1 ? 2 : 0;
  const limit = 300;

  for (let value = min; value <= max + 0.000001 && values.length < limit; value += step) {
    values.push(roundMetric(value, decimals));
  }

  return values;
}

function buildCoverage({
  surfaceId,
  candidates,
  activeKeys,
  requestedParams,
  confidence,
  inRange,
  usingFallback,
  nearestSamples
}) {
  return {
    requestedSurfaceId: surfaceId,
    datasetPath: slicerPricingSource,
    usingFallback,
    ownSampleCount: candidates.length,
    metricSampleCount: nearestSamples.length,
    activeKeys,
    requestedParams,
    inRange,
    confidence,
    nearestDistance: roundMetric(nearestSamples[0]?.distance || 0, 4),
    nearestSampleIds: nearestSamples.map((sample) => sample.sampleId)
  };
}

function calculateDirectOrcaCost({ materialGrams, printMinutes, quantity }) {
  const materialWithWasteGrams = Number(materialGrams || 0) * (1 + pricingAssumptions.printWasteRate);
  const printHours = Number(printMinutes || 0) / 60;
  const materialCostBrl =
    materialWithWasteGrams * (pricingAssumptions.tpuFilamentBrlPerKg / 1000) * quantity;
  const energyCostBrl =
    (pricingAssumptions.averagePowerDrawW / 1000) *
    printHours *
    pricingAssumptions.electricityTariffBrlPerKwh *
    (1 + pricingAssumptions.printWasteRate) *
    quantity;
  const maintenanceCostBrl =
    (pricingAssumptions.annualMaintenanceBrl / pricingAssumptions.annualOperatingHours) *
    printHours *
    quantity;
  const printerWearCostBrl =
    (pricingAssumptions.printerPurchasePriceBrl / pricingAssumptions.printerLifetimeHours) *
    printHours *
    (1 + pricingAssumptions.printWasteRate) *
    quantity;
  const directOrderCostBrl =
    materialCostBrl +
    energyCostBrl +
    maintenanceCostBrl +
    printerWearCostBrl;

  return {
    materialCostBrl: roundMoney(materialCostBrl / quantity),
    machineCostBrl: roundMoney((maintenanceCostBrl + printerWearCostBrl) / quantity),
    energyCostBrl: roundMoney(energyCostBrl / quantity),
    maintenanceCostBrl: roundMoney(maintenanceCostBrl / quantity),
    printerWearCostBrl: roundMoney(printerWearCostBrl / quantity),
    directUnitCostBrl: roundMoney(directOrderCostBrl / quantity),
    directOrderCostBrl: roundMoney(directOrderCostBrl)
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundMetric(value, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value || 0) * factor) / factor;
}

