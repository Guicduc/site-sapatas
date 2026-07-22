import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { slicerPricingSamples } from "../../lib/slicer-pricing-data.js";
import {
  fitMonotonePricingModel,
  predictMonotoneProductionCost
} from "../../lib/monotone-pricing-model.js";
import { calculateUnitProductionCost } from "../../lib/pricing-cost.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const catalogDir = path.join(repoRoot, "catalog", "products");
const neighborCount = 8;
const highErrorThreshold = 0.25;
const maxMedianRelativeError = Number(process.env.PRICING_COVERAGE_MAX_MEDIAN_ERROR || 0.08);
const maxHighErrorRate = Number(process.env.PRICING_COVERAGE_MAX_HIGH_ERROR_RATE || 0.1);
const checkMode = process.argv.includes("--check");
const includeDrafts = process.argv.includes("--include-drafts");
const outputPath = path.join(
  repoRoot,
  "Produtos",
  "logs",
  includeDrafts ? "pricing-coverage-audit-drafts.json" : "pricing-coverage-audit.json"
);

async function main() {
  const products = await readProducts();
  const surfaces = publicSurfaces(products);
  const reports = surfaces.map((surface) => auditSurface(surface));
  const modelReports = surfaces.map((surface) => auditRuntimeModel(surface));
  const failingSurfaces = reports.filter((report) => {
    return report.insufficientSamples || report.medianRelativeError > maxMedianRelativeError || report.highErrorRate > maxHighErrorRate;
  });
  const failingModels = modelReports.filter((report) => {
    return report.insufficientSamples || report.medianRelativeError > maxMedianRelativeError || report.highErrorRate > maxHighErrorRate;
  });
  const summary = {
    surfaces: reports.length,
    samples: reports.reduce((total, report) => total + report.sampleCount, 0),
    medianRelativeError: weightedMedian(
      reports.flatMap((report) => report.sampleErrors.map((sample) => sample.relativeError))
    ),
    highErrorSamples: reports.reduce((total, report) => total + report.highErrorSamples, 0),
    highErrorRate: ratio(
      reports.reduce((total, report) => total + report.highErrorSamples, 0),
      reports.reduce((total, report) => total + report.sampleCount, 0)
    )
  };
  const result = {
    generatedAt: new Date().toISOString(),
    method: {
      name: "leave-one-out-idw",
      neighbors: neighborCount,
      distance: "euclidean-normalized-by-surface-range",
      weight: "1/(distance+0.0001)^2",
      comparedMetric: "direct-cost-from-material-and-print-time",
      highErrorThreshold,
      acceptance: { maxMedianRelativeError, maxHighErrorRate }
    },
    summary,
    surfaces: reports.map(({ sampleErrors, ...report }) => report),
    runtimeModelCrossValidation: {
      method: "deterministic-5-fold",
      model: "nonnegative-polynomial-degree-3",
      acceptance: { maxMedianRelativeError, maxHighErrorRate },
      surfaces: modelReports.map(({ sampleErrors, ...report }) => report)
    }
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`Auditoria LOO-IDW: ${summary.samples} amostras em ${summary.surfaces} superficies.`);
  for (const report of reports) {
    console.log(
      [
        report.surfaceId,
        `n=${report.sampleCount}`,
        `mediana=${coveragePercent(report, report.medianRelativeError)}`,
        `p90=${coveragePercent(report, report.p90RelativeError)}`,
        `p95=${coveragePercent(report, report.p95RelativeError)}`,
        `>25%=${report.highErrorSamples} (${coveragePercent(report, report.highErrorRate)})`
      ].join(" | ")
    );
  }
  console.log("Validacao cruzada do modelo monotono usado no site:");
  for (const report of modelReports) {
    console.log(
      [
        report.surfaceId,
        `n=${report.sampleCount}`,
        `mediana=${coveragePercent(report, report.medianRelativeError)}`,
        `p95=${coveragePercent(report, report.p95RelativeError)}`,
        `>25%=${report.highErrorSamples} (${coveragePercent(report, report.highErrorRate)})`
      ].join(" | ")
    );
  }
  console.log(`Relatorio: ${outputPath}`);
  if (checkMode && (failingSurfaces.length > 0 || failingModels.length > 0)) {
    console.error(
      `Cobertura insuficiente: ${failingSurfaces.length} superficie(s) IDW e ${failingModels.length} modelo(s) monotonos.`
    );
    process.exitCode = 1;
  }
}

