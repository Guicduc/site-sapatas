import { slicedPricingReferences } from "./sliced-pricing-data.js";
import { findMarketPricingReference } from "./market-pricing.js";
import { calculateCommercialPrice } from "./pricing-policy.js";

const MIN_SLICED_TO_ESTIMATED_COST_RATIO = 0.3;
const MONOTONIC_GUARD_LOOKBACK_STEPS = 8;

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
      alt: "Ponteiras internas Traço Base para tubos redondos, retangulares e oblongos"
    },
    applications: ["cadeiras", "mesas", "serralheria", "mobiliário autoral"],
    colors: ["Grafite", "Areia", "Terracota", "Cinza névoa"],
    finishes: ["fosco técnico", "base silenciosa", "trava reforçada"],
    formats: [
      {
        slug: "redondo",
        name: "Tubo redondo",
        skuPrefix: "TB-RD-PI",
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
        skuPrefix: "TB-RT-PI",
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
        skuPrefix: "TB-OB-PI",
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
      alt: "Sapatas Traço Base para bases lisas, redondas, retangulares e encaixe U"
    },
    applications: ["poltronas", "banquinhos", "bases metálicas", "móveis autorais"],
    colors: ["Grafite", "Areia", "Terracota", "Verde mineral"],
    finishes: ["fosco técnico", "deslizante", "antiderrapante", "piso sensível"],
    formats: [
      {
        slug: "redonda",
        name: "Base redonda",
        skuPrefix: "TB-BL-RD",
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
        skuPrefix: "TB-BL-OB",
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
        skuPrefix: "TB-BL-RT",
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
      alt: "Sapatas Traço Base para tubos redondos, quadrados e oblongos"
    },
    applications: ["cadeiras", "mesas", "serralheria", "mobiliário autoral"],
    colors: ["Preta"],
    finishes: [],
    formats: [
      {
        slug: "redondo",
        name: "Tubo redondo",
        skuPrefix: "TB-RD-PI",
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
        skuPrefix: "TB-QD-PI",
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
        skuPrefix: "TB-OB-PI",
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
      alt: "Sapatas Traço Base para bases lisas redondas e quadradas"
    },
    applications: ["poltronas", "banquinhos", "bases metálicas", "móveis autorais"],
    colors: ["Preta"],
    finishes: [],
    formats: [
      {
        slug: "redonda",
        name: "Lisa redonda",
        skuPrefix: "TB-BL-RD",
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
        skuPrefix: "TB-BL-QD",
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

  if (format.status === "review") {
    issues.push("Formato em avaliação técnica: o pedido não entra como compra direta.");
  }

  const neckLimitIssue = validateNeckFitsBase(format, values);
  if (neckLimitIssue) {
    issues.push(neckLimitIssue);
  }

  const tubeWallIssue = validateTubeWallFitsBase(format, values);
  if (tubeWallIssue) {
    issues.push(tubeWallIssue);
  }

  return issues;
}

export function getParameterMax(format, values, parameter) {
  if (parameter.key === "paredeTubo") {
    const baseLimit = getTubeWallBaseLimit(format, values);

    return baseLimit ? Math.min(parameter.max, baseLimit / 2) : parameter.max;
  }

  if (parameter.key !== "diametroPescoco" || !values?.pescoco) {
    return parameter.max;
  }

  const baseLimit = getNeckBaseLimit(format, values);

  return baseLimit ? Math.min(parameter.max, baseLimit) : parameter.max;
}

export const pricingAssumptions = {
  tpuFilamentBrlPerKg: 180,
  tpuDensityGPerCm3: 1.21,
  printWasteRate: 0.05,
  volumetricRateMm3PerSecond: 3.2,
  printTimeOverheadFactor: 1.65,
  printerPurchasePriceBrl: 7000,
  printerLifetimeHours: 7000,
  annualOperatingHours: 2000,
  annualMaintenanceBrl: 600,
  averagePowerDrawW: 100,
  electricityTariffBrlPerKwh: 0.7,
  machineCostBrlPerHour: 0,
  energyCostBrlPerHour: 0.1312,
  channelFeeRate: 0.06,
  markupRate: 0.55,
  markup: 1.55,
  minOrderPriceBrl: 0.3
};

export function calculatePrice(format, values, quantity = 1) {
  return calculatePriceBreakdown(format, values, quantity).totalPriceBrl;
}

export function calculatePriceBreakdown(format, values, quantity = 1, options = {}) {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const slicedReference = findSlicedPricingReference(format, values);

  if (slicedReference) {
    const slicedBreakdown = calculateSlicedPriceBreakdown(format, values, slicedReference, safeQuantity);
    const estimatedMetrics = estimateGeometricCostMetrics(format, values, safeQuantity);

    if (isSlicedBreakdownPlausible(slicedBreakdown, estimatedMetrics)) {
      return applyMonotonicPriceGuard(format, values, slicedBreakdown, safeQuantity, options);
    }
  }

  const estimatedMetrics = estimateGeometricCostMetrics(format, values, safeQuantity);
  const {
    volumeMm3,
    materialGrams,
    materialCostBrl,
    printHours,
    machineCostBrl,
    energyCostBrl,
    directUnitCostBrl,
    directOrderCostBrl
  } = estimatedMetrics;
  const categorySlug = inferCategorySlugFromSku(format);
  const marketReference = findMarketPricingReference({
    categorySlug,
    formatSlug: format.slug,
    dimensions: marketDimensionsFromFormat(format, values),
    hasNeck: Boolean(values.pescoco)
  });
  const commercialPrice = calculateCommercialPrice({
    categorySlug,
    formatSlug: format.slug,
    directUnitCostBrl,
    quantity: safeQuantity,
    channelFeeRate: pricingAssumptions.channelFeeRate,
    marketReference
  });
  const unitPriceBrl = commercialPrice.unitPriceBrl;
  const totalPriceBrl = commercialPrice.totalPriceBrl;

  return applyMonotonicPriceGuard(format, values, {
    volumeMm3: roundMetric(volumeMm3),
    materialGrams: roundMetric(materialGrams),
    materialCostBrl: roundMoney(materialCostBrl),
    printHours: roundMetric(printHours),
    machineCostBrl: roundMoney(machineCostBrl),
    energyCostBrl: roundMoney(energyCostBrl),
    directUnitCostBrl: roundMoney(directUnitCostBrl),
    directOrderCostBrl: roundMoney(directOrderCostBrl),
    unitPriceBrl,
    totalPriceBrl,
    quantity: safeQuantity,
    pricingMode: "estimated",
    pricingSource: "geometric_estimate",
    ...commercialPrice,
    assumptions: pricingAssumptions
  }, safeQuantity, options);
}

function estimateGeometricCostMetrics(format, values, quantity = 1) {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const volumeMm3 = estimatePrintedVolumeMm3(format, values);
  const grossVolumeMm3 = volumeMm3 * (1 + pricingAssumptions.printWasteRate);
  const materialGrams =
    (grossVolumeMm3 / 1000) * pricingAssumptions.tpuDensityGPerCm3;
  const materialCostBrl =
    materialGrams * (pricingAssumptions.tpuFilamentBrlPerKg / 1000);
  const printHours =
    (grossVolumeMm3 / pricingAssumptions.volumetricRateMm3PerSecond / 3600) *
    pricingAssumptions.printTimeOverheadFactor;
  const machineCostBrl = printHours * pricingAssumptions.machineCostBrlPerHour;
  const energyCostBrl = printHours * pricingAssumptions.energyCostBrlPerHour;
  const directUnitCostBrl = materialCostBrl + machineCostBrl + energyCostBrl;

  return {
    volumeMm3,
    materialGrams,
    materialCostBrl,
    printHours,
    machineCostBrl,
    energyCostBrl,
    directUnitCostBrl,
    directOrderCostBrl: directUnitCostBrl * safeQuantity
  };
}

function isSlicedBreakdownPlausible(slicedBreakdown, estimatedMetrics) {
  const slicedCost = Number(slicedBreakdown.directUnitCostBrl || 0);
  const estimatedCost = Number(estimatedMetrics.directUnitCostBrl || 0);

  if (!slicedCost || !estimatedCost) {
    return true;
  }

  return slicedCost >= estimatedCost * MIN_SLICED_TO_ESTIMATED_COST_RATIO;
}

function applyMonotonicPriceGuard(format, values, breakdown, quantity, options = {}) {
  if (options.skipMonotonicGuard) {
    return breakdown;
  }

  const safeQuantity = Math.max(1, Number(quantity || 1));
  const currentUnitPrice = Number(breakdown.unitPriceBrl || 0);
  let guardedUnitPrice = currentUnitPrice;
  let guardSource = "";
  const guardedKeys = monotonicGuardKeys(format);

  for (const parameter of format.parameters) {
    if (
      parameter.type !== "number" ||
      !guardedKeys.includes(parameter.key) ||
      (parameter.dependsOn && !values?.[parameter.dependsOn])
    ) {
      continue;
    }

    const step = Number(parameter.step || 1);
    const currentValue = Number(values?.[parameter.key] ?? parameter.defaultValue);
    for (let offset = 1; offset <= MONOTONIC_GUARD_LOOKBACK_STEPS; offset += 1) {
      const previousValue = Number((currentValue - step * offset).toFixed(3));

      if (!Number.isFinite(previousValue) || previousValue < parameter.min) {
        break;
      }

      const previousValues = {
        ...values,
        [parameter.key]: previousValue
      };

      if (validateConfiguration(format, previousValues).length > 0) {
        continue;
      }

      const previousBreakdown = calculatePriceBreakdown(format, previousValues, safeQuantity, {
        skipMonotonicGuard: true
      });
      const previousUnitPrice = Number(previousBreakdown.unitPriceBrl || 0);

      if (previousUnitPrice > guardedUnitPrice) {
        guardedUnitPrice = previousUnitPrice;
        guardSource = parameter.key;
      }
    }
  }

  if (guardedUnitPrice <= currentUnitPrice) {
    return breakdown;
  }

  return {
    ...breakdown,
    unitPriceBrl: roundMoney(guardedUnitPrice),
    totalPriceBrl: roundMoney(guardedUnitPrice * safeQuantity),
    marketAdjustment: "monotonic_price_guard",
    monotonicGuardApplied: true,
    monotonicGuardSource: guardSource
  };
}

function monotonicGuardKeys(format) {
  switch (format.drawingType) {
    case "tube-round":
      return ["diametroBase"];
    case "tube-rect":
    case "tube-oblong":
      return ["tamanhoBaseX", "tamanhoBaseY"];
    case "base-round":
      return ["diametro"];
    case "base-rect":
      return ["tamanhoBaseX", "tamanhoBaseY"];
    default:
      return [];
  }
}

export function calculateLeadTime(format, quantity = 1) {
  const extra = Number(quantity || 1) > 24 ? 2 : 0;
  return format.leadTimeBaseDays + extra + (format.status === "review" ? 3 : 0);
}

export function buildConfigurationSku(format, values) {
  const parts = format.parameters
    .filter((parameter) => parameter.type !== "boolean")
    .slice(0, 3)
    .map((parameter) => {
      return String(values[parameter.key] ?? parameter.defaultValue).replace(".", "P");
    });

  return `${format.skuPrefix}-${parts.join("X")}`;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundMetric(value) {
  return Math.round(value * 10) / 10;
}

function readValue(values, key, fallback = 0) {
  return Math.max(0, Number(values[key] ?? fallback ?? 0));
}

function parameterDefault(format, key) {
  return format.parameters.find((parameter) => parameter.key === key)?.defaultValue || 0;
}

function value(values, format, key) {
  return readValue(values, key, parameterDefault(format, key));
}

function validateNeckFitsBase(format, values) {
  if (!values?.pescoco) {
    return "";
  }

  const neckDiameter = value(values, format, "diametroPescoco");
  const baseLimit = getNeckBaseLimit(format, values);

  if (!baseLimit || neckDiameter <= baseLimit) {
    return "";
  }

  return `Diametro da haste nao pode ser maior que a base (${baseLimit} mm).`;
}

function getNeckBaseLimit(format, values) {
  if (format?.slug === "redonda" && format?.drawingType === "base-round") {
    return value(values, format, "diametro");
  }

  if (format?.slug === "quadrada" && format?.drawingType === "base-rect") {
    return Math.min(
      value(values, format, "tamanhoBaseX"),
      value(values, format, "tamanhoBaseY")
    );
  }

  return 0;
}

function validateTubeWallFitsBase(format, values) {
  const baseLimit = getTubeWallBaseLimit(format, values);

  if (!baseLimit) {
    return "";
  }

  const wallTotal = value(values, format, "paredeTubo") * 2;

  if (wallTotal <= baseLimit) {
    return "";
  }

  return `Parede do tubo x 2 nao pode ser maior que a base (${baseLimit} mm).`;
}

function getTubeWallBaseLimit(format, values) {
  if (format?.drawingType === "tube-round") {
    return value(values, format, "diametroBase");
  }

  if (format?.drawingType === "tube-rect" || format?.drawingType === "tube-oblong") {
    return Math.min(
      value(values, format, "tamanhoBaseX"),
      value(values, format, "tamanhoBaseY")
    );
  }

  return 0;
}

function circleArea(diameter) {
  return Math.PI * Math.pow(diameter / 2, 2);
}

function capsuleArea(length, width) {
  const straight = Math.max(0, length - width) * width;
  return straight + circleArea(width);
}

function estimatePrintedVolumeMm3(format, values) {
  switch (format.drawingType) {
    case "tube-round": {
      const innerDiameter = value(values, format, "diametroBase");
      const baseDiameter = value(values, format, "diametroBase");
      const wall = value(values, format, "paredeTubo");
      const insertionDepth = value(values, format, "alturaPescoco");
      const supportHeight = value(values, format, "alturaBase");
      const baseVolume = circleArea(baseDiameter) * supportHeight * 0.45;
      const plugVolume =
        circleArea(innerDiameter) * insertionDepth * 0.22 +
        innerDiameter * wall * insertionDepth * 1.5;
      return baseVolume + plugVolume;
    }
    case "tube-rect": {
      const width = value(values, format, "tamanhoBaseX");
      const height = value(values, format, "tamanhoBaseY");
      const wall = value(values, format, "paredeTubo");
      const insertionDepth = value(values, format, "alturaPescoco");
      const baseHeight = value(values, format, "alturaBase");
      const baseWidth = width + wall * 2 + 6;
      const baseDepth = height + wall * 2 + 6;
      const baseVolume = baseWidth * baseDepth * baseHeight * 0.78;
      const plugVolume = width * height * insertionDepth * 0.48;
      return baseVolume + plugVolume;
    }
    case "tube-oblong": {
      const width = value(values, format, "tamanhoBaseX");
      const height = value(values, format, "tamanhoBaseY");
      const wall = value(values, format, "paredeTubo");
      const insertionDepth = value(values, format, "alturaPescoco");
      const baseHeight = value(values, format, "alturaBase");
      const baseVolume = capsuleArea(width + wall * 2 + 6, height + wall * 2 + 6) * baseHeight * 0.78;
      const plugVolume = capsuleArea(width, height) * insertionDepth * 0.38 + (width + height) * wall * insertionDepth;
      return baseVolume + plugVolume;
    }
    case "base-round": {
      const diameter = value(values, format, "diametro");
      const height = value(values, format, "alturaBase");
      const neckVolume = values.pescoco
        ? circleArea(value(values, format, "diametroPescoco")) * value(values, format, "alturaPescoco") * 0.86
        : 0;
      return circleArea(diameter) * height * 0.86 + neckVolume;
    }
    case "base-oblong": {
      const length = value(values, format, "comprimento");
      const width = value(values, format, "largura");
      const height = value(values, format, "altura");
      return capsuleArea(length, width) * height * 0.84;
    }
    case "base-rect": {
      const length = value(values, format, "tamanhoBaseX");
      const width = value(values, format, "tamanhoBaseY");
      const height = value(values, format, "alturaBase");
      const neckVolume = values.pescoco
        ? circleArea(value(values, format, "diametroPescoco")) * value(values, format, "alturaPescoco") * 0.86
        : 0;
      return length * width * height * 0.84 + neckVolume;
    }
    case "base-u": {
      const plateThickness = value(values, format, "espessuraChapa");
      const channelDepth = value(values, format, "profundidadeCanal");
      const length = value(values, format, "comprimento");
      const visibleHeight = value(values, format, "alturaAparente");
      const sideWall = Math.max(2.2, plateThickness * 0.7);
      const outerWidth = plateThickness + sideWall * 2;
      const outerHeight = channelDepth + visibleHeight;
      const solidVolume = length * outerWidth * outerHeight;
      const channelVoid = length * plateThickness * channelDepth;
      return Math.max(length * outerWidth * visibleHeight, (solidVolume - channelVoid) * 0.82);
    }
    default: {
      const dimensionSum = format.parameters.reduce((sum, parameter) => {
        return sum + Number(values[parameter.key] || parameter.defaultValue || 0);
      }, 0);
      return Math.max(1000, dimensionSum * 120);
    }
  }
}

function findSlicedPricingReference(format, values) {
  if (!format) {
    return null;
  }

  const categorySlug = format.calibratedPricingCategorySlug || inferCategorySlugFromSku(format);
  const targetBbox = estimateReferenceBbox(format, values);
  const wantsNeck = Boolean(values.pescoco);
  const candidates = slicedPricingReferences.filter((reference) => {
    return (
      reference.siteCategorySlug === categorySlug &&
      reference.siteFormatSlug === format.slug &&
      Boolean(reference.hasNeck) === wantsNeck &&
      reference.materialGrams > 0
    );
  });

  if (candidates.length === 0) {
    return null;
  }

  const nearest = candidates
    .map((reference) => ({
      reference,
      score: slicedReferenceScore(format, values, reference, targetBbox)
    }))
    .sort((left, right) => left.score - right.score)[0];

  if (!nearest || nearest.score > maxSlicedReferenceScore(format)) {
    return null;
  }

  return nearest.reference;
}

function calculateSlicedPriceBreakdown(format, values, reference, quantity) {
  const categorySlug = format.calibratedPricingCategorySlug || inferCategorySlugFromSku(format);
  const slicedMetrics = interpolateSlicedMetrics(format, values, reference);
  const materialGrams = slicedMetrics.materialGrams;
  const printMinutes = slicedMetrics.printMinutes;
  const materialWithWasteGrams = materialGrams * (1 + pricingAssumptions.printWasteRate);
  const printHours = printMinutes / 60;
  const materialCostBrl =
    materialWithWasteGrams * (pricingAssumptions.tpuFilamentBrlPerKg / 1000) * quantity;
  const energyCostBrl = printHours * pricingAssumptions.energyCostBrlPerHour * quantity;
  const machineCostBrl = 0;
  const directOrderCostBrl = materialCostBrl + energyCostBrl;
  const directUnitCostBrl = directOrderCostBrl / quantity;
  const marketReference = findMarketPricingReference({
    categorySlug,
    formatSlug: format.slug,
    dimensions: marketDimensionsFromFormat(format, values),
    hasNeck: Boolean(values.pescoco)
  });
  const commercialPrice = calculateCommercialPrice({
    categorySlug,
    formatSlug: format.slug,
    directUnitCostBrl,
    quantity,
    channelFeeRate: pricingAssumptions.channelFeeRate,
    marketReference
  });
  const channelFeeBrl = commercialPrice.totalPriceBrl * pricingAssumptions.channelFeeRate;
  const totalPriceBrl = commercialPrice.totalPriceBrl;

  return {
    materialGrams: roundMetric(materialGrams),
    materialCostBrl: roundMoney(materialCostBrl / quantity),
    printHours: roundMetric(printHours),
    printMinutes: roundMetric(printMinutes),
    machineCostBrl: roundMoney(machineCostBrl / quantity),
    energyCostBrl: roundMoney(energyCostBrl / quantity),
    channelFeeBrl: roundMoney(channelFeeBrl),
    directUnitCostBrl: roundMoney(directUnitCostBrl),
    directOrderCostBrl: roundMoney(directOrderCostBrl),
    unitPriceBrl: commercialPrice.unitPriceBrl,
    totalPriceBrl,
    quantity,
    pricingMode: "sliced",
    pricingSource: "orca_slicer",
    ...commercialPrice,
    referenceSampleId: reference.sampleId,
    referenceBbox: reference.bbox,
    referenceScaleFactor: slicedMetrics.referenceScaleFactor,
    interpolationMethod: slicedMetrics.interpolationMethod,
    interpolationReferences: slicedMetrics.references,
    orcaVersion: reference.orcaVersion,
    profileId: reference.profileId,
    assumptions: pricingAssumptions
  };
}

function inferCategorySlugFromSku(format) {
  return format.skuPrefix?.includes("PI") ? "ponteira-interna-tubo" : "sapata-base-lisa";
}

function marketDimensionsFromFormat(format, values) {
  switch (format.drawingType) {
    case "tube-round":
      return {
        diameterMm: value(values, format, "diametroBase")
      };
    case "tube-rect":
    case "tube-oblong":
      return {
        sizeXmm: value(values, format, "tamanhoBaseX"),
        sizeYmm: value(values, format, "tamanhoBaseY")
      };
    case "base-round":
      return {
        diameterMm: value(values, format, "diametro"),
        heightMm:
          value(values, format, "alturaBase") +
          (values.pescoco ? value(values, format, "alturaPescoco") : 0),
        hasNeck: Boolean(values.pescoco)
      };
    case "base-rect":
      return {
        sizeXmm: value(values, format, "tamanhoBaseX"),
        sizeYmm: value(values, format, "tamanhoBaseY"),
        hasNeck: Boolean(values.pescoco)
      };
    default:
      return {};
  }
}

function interpolateSlicedMetrics(format, values, fallbackReference) {
  const categorySlug = format.calibratedPricingCategorySlug || inferCategorySlugFromSku(format);
  const targetBbox = estimateReferenceBbox(format, values);
  const wantsNeck = Boolean(values.pescoco);
  const candidates = slicedPricingReferences.filter((reference) => {
    return (
      reference.siteCategorySlug === categorySlug &&
      reference.siteFormatSlug === format.slug &&
      Boolean(reference.hasNeck) === wantsNeck &&
      reference.materialGrams > 0 &&
      reference.printMinutes > 0
    );
  });

  const nearest = candidates
    .map((reference) => ({
      reference,
      score: slicedReferenceScore(format, values, reference, targetBbox)
    }))
    .sort((left, right) => left.score - right.score)
    .filter((item) => item.score <= maxSlicedReferenceScore(format))
    .slice(0, 5);

  if (nearest.length === 0) {
    return {
      materialGrams: Number(fallbackReference.materialGrams || 0),
      printMinutes: Number(fallbackReference.printMinutes || 0),
      referenceScaleFactor: 1,
      interpolationMethod: "nearest_sliced_reference",
      references: [fallbackReference.sampleId]
    };
  }

  if (nearest[0].score <= 0.0001) {
    return {
      materialGrams: Number(nearest[0].reference.materialGrams || 0),
      printMinutes: Number(nearest[0].reference.printMinutes || 0),
      referenceScaleFactor: 1,
      interpolationMethod: "exact_sliced_reference",
      references: [nearest[0].reference.sampleId]
    };
  }

  const weighted = nearest.map((item) => ({
    ...item,
    weight: 1 / Math.max(0.02, item.score)
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);

  return {
    materialGrams: weighted.reduce((sum, item) => {
      return sum + Number(item.reference.materialGrams || 0) * item.weight;
    }, 0) / totalWeight,
    printMinutes: weighted.reduce((sum, item) => {
      return sum + Number(item.reference.printMinutes || 0) * item.weight;
    }, 0) / totalWeight,
    referenceScaleFactor: 1,
    interpolationMethod: "weighted_sliced_neighbors",
    references: weighted.map((item) => item.reference.sampleId)
  };
}

function estimateReferenceBbox(format, values) {
  switch (format.drawingType) {
    case "tube-round": {
      const diameter = value(values, format, "diametroBase");
      return {
        x: diameter,
        y: diameter,
        z: value(values, format, "alturaBase") + value(values, format, "alturaPescoco")
      };
    }
    case "tube-rect":
    case "tube-oblong": {
      return {
        x: value(values, format, "tamanhoBaseX"),
        y: value(values, format, "tamanhoBaseY"),
        z: value(values, format, "alturaBase") + value(values, format, "alturaPescoco")
      };
    }
    case "base-round": {
      return {
        x: value(values, format, "diametro"),
        y: value(values, format, "diametro"),
        z:
          value(values, format, "alturaBase") +
          (values.pescoco ? value(values, format, "alturaPescoco") : 0)
      };
    }
    case "base-rect": {
      return {
        x: value(values, format, "tamanhoBaseX"),
        y: value(values, format, "tamanhoBaseY"),
        z:
          value(values, format, "alturaBase") +
          (values.pescoco ? value(values, format, "alturaPescoco") : 0)
      };
    }
    default:
      return { x: 0, y: 0, z: 0 };
  }
}

function slicedReferenceScore(format, values, reference, targetBbox = estimateReferenceBbox(format, values)) {
  return (
    referenceDistance(reference.bbox, targetBbox) +
    referenceSliderDistance(format, values, reference.sliderValues) * 1.2
  );
}

function maxSlicedReferenceScore(format) {
  if (format?.drawingType === "base-round" || format?.drawingType === "base-rect") {
    return 0.18;
  }

  return 0.42;
}

function referenceSliderDistance(format, values, sliderValues = {}) {
  const pairs = referenceSliderPairs(format, values, sliderValues);

  if (pairs.length === 0) {
    return 0;
  }

  return pairs.reduce((sum, pair) => {
    const target = Number(pair.target || 0);
    const reference = Number(pair.reference || 0);
    const scale = Math.max(1, target, reference);
    return sum + Math.pow((reference - target) / scale, 2);
  }, 0) / pairs.length;
}

function referenceSliderPairs(format, values, sliderValues = {}) {
  const pairs = [];
  const addPair = (siteKey, sliderKey) => {
    const reference = numberFromSlider(sliderValues, sliderKey);

    if (!Number.isFinite(reference)) {
      return;
    }

    pairs.push({
      siteKey,
      target: value(values, format, siteKey),
      reference
    });
  };

  switch (format.drawingType) {
    case "tube-round":
      addPair("diametroBase", "diametro");
      addPair("alturaBase", "Altura_Base");
      addPair("alturaPescoco", "Altura_Pescoco");
      addPair("paredeTubo", "Parede_Tubo");
      break;
    case "tube-rect":
    case "tube-oblong":
      addPair("alturaBase", "Altura_Base");
      addPair("alturaPescoco", "Altura_Pescoco");
      addPair("paredeTubo", "Parede_Tubo");
      break;
    default:
      break;
  }

  return pairs;
}

function numberFromSlider(sliderValues = {}, key) {
  const value = Number(sliderValues[key]);
  return Number.isFinite(value) ? value : Number.NaN;
}

function referenceDistance(referenceBbox = {}, targetBbox = {}) {
  return ["x", "y", "z"].reduce((sum, key) => {
    const target = Number(targetBbox[key] || 0);
    const reference = Number(referenceBbox[key] || 0);
    const scale = Math.max(1, target);
    return sum + Math.pow((reference - target) / scale, 2);
  }, 0);
}

function estimateReferencePrintedVolumeMm3(format, reference = {}) {
  const bbox = reference.bbox || {};
  const x = Number(bbox.x || 0);
  const y = Number(bbox.y || 0);
  const z = Number(bbox.z || 0);

  switch (format.drawingType) {
    case "base-round":
      return circleArea(x) * z * 0.86;
    case "base-rect":
      return x * y * z * 0.84;
    case "tube-round":
      return circleArea(x) * z * 0.35;
    case "tube-oblong":
      return capsuleArea(x, y) * z * 0.55;
    case "tube-rect":
      return x * y * z * 0.55;
    default:
      return x * y * z;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length === 0) {
    return 0;
  }

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
