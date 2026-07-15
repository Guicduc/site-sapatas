import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculatePriceBreakdown,
  getInitialValues,
  productCategories,
  validateConfiguration
} from "../../lib/configurator-data.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const outputPath = path.join(repoRoot, "Produtos", "logs", "pricing-sweep-diagnostics.json");
const checkMode = process.argv.includes("--check");
const monotonicToleranceBrl = Number(process.env.PRICING_MONOTONIC_TOLERANCE_BRL || 0.05);
const inverseDimensionKeys = new Set(["paredeTubo"]);

async function main() {
  const sweepSummary = [];
  const failures = [];

  for (const category of productCategories) {
    for (const format of category.formats.filter((item) => item.status === "active")) {
      for (const variant of variantsForFormat(format)) {
        const defaults = valuesForVariant(format, variant);
        const surfaceId = calculatePriceBreakdown(format, defaults, 1).surfaceId;

        for (const parameter of format.parameters) {
          if (parameter.type === "boolean" || (parameter.dependsOn && !defaults[parameter.dependsOn])) {
            continue;
          }

          const points = range(parameter.min, parameter.max, parameter.step).map((value) => {
            const values = { ...defaults, [parameter.key]: value };
            const configurationIssues = validateConfiguration(format, values);
            const breakdown = calculatePriceBreakdown(format, values, 1);
            return {
              value,
              unitPriceBrl: breakdown.unitPriceBrl,
              pricingMode: breakdown.pricingMode,
              configurationValid: configurationIssues.length === 0,
              pricingAvailable: breakdown.pricingAvailable,
              issues: configurationIssues
            };
          });
          const validPoints = points.filter((point) => point.configurationValid);
          const unexpectedUnavailable = validPoints.filter((point) => !point.pricingAvailable);
          const direction = inverseDimensionKeys.has(parameter.key) ? "variable" : "nondecreasing";
          const drops = direction === "nondecreasing" ? findDrops(validPoints) : [];
          const uniquePrices = new Set(validPoints.map((point) => point.unitPriceBrl)).size;
          const plateaus = findPlateaus(validPoints);
          const sensitivityRequired = validPoints.length > 1;
          const sensitive = !sensitivityRequired || uniquePrices > 1;
          const status = drops.length === 0 && unexpectedUnavailable.length === 0 && sensitive
            ? "pass"
            : "fail";
          const report = {
            surfaceId,
            parameter: parameter.key,
            direction,
            points: points.length,
            validPoints: validPoints.length,
            invalidConfigurationPoints: points.length - validPoints.length,
            uniquePrices,
            sensitive,
            drops: drops.slice(0, 20),
            unexpectedUnavailable: unexpectedUnavailable.slice(0, 20),
            plateauSegments: plateaus.length,
            longestPlateau: plateaus.reduce(
              (longest, plateau) => Math.max(longest, plateau.to - plateau.from),
              0
            ),
            minPriceBrl: validPoints.length > 0
              ? Math.min(...validPoints.map((point) => point.unitPriceBrl))
              : null,
            maxPriceBrl: validPoints.length > 0
              ? Math.max(...validPoints.map((point) => point.unitPriceBrl))
              : null,
            status
          };

          sweepSummary.push(report);
          if (status === "fail") {
            failures.push(report);
          }
        }
      }
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    engine: "lib/configurator-data.js#calculatePriceBreakdown",
    monotonicToleranceBrl,
    summary: {
      status: failures.length > 0 ? "fail" : "pass",
      sweeps: sweepSummary.length,
      failed: failures.length
    },
    sweepSummary
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(
    `Pricing check real: ${sweepSummary.length - failures.length}/${sweepSummary.length} sweeps aprovados; ${failures.length} falha(s).`
  );
  console.log(`Relatorio: ${outputPath}`);

  if (checkMode && failures.length > 0) {
    process.exitCode = 1;
  }
}

function variantsForFormat(format) {
  return format.parameters.some((parameter) => parameter.key === "pescoco")
    ? ["sem-haste", "haste"]
    : ["sem-haste"];
}

function valuesForVariant(format, variant) {
  return {
    ...getInitialValues(format),
    ...(variant === "haste" ? { pescoco: true } : { pescoco: false })
  };
}

function findDrops(points) {
  const drops = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const delta = current.unitPriceBrl - previous.unitPriceBrl;
    if (delta < -monotonicToleranceBrl) {
      drops.push({
        fromValue: previous.value,
        toValue: current.value,
        fromPriceBrl: previous.unitPriceBrl,
        toPriceBrl: current.unitPriceBrl,
        deltaBrl: roundMoney(delta)
      });
    }
  }
  return drops;
}

function findPlateaus(points) {
  const plateaus = [];
  let start = null;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const adjacent = Math.abs(current.value - previous.value) > 0;
    if (adjacent && Math.abs(current.unitPriceBrl - previous.unitPriceBrl) < 0.005) {
      start ??= previous.value;
    } else if (start !== null) {
      plateaus.push({ from: start, to: previous.value });
      start = null;
    }
  }
  if (start !== null && points.length > 0) {
    plateaus.push({ from: start, to: points.at(-1).value });
  }
  return plateaus;
}

function range(min, max, step) {
  const values = [];
  const decimals = step < 1 ? 2 : 0;
  for (let value = min; value <= max + 0.000001; value += step) {
    values.push(round(value, decimals));
  }
  return values;
}

function roundMoney(value) {
  return round(value, 2);
}

function round(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value || 0) * factor) / factor;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
