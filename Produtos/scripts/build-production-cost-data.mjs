import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.TRACO_BASE_REPO
  ? path.resolve(process.env.TRACO_BASE_REPO)
  : path.resolve(scriptDir, "../..");

const datasetPath = path.resolve(
  process.env.ORCA_DATASET_PATH ||
    path.join(repoRoot, "Produtos", "datasets", "slicer_pricing_dataset.csv")
);

const assumptions = {
  tpuFilamentBrlPerKg: 170,
  printWasteRate: 0.05,
  printerPurchasePriceBrl: 7000,
  printerLifetimeHours: 7000,
  annualOperatingHours: 2000,
  annualMaintenanceBrl: 600,
  averagePowerDrawW: 200,
  electricityTariffBrlPerKwh: 0.95
};

const costHeaders = [
  "material_with_waste_grams",
  "print_hours",
  "material_cost_brl",
  "energy_kwh",
  "energy_cost_brl",
  "maintenance_cost_brl",
  "printer_wear_cost_brl",
  "machine_cost_brl",
  "production_cost_brl",
  "cost_assumption_tpu_brl_kg",
  "cost_assumption_energy_brl_kwh",
  "cost_assumption_power_w"
];

async function main() {
  const { headers, rows } = await readDataset(datasetPath);

  if (rows.length === 0) {
    throw new Error(`Dataset sem linhas: ${datasetPath}`);
  }

  const pricedRows = rows.map((row) => {
    if (!hasValidSliceMetrics(row)) {
      return {
        ...row,
        material_with_waste_grams: "",
        print_hours: "",
        material_cost_brl: "",
        energy_kwh: "",
        energy_cost_brl: "",
        maintenance_cost_brl: "",
        printer_wear_cost_brl: "",
        machine_cost_brl: "",
        production_cost_brl: "",
        cost_assumption_tpu_brl_kg: formatNumber(assumptions.tpuFilamentBrlPerKg, 2),
        cost_assumption_energy_brl_kwh: formatNumber(assumptions.electricityTariffBrlPerKwh, 2),
        cost_assumption_power_w: formatNumber(assumptions.averagePowerDrawW, 0)
      };
    }

    const cost = calculateProductionCost({
      materialGrams: Number(row.material_grams || 0),
      printMinutes: Number(row.print_minutes || 0)
    });

    return {
      ...row,
      material_with_waste_grams: formatNumber(cost.materialWithWasteGrams, 2),
      print_hours: formatNumber(cost.printHours, 4),
      material_cost_brl: formatMoney(cost.materialCostBrl),
      energy_kwh: formatNumber(cost.energyKwh, 4),
      energy_cost_brl: formatMoney(cost.energyCostBrl),
      maintenance_cost_brl: formatMoney(cost.maintenanceCostBrl),
      printer_wear_cost_brl: formatMoney(cost.printerWearCostBrl),
      machine_cost_brl: formatMoney(cost.machineCostBrl),
      production_cost_brl: formatMoney(cost.productionCostBrl),
      cost_assumption_tpu_brl_kg: formatNumber(assumptions.tpuFilamentBrlPerKg, 2),
      cost_assumption_energy_brl_kwh: formatNumber(assumptions.electricityTariffBrlPerKwh, 2),
      cost_assumption_power_w: formatNumber(assumptions.averagePowerDrawW, 0)
    };
  });

  const outputHeaders = mergeHeaders(headers, costHeaders);
  await fs.writeFile(datasetPath, toCsv(pricedRows, outputHeaders));

  const summary = summarizeCosts(pricedRows);
  const skippedRows = pricedRows.filter((row) => !hasValidSliceMetrics(row));
  console.log(`Dataset atualizado com custos: ${datasetPath}`);
  console.log(`Linhas: ${pricedRows.length}`);
  if (skippedRows.length > 0) {
    console.log(`Linhas sem custo por slice ausente/invalido: ${skippedRows.length}`);
  }
  console.log(
    `Custo de producao/un: min R$ ${summary.min.toFixed(2)} | medio R$ ${summary.average.toFixed(2)} | max R$ ${summary.max.toFixed(2)}`
  );
  console.log(
    `Premissas: TPU R$ ${assumptions.tpuFilamentBrlPerKg}/kg | energia R$ ${assumptions.electricityTariffBrlPerKwh}/kWh | P2S ${assumptions.averagePowerDrawW} W medios`
  );
}

function hasValidSliceMetrics(row) {
  return (
    row.slice_status === "ok" &&
    Number(row.material_grams || 0) > 0 &&
    Number(row.print_minutes || 0) > 0
  );
}

function calculateProductionCost({ materialGrams, printMinutes }) {
  const materialWithWasteGrams = materialGrams * (1 + assumptions.printWasteRate);
  const printHours = printMinutes / 60;
  const energyKwh =
    (assumptions.averagePowerDrawW / 1000) *
    printHours *
    (1 + assumptions.printWasteRate);
  const materialCostBrl = materialWithWasteGrams * (assumptions.tpuFilamentBrlPerKg / 1000);
  const energyCostBrl = energyKwh * assumptions.electricityTariffBrlPerKwh;
  const maintenanceCostBrl =
    (assumptions.annualMaintenanceBrl / assumptions.annualOperatingHours) * printHours;
  const printerWearCostBrl =
    (assumptions.printerPurchasePriceBrl / assumptions.printerLifetimeHours) *
    printHours *
    (1 + assumptions.printWasteRate);
  const machineCostBrl = maintenanceCostBrl + printerWearCostBrl;
  const productionCostBrl = materialCostBrl + energyCostBrl + machineCostBrl;

  return {
    materialWithWasteGrams,
    printHours,
    energyKwh,
    materialCostBrl,
    energyCostBrl,
    maintenanceCostBrl,
    printerWearCostBrl,
    machineCostBrl,
    productionCostBrl
  };
}

async function readDataset(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const records = parseCsv(text);
  const rawHeaders = records[0] || [];
  const headerIndexes = rawHeaders
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => header && header !== "[object Object]");
  const headers = headerIndexes.map(({ header }) => header);
  const rows = records.slice(1).map((record) => {
    return Object.fromEntries(
      headerIndexes.map(({ header, index }) => [header, record[index] ?? ""])
    );
  });

  return { headers, rows };
}

function summarizeCosts(rows) {
  const costs = rows.map((row) => Number(row.production_cost_brl || 0)).filter((value) => value > 0);
  const sum = costs.reduce((total, value) => total + value, 0);

  return {
    min: Math.min(...costs),
    max: Math.max(...costs),
    average: sum / costs.length
  };
}

function mergeHeaders(...headerGroups) {
  const merged = [];

  for (const group of headerGroups) {
    for (const header of Array.isArray(group)
      ? group
      : Object.keys(group || {})) {
      if (!merged.includes(header)) {
        merged.push(header);
      }
    }
  }

  return merged;
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

function toCsv(rows, headers) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","))
  ].join("\n") + "\n";
}

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function formatMoney(value) {
  return formatNumber(value, 2);
}

function formatNumber(value, decimals) {
  return Number(value || 0).toFixed(decimals);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
