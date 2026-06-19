import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculatePriceBreakdown,
  getInitialValues,
  productCategories
} from "../../lib/configurator-data.js";
import { families } from "../../lib/site-data.js";
import {
  slicerPricingSamples,
  slicerPricingSurfaceCounts,
  slicerPricingSource
} from "../../lib/slicer-pricing-data.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.TRACO_BASE_REPO
  ? path.resolve(process.env.TRACO_BASE_REPO)
  : path.resolve(scriptDir, "../..");
const datasetPath = path.join(repoRoot, slicerPricingSource);
const outputPath = path.join(repoRoot, "Produtos", "logs", "pricing-audit-workflow.json");
const checkMode = process.argv.includes("--check");
const priceToleranceBrl = Number(process.env.PRICING_AUDIT_PRICE_TOLERANCE_BRL || 0.01);
const costToleranceBrl = Number(process.env.PRICING_AUDIT_COST_TOLERANCE_BRL || 0.02);
const monotonicToleranceBrl = Number(process.env.PRICING_MONOTONIC_TOLERANCE_BRL || 0.05);

const familyFormatMap = {
  "sapata-tubo-redondo": ["ponteira-interna-tubo", "redondo"],
  "sapata-tubo-quadrado": ["ponteira-interna-tubo", "quadrado"],
  "sapata-tubo-oblongo": ["ponteira-interna-tubo", "oblongo"],
  "sapata-lisa-redonda": ["sapata-base-lisa", "redonda"],
  "sapata-lisa-quadrada": ["sapata-base-lisa", "quadrada"]
};
const intentionallyUnexposedSurfaceIds = new Set([
  "sapata-base-lisa:quadrada:com-parafuso",
  "sapata-base-lisa:redonda:com-parafuso"
]);

