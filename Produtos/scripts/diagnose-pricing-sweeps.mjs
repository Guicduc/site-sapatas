import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.TRACO_BASE_REPO
  ? path.resolve(process.env.TRACO_BASE_REPO)
  : path.resolve(scriptDir, "../..");
const datasetPath = path.join(repoRoot, "Produtos", "datasets", "slicer_pricing_dataset.csv");

const pricingAssumptions = {
  tpuFilamentBrlPerKg: 170,
  printWasteRate: 0.05,
  printerPurchasePriceBrl: 7000,
  printerLifetimeHours: 7000,
  annualOperatingHours: 2000,
  annualMaintenanceBrl: 600,
  averagePowerDrawW: 200,
  electricityTariffBrlPerKwh: 0.95,
  minOrderPriceBrl: 0.3
};

const progressiveDimensionKeys = new Set(["diametro", "diametroBase", "tamanhoBaseX", "tamanhoBaseY"]);
const monotonicToleranceBrl = Number(process.env.PRICING_MONOTONIC_TOLERANCE_BRL || 0.05);
const salePriceRoundingIncrementBrl = 0.25;
const saleMultipliers = {
  "ponteira-interna-tubo": 1.7,
  "sapata-base-lisa": 4
};

function progressiveAxisKeysForFormat(format) {
  return new Set(progressiveDimensionKeys);
}

function saleMultiplierForFormat(format) {
  return saleMultipliers[format.categorySlug] || 1;
}

function roundSalePrice(value) {
  return roundMoney(Math.ceil(Number(value || 0) / salePriceRoundingIncrementBrl) * salePriceRoundingIncrementBrl);
}

const formats = [
  {
    categorySlug: "ponteira-interna-tubo",
    formatSlug: "redondo",
    variantSlug: "sem-haste",
    label: "Tubo redondo",
    defaults: { diametroBase: 28, alturaBase: 6, alturaPescoco: 18, paredeTubo: 1.5 },
    parameters: [
      { key: "diametroBase", min: 3, max: 150, step: 1 },
      { key: "alturaBase", min: 1, max: 10, step: 1 },
      { key: "alturaPescoco", min: 5, max: 35, step: 1 },
      { key: "paredeTubo", min: 0.8, max: 8, step: 0.1 }
    ]
  },
  {
    categorySlug: "ponteira-interna-tubo",
    formatSlug: "quadrado",
    variantSlug: "sem-haste",
    label: "Tubo quadrado",
    defaults: { tamanhoBaseX: 30, tamanhoBaseY: 30, alturaBase: 6, alturaPescoco: 20, paredeTubo: 1.5 },
    parameters: [
      { key: "tamanhoBaseX", min: 3, max: 150, step: 1 },
      { key: "tamanhoBaseY", min: 3, max: 150, step: 1 },
      { key: "alturaBase", min: 1, max: 10, step: 1 },
      { key: "alturaPescoco", min: 5, max: 35, step: 1 },
      { key: "paredeTubo", min: 0.8, max: 8, step: 0.1 }
    ]
  },
  {
    categorySlug: "ponteira-interna-tubo",
    formatSlug: "oblongo",
    variantSlug: "sem-haste",
    label: "Tubo oblongo",
    defaults: { tamanhoBaseX: 36, tamanhoBaseY: 18, alturaBase: 6, alturaPescoco: 18, paredeTubo: 1.5 },
    parameters: [
      { key: "tamanhoBaseX", min: 3, max: 150, step: 1 },
      { key: "tamanhoBaseY", min: 3, max: 150, step: 1 },
      { key: "alturaBase", min: 1, max: 10, step: 1 },
      { key: "alturaPescoco", min: 5, max: 35, step: 1 },
      { key: "paredeTubo", min: 0.8, max: 8, step: 0.1 }
    ]
  },
  {
    categorySlug: "sapata-base-lisa",
    formatSlug: "redonda",
    variantSlug: "sem-haste",
    label: "Lisa redonda",
    defaults: { diametro: 28, alturaBase: 6 },
    parameters: [
      { key: "diametro", min: 3, max: 150, step: 1 },
      { key: "alturaBase", min: 1, max: 10, step: 1 }
    ]
  },
  {
    categorySlug: "sapata-base-lisa",
    formatSlug: "redonda",
    variantSlug: "haste",
    label: "Lisa redonda haste",
    defaults: { diametro: 28, alturaBase: 6, alturaPescoco: 12, diametroPescoco: 8 },
    parameters: [
      { key: "diametro", min: 3, max: 150, step: 1 },
      { key: "alturaBase", min: 1, max: 10, step: 1 },
      { key: "alturaPescoco", min: 5, max: 35, step: 1 },
      { key: "diametroPescoco", min: 3, max: 15, step: 1 }
    ]
  },
  {
    categorySlug: "sapata-base-lisa",
    formatSlug: "quadrada",
    variantSlug: "sem-haste",
    label: "Lisa quadrada",
    defaults: { tamanhoBaseX: 50, tamanhoBaseY: 50, alturaBase: 7 },
    parameters: [
      { key: "tamanhoBaseX", min: 3, max: 150, step: 1 },
      { key: "tamanhoBaseY", min: 3, max: 150, step: 1 },
      { key: "alturaBase", min: 1, max: 10, step: 1 }
    ]
  },
  {
    categorySlug: "sapata-base-lisa",
    formatSlug: "quadrada",
    variantSlug: "haste",
    label: "Lisa quadrada haste",
    defaults: { tamanhoBaseX: 50, tamanhoBaseY: 50, alturaBase: 7, alturaPescoco: 12, diametroPescoco: 8 },
    parameters: [
      { key: "tamanhoBaseX", min: 3, max: 150, step: 1 },
      { key: "tamanhoBaseY", min: 3, max: 150, step: 1 },
      { key: "alturaBase", min: 1, max: 10, step: 1 },
      { key: "alturaPescoco", min: 5, max: 35, step: 1 },
      { key: "diametroPescoco", min: 3, max: 15, step: 1 }
    ]
  }
];

