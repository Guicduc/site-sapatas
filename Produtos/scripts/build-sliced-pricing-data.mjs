import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.TRACO_BASE_REPO
  ? path.resolve(process.env.TRACO_BASE_REPO)
  : path.resolve(scriptDir, "../..");

const config = {
  grasshopperDatasetPath: path.resolve(
    process.env.GH_DATASET_PATH ||
      path.join(repoRoot, "Produtos", "datasets", "grasshopper_3mf_variations.csv")
  ),
  orcaDatasetPath: path.resolve(
    process.env.ORCA_DATASET_PATH ||
      path.join(repoRoot, "Produtos", "datasets", "orca_tpu_p2s_220c_dataset.csv")
  ),
  outputPath: path.resolve(
    process.env.SLICED_PRICING_DATA_PATH ||
      path.join(repoRoot, "lib", "sliced-pricing-data.js")
  )
};

async function main() {
  const [grasshopperRows, orcaRows] = await Promise.all([
    readCsvFile(config.grasshopperDatasetPath, "Dataset Grasshopper nao encontrado."),
    readCsvFile(config.orcaDatasetPath, "Dataset Orca nao encontrado.")
  ]);
  const grasshopperBySampleId = new Map(grasshopperRows.map((row) => [row.sample_id, row]));
  const references = orcaRows
    .filter((row) => Number(row.material_grams) > 0 && Number(row.print_minutes) > 0)
    .map((orcaRow) => buildReference(orcaRow, grasshopperBySampleId.get(orcaRow.sample_id)))
    .filter(Boolean)
    .sort((left, right) => left.sampleId.localeCompare(right.sampleId));

  if (references.length === 0) {
    throw new Error("Nenhuma referencia valida encontrada nos datasets.");
  }

  const source = [
    "// Pre-sliced Orca references used by the public configurator.",
    "// Generated from Produtos/datasets/grasshopper_3mf_variations.csv and Produtos/datasets/orca_tpu_p2s_220c_dataset.csv.",
    "// Do not edit by hand; run `npm run build:sliced-data` after exporting and slicing models.",
    "",
    `export const slicedPricingReferences = ${JSON.stringify(references, null, 2)};`,
    ""
  ].join("\n");

  await fs.writeFile(config.outputPath, source);
  console.log(`Referencias geradas: ${references.length}`);
  console.log(`Arquivo atualizado: ${config.outputPath}`);
  printFamilySummary(references);
}

function buildReference(orcaRow, ghRow = {}) {
  const sampleId = orcaRow.sample_id;
  const familySlug = familyFromSampleId(sampleId);
  const siteMapping = inferSiteMapping(familySlug, ghRow);

  if (!siteMapping) {
    console.warn(`Familia sem mapeamento para o site: ${sampleId}`);
    return null;
  }

  return {
    familySlug,
    siteCategorySlug: siteMapping.siteCategorySlug,
    siteFormatSlug: siteMapping.siteFormatSlug,
    hasNeck: siteMapping.hasNeck,
    sampleId,
    sourceGh: ghRow.source_gh || "",
    variationIndex: numberOrNull(ghRow.variation_index),
    variationLabel: ghRow.variation_label || "",
    sliderValues: parseSliderValues(ghRow.slider_values || ""),
    modelFile: orcaRow.model_file || ghRow.stl_path || ghRow.export_path || "",
    gcodeFile: orcaRow.gcode_file || "",
    bbox: {
      x: roundMetric(ghRow.bbox_x),
      y: roundMetric(ghRow.bbox_y),
      z: roundMetric(ghRow.bbox_z)
    },
    materialGrams: roundMetric(orcaRow.material_grams),
    printMinutes: roundMetric(orcaRow.print_minutes),
    filamentMm: roundMetric(orcaRow.filament_mm),
    orcaVersion: orcaRow.orca_version || "",
    profileId: orcaRow.profile_id || "",
    printerId: orcaRow.printer_id || "",
    materialId: orcaRow.material_id || "",
    nozzleTempC: numberOrNull(orcaRow.nozzle_temp_c),
    bedTempC: numberOrNull(orcaRow.bed_temp_c),
    slicedAt: orcaRow.sliced_at || "",
    parser: orcaRow.parser || ""
  };
}