async function main() {
  const csvRows = await readDataset(datasetPath);
  const validCsvRows = csvRows.filter(hasValidSliceMetrics);
  const categoriesBySlug = new Map(productCategories.map((category) => [category.slug, category]));
  const formats = exposedFormats(categoriesBySlug);
  const hypotheses = [
    testDatasetGeneratedDataDrift(validCsvRows),
    testExposedSurfaceCoverage(formats),
    testPublicFamilyPriceFrom(families, categoriesBySlug),
    testDefaultPricingCoverage(families, categoriesBySlug),
    testSlicerSamplePricingSanity(formats),
    testMonotonicSweeps(formats),
    testUnexposedSlicerSurfaces(formats)
  ];
  const failing = hypotheses.filter((hypothesis) => hypothesis.status === "fail");
  const warning = hypotheses.filter((hypothesis) => hypothesis.status === "warn");
  const result = {
    generatedAt: new Date().toISOString(),
    datasetPath: path.relative(repoRoot, datasetPath).replaceAll("\\", "/"),
    generatedDataPath: "lib/slicer-pricing-data.js",
    summary: {
      status: failing.length > 0 ? "fail" : "pass",
      hypotheses: hypotheses.length,
      passed: hypotheses.filter((hypothesis) => hypothesis.status === "pass").length,
      warnings: warning.length,
      failed: failing.length
    },
    hypotheses
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(
    [
      `Pricing audit: ${result.summary.passed}/${result.summary.hypotheses} hipoteses aprovadas.`,
      `Falhas: ${result.summary.failed}. Avisos: ${result.summary.warnings}.`,
      `Relatorio: ${outputPath}`
    ].join("\n")
  );

  if (!checkMode) {
    console.log(JSON.stringify(result, null, 2));
  }

  if (checkMode && failing.length > 0) {
    process.exitCode = 1;
  }
}

function exposedFormats(categoriesBySlug) {
  const formats = [];

  for (const family of families) {
    const mapping = familyFormatMap[family.slug];
    if (!mapping) {
      continue;
    }

    const [categorySlug, formatSlug] = mapping;
    const category = categoriesBySlug.get(categorySlug);
    const format = category?.formats.find((candidate) => candidate.slug === formatSlug);
    if (!format) {
      continue;
    }

    formats.push({
      familySlug: family.slug,
      family,
      categorySlug,
      formatSlug,
      category,
      format,
      variants: variantSlugsForFormat(format)
    });
  }

  return formats;
}

function variantSlugsForFormat(format) {
  return format.parameters.some((parameter) => parameter.key === "pescoco")
    ? ["sem-haste", "haste"]
    : ["sem-haste"];
}

function valuesForVariant(format, variantSlug, overrides = {}) {
  return {
    ...getInitialValues(format),
    ...(variantSlug === "haste" ? { pescoco: true } : { pescoco: false }),
    ...overrides
  };
}

function testDatasetGeneratedDataDrift(validCsvRows) {
  const csvById = new Map(validCsvRows.map((row) => [row.sample_id, row]));
  const generatedById = new Map(slicerPricingSamples.map((sample) => [sample.sampleId, sample]));
  const missingInGenerated = validCsvRows
    .filter((row) => !generatedById.has(row.sample_id))
    .map((row) => row.sample_id);
  const missingInCsv = slicerPricingSamples
    .filter((sample) => !csvById.has(sample.sampleId))
    .map((sample) => sample.sampleId);
  const metricMismatches = [];

  for (const sample of slicerPricingSamples) {
    const row = csvById.get(sample.sampleId);
    if (!row) {
      continue;
    }

    const checks = [
      ["materialGrams", Number(row.material_grams || 0), sample.materialGrams, 0.01],
      ["printMinutes", Number(row.print_minutes || 0), sample.printMinutes, 0.01],
      ["productionCostBrl", Number(row.production_cost_brl || 0), sample.productionCostBrl, costToleranceBrl]
    ];

    for (const [field, csvValue, generatedValue, tolerance] of checks) {
      if (Math.abs(csvValue - generatedValue) > tolerance) {
        metricMismatches.push({
          sampleId: sample.sampleId,
          field,
          csvValue,
          generatedValue
        });
      }
    }
  }

  const csvSurfaceCounts = countSurfaces(
    validCsvRows.map((row) => ({
      categorySlug: row.category_slug,
      formatSlug: row.format_slug,
      variantSlug: row.variant_slug || (row.has_neck === "true" ? "haste" : "sem-haste")
    }))
  );
  const generatedSurfaceCountDrift = objectDiff(csvSurfaceCounts, slicerPricingSurfaceCounts);
  const failed =
    missingInGenerated.length > 0 ||
    missingInCsv.length > 0 ||
    metricMismatches.length > 0 ||
    generatedSurfaceCountDrift.length > 0;

  return {
    id: "dataset-generated-data-drift",
    hypothesis: "O CSV canonico do slicer e o JS consumido pelo site podem estar divergentes.",
    status: failed ? "fail" : "pass",
    tested: {
      validCsvRows: validCsvRows.length,
      generatedSamples: slicerPricingSamples.length,
      missingInGenerated: missingInGenerated.slice(0, 20),
      missingInCsv: missingInCsv.slice(0, 20),
      metricMismatches: metricMismatches.slice(0, 20),
      generatedSurfaceCountDrift
    }
  };
}

function testExposedSurfaceCoverage(formats) {
  const missingSurfaces = [];
  const lowCoverage = [];

  for (const item of formats) {
    for (const variantSlug of item.variants) {
      const samples = samplesForSurface(item.categorySlug, item.formatSlug, variantSlug);
      const surfaceId = surfaceKey(item.categorySlug, item.formatSlug, variantSlug);

      if (samples.length === 0) {
        missingSurfaces.push(surfaceId);
        continue;
      }

      const activeKeys = activeKeysForFormat(item.format, valuesForVariant(item.format, variantSlug));
      const uniquePerKey = Object.fromEntries(
        activeKeys.map((key) => [
          key,
          new Set(samples.map((sample) => sample.params?.[key]).filter((value) => value !== undefined)).size
        ])
      );
      const sparseKeys = Object.entries(uniquePerKey)
        .filter(([, count]) => count < 2)
        .map(([key]) => key);

      if (sparseKeys.length > 0) {
        lowCoverage.push({ surfaceId, samples: samples.length, sparseKeys, uniquePerKey });
      }
    }
  }

  return {
    id: "exposed-surface-coverage",
    hypothesis: "Alguma variacao vendavel no site pode nao ter amostras do slicer suficientes.",
    status: missingSurfaces.length > 0 ? "fail" : lowCoverage.length > 0 ? "warn" : "pass",
    tested: {
      exposedSurfaces: formats.reduce((sum, item) => sum + item.variants.length, 0),
      missingSurfaces,
      lowCoverage
    }
  };
}

function testPublicFamilyPriceFrom(siteFamilies, categoriesBySlug) {
  const checks = [];

  for (const family of siteFamilies) {
    const mapping = familyFormatMap[family.slug];
    if (!mapping) {
      continue;
    }

    const [categorySlug, formatSlug] = mapping;
    const format = categoriesBySlug.get(categorySlug)?.formats.find((candidate) => candidate.slug === formatSlug);
    if (!format) {
      checks.push({ familySlug: family.slug, status: "fail", reason: "format_not_found" });
      continue;
    }

    const observed = observedFamilyPrices(format, categorySlug, formatSlug);
    const expectedPriceFromBrl = roundMoney(
      Math.min(...family.variants.map((variant) => Number(variant.priceBrl || 0)))
    );
    const delta = roundMoney(Number(family.priceFromBrl || 0) - expectedPriceFromBrl);
    checks.push({
      familySlug: family.slug,
      categorySlug,
      formatSlug,
      sitePriceFromBrl: Number(family.priceFromBrl || 0),
      expectedPriceFromBrl,
      minFamilyVariantPriceBrl: expectedPriceFromBrl,
      defaultUnitPriceBrl: observed.defaultUnitPriceBrl,
      minObservedUnitPriceBrl: observed.minObservedUnitPriceBrl,
      maxObservedUnitPriceBrl: observed.maxObservedUnitPriceBrl,
      sampleCount: observed.sampleCount,
      delta,
      status: Math.abs(delta) <= priceToleranceBrl ? "pass" : "fail"
    });
  }

  return {
    id: "public-price-from-stale",
    hypothesis: "O preco 'a partir de' publicado pode estar desatualizado frente ao motor e ao slicer.",
    status: checks.some((check) => check.status === "fail") ? "fail" : "pass",
    tested: checks
  };
}

function observedFamilyPrices(format, categorySlug, formatSlug) {
  const defaultBreakdown = calculatePriceBreakdown(format, getInitialValues(format), 1);
  const candidates = [];

  for (const variantSlug of variantSlugsForFormat(format)) {
    for (const values of boundaryCases(format, variantSlug)) {
      candidates.push(calculatePriceBreakdown(format, values, 1).unitPriceBrl);
    }
  }

  return {
    defaultUnitPriceBrl: defaultBreakdown.unitPriceBrl,
    minObservedUnitPriceBrl: roundMoney(Math.min(...candidates)),
    maxObservedUnitPriceBrl: roundMoney(Math.max(...candidates)),
    sampleCount: candidates.length
  };
}

function testDefaultPricingCoverage(siteFamilies, categoriesBySlug) {
  const checks = [];

  for (const family of siteFamilies) {
    const mapping = familyFormatMap[family.slug];
    if (!mapping) {
      continue;
    }

    const [categorySlug, formatSlug] = mapping;
    const format = categoriesBySlug.get(categorySlug)?.formats.find((candidate) => candidate.slug === formatSlug);
    if (!format) {
      continue;
    }

    for (const variantSlug of variantSlugsForFormat(format)) {
      const values = valuesForVariant(format, variantSlug);
      const breakdown = calculatePriceBreakdown(format, values, 1);
      checks.push({
        familySlug: family.slug,
        surfaceId: surfaceKey(categorySlug, formatSlug, variantSlug),
        pricingMode: breakdown.pricingMode,
        inRange: breakdown.coverage?.inRange,
        ownSampleCount: breakdown.coverage?.ownSampleCount,
        referenceSampleIds: breakdown.referenceSampleIds,
        status:
          breakdown.pricingMode === "slicer_dataset_missing" || breakdown.coverage?.inRange === false
            ? "fail"
            : "pass"
      });
    }
  }

  return {
    id: "default-config-slicer-coverage",
    hypothesis: "A configuracao inicial de algum modelo pode cair fora da malha do slicer.",
    status: checks.some((check) => check.status === "fail") ? "fail" : "pass",
    tested: checks
  };
}

function testSlicerSamplePricingSanity(formats) {
  const checks = [];
  const exposedSurfaceIds = new Set(
    formats.flatMap((item) =>
      item.variants.map((variantSlug) => surfaceKey(item.categorySlug, item.formatSlug, variantSlug))
    )
  );

  for (const item of formats) {
    for (const variantSlug of item.variants) {
      const surfaceId = surfaceKey(item.categorySlug, item.formatSlug, variantSlug);
      if (!exposedSurfaceIds.has(surfaceId)) {
        continue;
      }

      const failures = [];
      const samples = samplesForSurface(item.categorySlug, item.formatSlug, variantSlug);
      for (const sample of samples) {
        const directUnitCostBrl = Number(sample.productionCostBrl || 0);
        const unitPriceBrl = Math.max(
          0.3,
          roundSalePrice(directUnitCostBrl * saleMultiplierForFormat(item.format))
        );
        const netRevenueBrl = unitPriceBrl * 0.94;
        const hasPositiveMargin = netRevenueBrl + 0.0001 >= directUnitCostBrl;

        if (!hasPositiveMargin || unitPriceBrl <= 0 || directUnitCostBrl <= 0) {
          failures.push({
            sampleId: sample.sampleId,
            unitPriceBrl,
            directUnitCostBrl,
            netRevenueBrl: roundMoney(netRevenueBrl)
          });
        }
      }

      checks.push({
        surfaceId,
        sampleCount: samples.length,
        failures: failures.slice(0, 20),
        status: failures.length > 0 ? "fail" : "pass"
      });
    }
  }

  return {
    id: "slicer-sample-pricing-sanity",
    hypothesis: "Alguma amostra real do slicer pode gerar preco sem margem positiva.",
    status: checks.some((check) => check.status === "fail") ? "fail" : "pass",
    tested: checks
  };
}

function testMonotonicSweeps(formats) {
  const checks = [];

  for (const item of formats) {
    for (const variantSlug of item.variants) {
      const defaults = valuesForVariant(item.format, variantSlug);
      for (const parameter of item.format.parameters) {
        if (parameter.type === "boolean" || (parameter.dependsOn && !defaults[parameter.dependsOn])) {
          continue;
        }

        const points = representativeValues(parameter, defaults[parameter.key]).map((value) => {
          const breakdown = calculatePriceBreakdown(item.format, { ...defaults, [parameter.key]: value }, 1);
          return {
            value,
            unitPriceBrl: breakdown.unitPriceBrl,
            pricingMode: breakdown.pricingMode
          };
        });
        const drops = diagnoseDrops(points);
        checks.push({
          surfaceId: surfaceKey(item.categorySlug, item.formatSlug, variantSlug),
          parameter: parameter.key,
          points: points.length,
          drops: drops.slice(0, 20),
          status: drops.length > 0 ? "fail" : "pass"
        });
      }
    }
  }

  return {
    id: "pricing-monotonicity",
    hypothesis: "Aumentar uma dimensao pode reduzir preco de venda de modo perceptivel.",
    status: checks.some((check) => check.status === "fail") ? "fail" : "pass",
    tested: checks
  };
}

function testUnexposedSlicerSurfaces(formats) {
  const exposed = new Set(
    formats.flatMap((item) =>
      item.variants.map((variantSlug) => surfaceKey(item.categorySlug, item.formatSlug, variantSlug))
    )
  );
  const slicerSurfaces = Object.keys(countSurfaces(slicerPricingSamples));
  const unexposed = slicerSurfaces.filter((surfaceId) => !exposed.has(surfaceId));
  const unexpectedUnexposed = unexposed.filter(
    (surfaceId) => !intentionallyUnexposedSurfaceIds.has(surfaceId)
  );

  return {
    id: "unexposed-slicer-surfaces",
    hypothesis: "O slicer pode conter modelos que nao estao expostos no site atual.",
    status: unexpectedUnexposed.length > 0 ? "warn" : "pass",
    tested: {
      exposedSurfaces: [...exposed].sort(),
      slicerSurfaces: slicerSurfaces.sort(),
      unexposed,
      intentionallyUnexposed: unexposed.filter((surfaceId) =>
        intentionallyUnexposedSurfaceIds.has(surfaceId)
      ),
      unexpectedUnexposed
    }
  };
}

function samplesForSurface(categorySlug, formatSlug, variantSlug) {
  return slicerPricingSamples.filter((sample) => {
    return (
      sample.categorySlug === categorySlug &&
      sample.formatSlug === formatSlug &&
      sample.variantSlug === variantSlug
    );
  });
}

function activeKeysForFormat(format, values) {
  return format.parameters
    .filter((parameter) => parameter.type !== "boolean" && (!parameter.dependsOn || values[parameter.dependsOn]))
    .map((parameter) => parameter.key);
}

function boundaryCases(format, variantSlug) {
  const defaults = valuesForVariant(format, variantSlug);
  const parameters = format.parameters.filter((parameter) => {
    return parameter.type !== "boolean" && (!parameter.dependsOn || defaults[parameter.dependsOn]);
  });
  const cases = [defaults];
  const allMin = { ...defaults };
  const allMax = { ...defaults };

  for (const parameter of parameters) {
    allMin[parameter.key] = parameter.min;
    allMax[parameter.key] = parameter.max;
    cases.push({ ...defaults, [parameter.key]: parameter.min });
    cases.push({ ...defaults, [parameter.key]: parameter.max });
  }

  cases.push(allMin, allMax);
  return cases;
}

function diagnoseDrops(points) {
  const drops = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const delta = roundMoney(current.unitPriceBrl - previous.unitPriceBrl);

    if (delta < -monotonicToleranceBrl) {
      drops.push({
        fromValue: previous.value,
        toValue: current.value,
        fromPriceBrl: previous.unitPriceBrl,
        toPriceBrl: current.unitPriceBrl,
        delta
      });
    }
  }

  return drops;
}