function auditRuntimeModel(surface) {
  const samples = slicerPricingSamples.filter((sample) => {
    return sampleSurfaceId(sample) === surface.surfaceId && isManufacturableSample(surface, sample);
  });
  const wallKey = surface.parameterKeys.find((key) => {
    return key === "paredeTubo" || key === "diametroParafuso";
  }) || "";
  const parameterKeys = surface.parameterKeys.filter((key) => key !== wallKey);
  const sampleErrors = [];

  if (samples.length < 5) {
    return insufficientSurfaceReport(surface, samples.length, parameterKeys, wallKey);
  }

  for (let fold = 0; fold < 5; fold += 1) {
    const trainingSamples = samples.filter((_, index) => index % 5 !== fold);
    const testSamples = samples.filter((_, index) => index % 5 === fold);
    const model = fitMonotonePricingModel(trainingSamples, {
      surfaceId: surface.surfaceId,
      parameterKeys,
      wallKey,
      degree: 3
    });

    for (const sample of testSamples) {
      const actualCost = Number(sample.productionCostBrl);
      const predictedCost = predictMonotoneProductionCost(model, sample.params);
      sampleErrors.push({
        sampleId: sample.sampleId,
        fold,
        actualCostBrl: round(actualCost, 4),
        predictedCostBrl: round(predictedCost, 4),
        relativeError: relativeDifference(predictedCost, actualCost)
      });
    }
  }

  const sortedErrors = sampleErrors.map((sample) => sample.relativeError).sort((a, b) => a - b);
  const highErrorSamples = sampleErrors.filter((sample) => sample.relativeError > highErrorThreshold).length;
  return {
    productId: surface.productId,
    surfaceId: surface.surfaceId,
    parameterKeys,
    wallKey,
    sampleCount: sampleErrors.length,
    medianRelativeError: quantile(sortedErrors, 0.5),
    p90RelativeError: quantile(sortedErrors, 0.9),
    p95RelativeError: quantile(sortedErrors, 0.95),
    maxRelativeError: quantile(sortedErrors, 1),
    highErrorSamples,
    highErrorRate: ratio(highErrorSamples, sampleErrors.length),
    worstSamples: [...sampleErrors]
      .sort((left, right) => right.relativeError - left.relativeError)
      .slice(0, 20),
    sampleErrors
  };
}

async function readProducts() {
  const names = (await fs.readdir(catalogDir)).filter((name) => name.endsWith(".json")).sort();
  const products = [];

  for (const name of names) {
    const product = JSON.parse(await fs.readFile(path.join(catalogDir, name), "utf8"));
    if (product.status === "active" || (includeDrafts && product.status === "draft")) {
      products.push(product);
    }
  }

  return products;
}

function publicSurfaces(products) {
  return products.flatMap((product) => {
    return product.variants
      .filter((variant) => variant.public)
      .map((variant) => ({
        productId: product.productId,
        productStatus: product.status,
        variantId: variant.id,
        surfaceId: variant.pricing.surfaceId,
        parameterKeys: variant.cad.sliderOrder,
        saleMultiplier: Number(variant.pricing.saleMultiplier || 1),
        manufacturing: product.manufacturing || null
      }));
  });
}

function auditSurface(surface) {
  const samples = slicerPricingSamples.filter((sample) => {
    return sampleSurfaceId(sample) === surface.surfaceId && isManufacturableSample(surface, sample);
  });
  if (samples.length < neighborCount + 1) {
    return insufficientSurfaceReport(surface, samples.length, surface.parameterKeys, "");
  }

  const ranges = parameterRanges(samples, surface.parameterKeys);
  const sampleErrors = samples.map((sample, sampleIndex) => {
    const nearest = nearestNeighbors(samples, sampleIndex, sample.params, surface.parameterKeys, ranges);
    const predicted = weightedMetrics(nearest);
    const actualCost = directCost(sample);
    const predictedCost = directCost(predicted);
    const relativeError = relativeDifference(predictedCost, actualCost);

    return {
      sampleId: sample.sampleId,
      relativeError,
      actualCostBrl: round(actualCost, 4),
      predictedCostBrl: round(predictedCost, 4),
      actualMaterialGrams: sample.materialGrams,
      predictedMaterialGrams: round(predicted.materialGrams, 2),
      actualPrintMinutes: sample.printMinutes,
      predictedPrintMinutes: round(predicted.printMinutes, 2),
      nearestDistance: round(nearest[0]?.distance || 0, 5),
      nearestSampleIds: nearest.map((item) => item.sample.sampleId)
    };
  });
  const sortedErrors = sampleErrors.map((sample) => sample.relativeError).sort((a, b) => a - b);
  const highErrorSamples = sampleErrors.filter((sample) => sample.relativeError > highErrorThreshold).length;
  const nearestDistances = sampleErrors.map((sample) => sample.nearestDistance).sort((a, b) => a - b);

  return {
    productId: surface.productId,
    surfaceId: surface.surfaceId,
    parameterKeys: surface.parameterKeys,
    sampleCount: samples.length,
    medianRelativeError: quantile(sortedErrors, 0.5),
    p90RelativeError: quantile(sortedErrors, 0.9),
    p95RelativeError: quantile(sortedErrors, 0.95),
    maxRelativeError: quantile(sortedErrors, 1),
    highErrorSamples,
    highErrorRate: ratio(highErrorSamples, samples.length),
    medianNearestDistance: quantile(nearestDistances, 0.5),
    p95NearestDistance: quantile(nearestDistances, 0.95),
    parameterCoverage: Object.fromEntries(
      surface.parameterKeys.map((key) => [
        key,
        {
          min: ranges[key].min,
          max: ranges[key].max,
          uniqueValues: new Set(samples.map((sample) => Number(sample.params?.[key]))).size
        }
      ])
    ),
    worstSamples: [...sampleErrors]
      .sort((left, right) => right.relativeError - left.relativeError)
      .slice(0, 20),
    sampleErrors
  };
}

