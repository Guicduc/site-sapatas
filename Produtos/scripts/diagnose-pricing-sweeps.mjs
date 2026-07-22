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
const variableCostDimensionKeys = new Set(["paredeTubo", "diametroParafuso"]);

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

          for (const context of sweepContexts(format, variant, parameter)) {
            const points = range(parameter.min, parameter.max, parameter.step).map((value) => {
              const values = { ...context.values, [parameter.key]: value };
              const configurationIssues = validateConfiguration(format, values);
              const breakdown = calculatePriceBreakdown(format, values, 1);
              return {
                value,
                unitPriceBrl: breakdown.unitPriceBrl,
                rawUnitPriceBrl: rawUnitPrice(format, breakdown),
                pricingMode: breakdown.pricingMode,
                configurationValid: configurationIssues.length === 0,
                pricingAvailable: breakdown.pricingAvailable,
                issues: configurationIssues
              };
            });
            const validPoints = points.filter((point) => point.configurationValid);
            const unexpectedUnavailable = validPoints.filter((point) => !point.pricingAvailable);
            const direction = variableCostDimensionKeys.has(parameter.key) ? "variable" : "nondecreasing";
            const drops = direction === "nondecreasing" ? findDrops(validPoints) : [];
            const uniquePrices = new Set(validPoints.map((point) => point.unitPriceBrl)).size;
            const plateaus = findPlateaus(validPoints);
            const sensitivityRequired =
              context.id === "default" &&
              validPoints.length > 1 &&
              parameter.key !== "diametroParafuso";
            const sensitive = !sensitivityRequired || uniquePrices > 1;
            const status =
              drops.length === 0 &&
              unexpectedUnavailable.length === 0 &&
              sensitive
              ? "pass"
              : "fail";
            const report = {
              surfaceId,
              parameter: parameter.key,
              contextId: context.id,
              context: Object.fromEntries(
                Object.entries(context.values).filter(([key]) => key !== parameter.key)
              ),
              direction,
              points: points.length,
              validPoints: validPoints.length,
              invalidConfigurationPoints: points.length - validPoints.length,
              uniquePrices,
              sensitive,
              drops: drops.slice(0, 20),
              unexpectedUnavailable: unexpectedUnavailable.slice(0, 20),
              referenceIdwDifferences: validPoints
                .filter((point) => Math.abs(point.unitPriceBrl - point.rawUnitPriceBrl) > monotonicToleranceBrl)
                .slice(0, 20),
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
  const parameterKeys = new Set(format.parameters.map((parameter) => parameter.key));
  return [
    "sem-haste",
    ...(parameterKeys.has("pescoco") ? ["haste"] : []),
    ...(parameterKeys.has("parafuso") ? ["com-parafuso"] : [])
  ];
}

function valuesForVariant(format, variant) {
  return {
    ...getInitialValues(format),
    ...(variant === "haste"
      ? { pescoco: true, parafuso: false }
      : variant === "com-parafuso"
        ? { pescoco: false, parafuso: true }
        : { pescoco: false, parafuso: false })
  };
}

function rawUnitPrice(format, breakdown) {
  if (!breakdown.pricingAvailable) {
    return 0;
  }
  const multiplier = format.skuPrefix?.includes("PI") ? 1.7 : 4;
  return Math.max(0.3, roundMoneyUp(Number(breakdown.orcaDirectUnitCostBrl || 0) * multiplier));
}

function roundMoneyUp(value) {
  return Math.ceil(Number(value || 0) / 0.25) * 0.25;
}

function sweepContexts(format, variant, sweptParameter) {
  const defaults = valuesForVariant(format, variant);
  const activeParameters = format.parameters.filter((parameter) => {
    return parameter.type !== "boolean" && (!parameter.dependsOn || defaults[parameter.dependsOn]);
  });
  const contexts = [{ id: "default", values: defaults }];

  for (const parameter of activeParameters) {
    if (parameter.key === sweptParameter.key) {
      continue;
    }
    contexts.push(
      { id: `${parameter.key}=min`, values: { ...defaults, [parameter.key]: parameter.min } },
      { id: `${parameter.key}=max`, values: { ...defaults, [parameter.key]: parameter.max } }
    );
  }

  const wall = activeParameters.find((parameter) => parameter.key === "paredeTubo");
  if (wall && sweptParameter.key !== wall.key) {
    for (const value of [0.8, 2, 4, 6, 8]) {
      if (value >= wall.min && value <= wall.max) {
        contexts.push({ id: `paredeTubo=${value}`, values: { ...defaults, paredeTubo: value } });
      }
    }
  }

  const unique = new Map();
  for (const context of contexts) {
    const signature = activeParameters.map((parameter) => context.values[parameter.key]).join("|");
    unique.set(signature, unique.has(signature) ? unique.get(signature) : context);
  }
  return [...unique.values()];
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