function saleMultiplierForFormat(format) {
  return format.skuPrefix?.includes("PI") ? 1.7 : 4;
}

function roundSalePrice(value) {
  return roundMoney(Math.ceil(Number(value || 0) / 0.25) * 0.25);
}

function representativeValues(parameter, defaultValue) {
  const min = Number(parameter.min);
  const max = Number(parameter.max);
  const values = new Set([
    min,
    max,
    Number(defaultValue),
    min + (max - min) * 0.25,
    min + (max - min) * 0.5,
    min + (max - min) * 0.75
  ]);

  return [...values]
    .filter((value) => Number.isFinite(value) && value >= min && value <= max)
    .map((value) => roundMetric(value, Number(parameter.step || 1) < 1 ? 1 : 0))
    .sort((left, right) => left - right);
}

function countSurfaces(samples) {
  return samples.reduce((counts, sample) => {
    const key = surfaceKey(sample.categorySlug, sample.formatSlug, sample.variantSlug);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function objectDiff(left, right) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys]
    .sort()
    .filter((key) => left[key] !== right[key])
    .map((key) => ({ surfaceId: key, csvCount: left[key] || 0, generatedCount: right[key] || 0 }));
}

function surfaceKey(categorySlug, formatSlug, variantSlug) {
  return `${categorySlug}:${formatSlug}:${variantSlug}`;
}

function hasValidSliceMetrics(row) {
  return (
    row.slice_status === "ok" &&
    Number(row.material_grams || 0) > 0 &&
    Number(row.print_minutes || 0) > 0
  );
}

async function readDataset(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const records = parseCsv(text);
  const headers = records[0] || [];
  return records.slice(1).map((record) => {
    return Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]));
  });
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
      continue;
    }

    if (char === '"') {
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
