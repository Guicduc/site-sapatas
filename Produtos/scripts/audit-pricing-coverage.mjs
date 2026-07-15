import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { slicerPricingSamples } from "../../lib/slicer-pricing-data.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const catalogDir = path.join(repoRoot, "catalog", "products");
const outputPath = path.join(repoRoot, "Produtos", "logs", "pricing-coverage-audit.json");
const neighborCount = 8;
const highErrorThreshold = 0.25;
const maxMedianRelativeError = Number(process.env.PRICING_COVERAGE_MAX_MEDIAN_ERROR || 0.08);
const maxHighErrorRate = Number(process.env.PRICING_COVERAGE_MAX_HIGH_ERROR_RATE || 0.1);
const checkMode = process.argv.includes("--check");

async function main() {
  const products = await readActiveProducts();
  const surfaces = publicSurfaces(products);
  const reports = surfaces.map((surface) => auditSurface(surface));
  const failingSurfaces = reports.filter((report) => {
    return report.medianRelativeError > maxMedianRelativeError || report.highErrorRate > maxHighErrorRate;
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
    surfaces: reports.map(({ sampleErrors, ...report }) => report)
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`Auditoria LOO-IDW: ${summary.samples} amostras em ${summary.surfaces} superficies.`);
  for (const report of reports) {
    console.log(
      [
        report.surfaceId,
        `n=${report.sampleCount}`,
        `mediana=${percent(report.medianRelativeError)}`,
        `p90=${percent(report.p90RelativeError)}`,
        `p95=${percent(report.p95RelativeError)}`,
        `>25%=${report.highErrorSamples} (${percent(report.highErrorRate)})`
      ].join(" | ")
    );
  }
  console.log(`Relatorio: ${outputPath}`);
  if (checkMode && failingSurfaces.length > 0) {
    console.error(`Cobertura insuficiente em ${failingSurfaces.length} superficie(s).`);
    process.exitCode = 1;
  }
}

async function readActiveProducts() {
  const names = (await fs.readdir(catalogDir)).filter((name) => name.endsWith(".json")).sort();
  const products = [];

  for (const name of names) {
    const product = JSON.parse(await fs.readFile(path.join(catalogDir, name), "utf8"));
    if (product.status === "active") {
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
    throw new Error(`${surface.surfaceId}: amostras insuficientes para LOO-IDW (${samples.length}).`);
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

function isManufacturableSample(surface, sample) {
  const constraint = surface.manufacturing?.tubeInnerSpan;
  if (!constraint) {
    return true;
  }

  const wall = Number(sample.params?.[constraint.wallThicknessKey]);
  const innerSpan = Math.min(
    ...constraint.sizeKeys.map((key) => {
      return Number(sample.params?.[key]) + Number(constraint.sizeOffsetsMm?.[key] || 0) - wall * 2;
    })
  );
  return Number.isFinite(innerSpan) && innerSpan + 0.0001 >= Number(constraint.minimumMm);
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
  const materialWithWaste = Number(metrics.materialGrams || 0) * 1.05;
  const printHours = Number(metrics.printMinutes || 0) / 60;
  const materialCost = materialWithWaste * (170 / 1000);
  const energyCost = 0.2 * printHours * 0.95 * 1.05;
  return materialCost + energyCost;
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

function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value || 0) * factor) / factor;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