function inferSiteMapping(familySlug, ghRow = {}) {
  const normalized = familySlug.toLowerCase();
  const sliderValues = parseSliderValues(ghRow.slider_values || "");

  if (normalized.includes("sapata_interna_tubo-oblongo")) {
    return {
      siteCategorySlug: "ponteira-interna-tubo",
      siteFormatSlug: "oblongo",
      hasNeck: false
    };
  }

  if (normalized.includes("sapata_interna_tubo-quadrado")) {
    return {
      siteCategorySlug: "ponteira-interna-tubo",
      siteFormatSlug: "quadrado",
      hasNeck: false
    };
  }

  if (normalized.includes("sapata_interna_tubo-redondo")) {
    return {
      siteCategorySlug: "ponteira-interna-tubo",
      siteFormatSlug: "redondo",
      hasNeck: false
    };
  }

  if (normalized.includes("sapata_lisa_quadrada")) {
    return {
      siteCategorySlug: "sapata-base-lisa",
      siteFormatSlug: "quadrada",
      hasNeck: hasNeckFromFamilyOrSliders(normalized, sliderValues)
    };
  }

  if (normalized.includes("sapata_lisa_redonda")) {
    return {
      siteCategorySlug: "sapata-base-lisa",
      siteFormatSlug: "redonda",
      hasNeck: hasNeckFromFamilyOrSliders(normalized, sliderValues)
    };
  }

  return null;
}

function hasNeckFromFamilyOrSliders(normalizedFamily, sliderValues) {
  if (normalizedFamily.includes("haste")) {
    return true;
  }

  if (normalizedFamily.includes("parafuso")) {
    return false;
  }

  return Boolean(sliderValues.pescoco);
}

function familyFromSampleId(sampleId) {
  return String(sampleId || "").split("__v")[0] || sampleId;
}

function parseSliderValues(value) {
  const source = String(value || "").trim();

  if (!source || source === "{}") {
    return {};
  }

  const values = {};
  const pattern = /['"]([^'"]+)['"]\s*:\s*([^,}]+)/g;
  let match;

  while ((match = pattern.exec(source))) {
    const rawValue = match[2].trim().replace(/^Decimal\(['"]?/, "").replace(/['"]?\)$/, "");
    const numericValue = Number(rawValue);
    values[normalizeSliderName(match[1])] = Number.isFinite(numericValue) ? numericValue : rawValue;
  }

  return values;
}

function normalizeSliderName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^diametro$/i, "diametro")
    .replace(/^diametrobase$/i, "diametroBase")
    .replace(/^tamanhobasex$/i, "tamanhoBaseX")
    .replace(/^tamanhobasey$/i, "tamanhoBaseY")
    .replace(/^alturabase$/i, "alturaBase")
    .replace(/^alturapescoco$/i, "alturaPescoco")
    .replace(/^diametropescoco$/i, "diametroPescoco")
    .replace(/^paredetubo$/i, "paredeTubo")
    .replace(/^pescoco$/i, "pescoco");
}

async function readCsvFile(filePath, missingMessage) {
  const source = await fs.readFile(filePath, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`${missingMessage} (${filePath})`);
    }

    throw error;
  });

  return parseCsv(source);
}

function parseCsv(source) {
  const rows = [];
  const records = [];
  let current = "";
  let record = [];
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      record.push(current);
      current = "";
      if (record.some((cell) => cell !== "")) {
        records.push(record);
      }
      record = [];
      continue;
    }

    current += char;
  }

  if (current || record.length > 0) {
    record.push(current);
    records.push(record);
  }

  const headers = records.shift() || [];
  for (const recordItem of records) {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = recordItem[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function printFamilySummary(references) {
  const counts = new Map();

  for (const reference of references) {
    const key = [
      reference.familySlug,
      reference.siteCategorySlug,
      reference.siteFormatSlug,
      reference.hasNeck ? "haste" : "sem-haste"
    ].join(" | ");
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const [key, count] of [...counts.entries()].sort()) {
    console.log(`${key}: ${count}`);
  }
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundMetric(value) {
  const number = Number(value || 0);
  return Math.round(number * 100) / 100;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