async function main() {
  const checkMode = process.argv.includes("--check");
  const rows = await readDataset();
  const samples = rows
    .filter((row) => row.slice_status === "ok" && Number(row.material_grams || 0) > 0 && Number(row.print_minutes || 0) > 0)
    .map((row) => ({
      sampleId: row.sample_id,
      categorySlug: row.category_slug,
      formatSlug: row.format_slug,
      variantSlug: row.variant_slug,
      params: Object.fromEntries(
        ["diametro", "diametroBase", "tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "diametroPescoco", "paredeTubo"]
          .filter((key) => row[key] !== "")
          .map((key) => [key, Number(row[key])])
      ),
      materialGrams: Number(row.material_grams),
      printMinutes: Number(row.print_minutes)
    }));

  const sweepSummary = [];
  const worstDrops = [];
  const coverageSummary = [];

  for (const format of formats) {
    const candidates = samples.filter((sample) => sample.categorySlug === format.categorySlug && sample.formatSlug === format.formatSlug && sample.variantSlug === format.variantSlug);
    coverageSummary.push(buildCoverageSummary(format, candidates));

    for (const parameter of format.parameters) {
      const points = [];
      const values = range(parameter.min, parameter.max, parameter.step);
      for (const value of values) {
        const request = { ...format.defaults, [parameter.key]: value };
        const resolved = resolveByCurrentEngine(
          candidates,
          request,
          format.parameters.map((item) => ({ ...item, defaultValue: format.defaults[item.key] })),
          progressiveAxisKeysForFormat(format)
        );
        const unitCost = Math.max(
          productionCost(resolved),
          Number(resolved.progressiveUnitCostFloorBrl || 0),
          pricingAssumptions.minOrderPriceBrl
        );
        const cost = roundSalePrice(unitCost * saleMultiplierForFormat(format));
        points.push({ value, cost, materialGrams: resolved.materialGrams, printMinutes: resolved.printMinutes, mode: resolved.mode });
      }

      const diagnostics = diagnosePoints(points);
      sweepSummary.push({
        family: `${format.categorySlug}:${format.formatSlug}:${format.variantSlug}`,
        parameter: parameter.key,
        samples: candidates.length,
        points: points.length,
        drops: diagnostics.drops.length,
        plateauSegments: diagnostics.plateauSegments.length,
        longestPlateau: diagnostics.longestPlateau,
        minCost: roundMoney(Math.min(...points.map((point) => point.cost))),
        maxCost: roundMoney(Math.max(...points.map((point) => point.cost)))
      });
      worstDrops.push(
        ...diagnostics.drops.slice(0, 3).map((drop) => ({
          family: `${format.categorySlug}:${format.formatSlug}:${format.variantSlug}`,
          parameter: parameter.key,
          ...drop
        }))
      );
    }
  }

  const result = { monotonicToleranceBrl, coverageSummary, sweepSummary, worstDrops: worstDrops.slice(0, 40) };
  const outputPath = path.join(repoRoot, "Produtos", "logs", "pricing-sweep-diagnostics.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const missingFamilies = coverageSummary.filter((summary) => summary.samples === 0);
  const totalDrops = sweepSummary.reduce((sum, summary) => sum + summary.drops, 0);

  if (!checkMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(
    [
      `Pricing check: ${totalDrops} quedas em ${sweepSummary.length} sweeps.`,
      `Tolerancia monotonicidade: R$ ${monotonicToleranceBrl.toFixed(2)}.`,
      `Familias sem amostras Orca: ${missingFamilies.length}.`,
      `Relatorio: ${outputPath}`
    ].join("\n")
  );

  if (totalDrops > 0 || missingFamilies.length > 0) {
    process.exitCode = 1;
  }
}

function resolveByCurrentEngine(candidates, requestedParams, parameters, progressiveAxisKeys) {
  const activeKeys = Object.keys(requestedParams).filter((key) => candidates.some((sample) => Number.isFinite(Number(sample.params?.[key]))));
  const ranges = parameterRanges(candidates, activeKeys);
  const exact = findExactSlicerSample(candidates, requestedParams, activeKeys);
  const resolved = interpolatedSlicerMetrics(candidates, requestedParams, activeKeys, ranges);
  const progressiveUnitCostFloorBrl = progressiveSlicerUnitCostFloor(candidates, requestedParams, activeKeys, ranges, parameters, progressiveAxisKeys);

  return {
    materialGrams: resolved.materialGrams,
    printMinutes: resolved.printMinutes,
    progressiveUnitCostFloorBrl,
    mode: exact ? "exact" : "interpolated"
  };
}

function buildCoverageSummary(format, candidates) {
  return {
    family: `${format.categorySlug}:${format.formatSlug}:${format.variantSlug}`,
    samples: candidates.length,
    uniquePerParameter: Object.fromEntries(
      format.parameters.map((parameter) => [
        parameter.key,
        new Set(candidates.map((sample) => sample.params?.[parameter.key]).filter((value) => value !== undefined)).size
      ])
    ),
    duplicateParamVectors: candidates.length - new Set(candidates.map((sample) => JSON.stringify(format.parameters.map((parameter) => sample.params?.[parameter.key] ?? "")))).size
  };
}

function diagnosePoints(points) {
  const drops = [];
  const plateauSegments = [];
  let plateauStart = null;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const delta = current.cost - previous.cost;

    if (delta < -monotonicToleranceBrl) {
      drops.push({
        fromValue: previous.value,
        toValue: current.value,
        fromCost: roundMoney(previous.cost),
        toCost: roundMoney(current.cost),
        delta: roundMoney(delta)
      });
    }

    if (Math.abs(delta) < 0.005) {
      plateauStart ??= previous.value;
    } else if (plateauStart !== null) {
      plateauSegments.push({ from: plateauStart, to: previous.value });
      plateauStart = null;
    }
  }

  if (plateauStart !== null) {
    plateauSegments.push({ from: plateauStart, to: points.at(-1).value });
  }

  return {
    drops,
    plateauSegments,
    longestPlateau: plateauSegments.reduce((longest, segment) => Math.max(longest, segment.to - segment.from), 0)
  };
}

function parameterRanges(candidates, activeKeys) {
  return Object.fromEntries(
    activeKeys.map((key) => {
      const values = candidates.map((sample) => Number(sample.params?.[key])).filter((value) => Number.isFinite(value));
      return [key, { min: Math.min(...values), max: Math.max(...values) }];
    })
  );
}

function normalizedSampleDistance(sample, requestedParams, ranges, activeKeys) {
  if (activeKeys.length === 0) {
    return 0;
  }

  return Math.sqrt(
    activeKeys.reduce((sum, key) => {
      const range = ranges[key];
      const scale = Math.max(1, range.max - range.min);
      return sum + Math.pow((Number(sample.params?.[key] || 0) - Number(requestedParams[key] || 0)) / scale, 2);
    }, 0)
  );
}

function weightedSlicerMetrics(samples) {
  const weighted = samples.reduce(
    (sum, sample) => {
      const weight = 1 / Math.pow(sample.distance + 0.0001, 2);
      return {
        materialGrams: sum.materialGrams + sample.materialGrams * weight,
        printMinutes: sum.printMinutes + sample.printMinutes * weight,
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
    .map((sample) => ({ ...sample, distance: normalizedSampleDistance(sample, requestedParams, ranges, activeKeys) }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 8);

  return weightedSlicerMetrics(nearestSamples);
}

function findExactSlicerSample(candidates, requestedParams, activeKeys) {
  return candidates.find((sample) => activeKeys.every((key) => Math.abs(Number(sample.params?.[key] || 0) - Number(requestedParams[key] || 0)) <= 0.01));
}

function progressiveSlicerUnitCostFloor(candidates, requestedParams, activeKeys, ranges, parameters, progressiveAxisKeys) {
  let floor = productionCost(interpolatedSlicerMetrics(candidates, requestedParams, activeKeys, ranges));

  const dominatedSamples = candidates.filter((sample) => {
    return activeKeys.every((key) => {
      const sampleValue = Number(sample.params?.[key]);
      const requestedValue = Number(requestedParams[key]);
      return Number.isFinite(sampleValue) && Number.isFinite(requestedValue) && sampleValue <= requestedValue + 0.01;
    });
  });

  for (const sample of dominatedSamples) {
    floor = Math.max(floor, productionCost(sample));
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

    for (const value of rangeValues(minValue, maxValue, step)) {
      const metrics = interpolatedSlicerMetrics(candidates, { ...requestedParams, [key]: value }, activeKeys, ranges);
      floor = Math.max(floor, productionCost(metrics));
    }
  }

  return floor;
}

function rangeValues(min, max, step) {
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

function productionCost({ materialGrams, printMinutes }) {
  const materialWithWasteGrams = materialGrams * (1 + pricingAssumptions.printWasteRate);
  const printHours = printMinutes / 60;
  const materialCostBrl = materialWithWasteGrams * (pricingAssumptions.tpuFilamentBrlPerKg / 1000);
  const energyCostBrl =
    (pricingAssumptions.averagePowerDrawW / 1000) *
    printHours *
    pricingAssumptions.electricityTariffBrlPerKwh *
    (1 + pricingAssumptions.printWasteRate);
  const maintenanceCostBrl =
    (pricingAssumptions.annualMaintenanceBrl / pricingAssumptions.annualOperatingHours) * printHours;
  const printerWearCostBrl =
    (pricingAssumptions.printerPurchasePriceBrl / pricingAssumptions.printerLifetimeHours) *
    printHours *
    (1 + pricingAssumptions.printWasteRate);
  return Math.max(
    pricingAssumptions.minOrderPriceBrl,
    materialCostBrl + energyCostBrl + maintenanceCostBrl + printerWearCostBrl
  );
}

async function readDataset() {
  const text = await fs.readFile(datasetPath, "utf8");
  const records = parseCsv(text);
  const headers = records[0] || [];
  return records.slice(1).map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
}

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

function range(min, max, step) {
  const values = [];
  for (let value = min; value <= max + 0.000001; value += step) {
    values.push(roundMetric(value, step < 1 ? 1 : 0));
  }
  return values;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function roundMetric(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value || 0) * factor) / factor;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