function insufficientSurfaceReport(surface, sampleCount, parameterKeys, wallKey) {
  return {
    productId: surface.productId,
    productStatus: surface.productStatus,
    surfaceId: surface.surfaceId,
    parameterKeys,
    wallKey,
    sampleCount,
    insufficientSamples: true,
    requiredSamples: neighborCount + 1,
    medianRelativeError: null,
    p90RelativeError: null,
    p95RelativeError: null,
    maxRelativeError: null,
    highErrorSamples: 0,
    highErrorRate: null,
    worstSamples: [],
    sampleErrors: []
  };
}

function isManufacturableSample(surface, sample) {
  const constraint = surface.manufacturing?.tubeInnerSpan;
  if (constraint) {
    const wall = Number(sample.params?.[constraint.wallThicknessKey]);
    const innerSpan = Math.min(
      ...constraint.sizeKeys.map((key) => {
        return Number(sample.params?.[key]) + Number(constraint.sizeOffsetsMm?.[key] || 0) - wall * 2;
      })
    );
    if (!Number.isFinite(innerSpan) || innerSpan + 0.0001 < Number(constraint.minimumMm)) return false;
  }

  const screw = surface.manufacturing?.screwClearance;
  if (screw && surface.variantId === "com-parafuso") {
    const diameter = Number(sample.params?.[screw.screwDiameterKey]);
    const minimumSize = diameter + Number(screw.minimumWallMm) * 2;
    const sizes = screw.sizeKeys.map((key) => Number(sample.params?.[key]));
    const height = Number(sample.params?.[screw.baseHeightKey]);
    return Number.isFinite(diameter) &&
      sizes.every((size) => Number.isFinite(size) && size + 0.0001 >= minimumSize) &&
      Number.isFinite(height) && height + 0.0001 >= Number(screw.minimumBaseHeightMm);
  }

  return true;
}

function nearestNeighbors(samples, excludedIndex, requestedParams, parameterKeys, ranges) {
  const nearest = [];

  for (let index = 0; index < samples.length; index += 1) {
    if (index === excludedIndex) {
      continue;
    }

    const sample = samples[index];
    const distance = normalizedDistance(sample.params, requestedParams, parameterKeys, ranges);
    let insertAt = nearest.length;

    while (insertAt > 0 && nearest[insertAt - 1].distance > distance) {
      insertAt -= 1;
    }

    if (insertAt < neighborCount) {
      nearest.splice(insertAt, 0, { sample, distance });
      if (nearest.length > neighborCount) {
        nearest.pop();
      }
    }
  }

  return nearest;
}

function weightedMetrics(neighbors) {
  const weighted = neighbors.reduce(
    (total, item) => {
      const weight = 1 / Math.pow(item.distance + 0.0001, 2);
      return {
        materialGrams: total.materialGrams + Number(item.sample.materialGrams || 0) * weight,
        printMinutes: total.printMinutes + Number(item.sample.printMinutes || 0) * weight,
        weight: total.weight + weight
      };
    },
    { materialGrams: 0, printMinutes: 0, weight: 0 }
  );

  return {
    materialGrams: weighted.materialGrams / weighted.weight,
    printMinutes: weighted.printMinutes / weighted.weight
  };
}

function parameterRanges(samples, keys) {
  return Object.fromEntries(
    keys.map((key) => {
      const values = samples.map((sample) => Number(sample.params?.[key])).filter(Number.isFinite);
      if (values.length !== samples.length) {
        throw new Error(`Parametro ${key} ausente em parte das amostras.`);
      }
      return [key, { min: Math.min(...values), max: Math.max(...values) }];
    })
  );
}

function normalizedDistance(sampleParams, requestedParams, keys, ranges) {
  return Math.sqrt(
    keys.reduce((total, key) => {
      const scale = Math.max(1, ranges[key].max - ranges[key].min);
      return total + Math.pow((Number(sampleParams[key]) - Number(requestedParams[key])) / scale, 2);
    }, 0)
  );
}

function directCost(metrics) {
  return calculateUnitProductionCost(metrics).productionCostBrl;
}

function sampleSurfaceId(sample) {
  return `${sample.categorySlug}:${sample.formatSlug}:${sample.variantSlug}`;
}

function relativeDifference(predicted, actual) {
  return actual > 0 ? Math.abs(predicted - actual) / actual : predicted === actual ? 0 : 1;
}

function quantile(sortedValues, q) {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const value = lower === upper
    ? sortedValues[lower]
    : sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
  return round(value, 5);
}

function weightedMedian(values) {
  return quantile([...values].sort((a, b) => a - b), 0.5);
}

function ratio(value, total) {
  return total > 0 ? round(value / total, 5) : 0;
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function coveragePercent(report, value) {
  return report.insufficientSamples ? "insuficiente" : percent(value);
}

function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value || 0) * factor) / factor;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
