import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const datasetPath = path.join(repoRoot, "Produtos", "datasets", "slicer_pricing_dataset.csv");
const catalogDir = path.join(repoRoot, "catalog", "products");
const fixMode = process.argv.includes("--fix");
const checkMode = process.argv.includes("--check");
const metricAndCostFields = [
  "gcode_file",
  "material_grams",
  "print_minutes",
  "filament_mm",
  "orca_version",
  "profile_id",
  "printer_id",
  "material_id",
  "nozzle_temp_c",
  "bed_temp_c",
  "sliced_at",
  "parser",
  "material_with_waste_grams",
  "print_hours",
  "material_cost_brl",
  "energy_kwh",
  "energy_cost_brl",
  "maintenance_cost_brl",
  "printer_wear_cost_brl",
  "machine_cost_brl",
  "production_cost_brl"
];

async function main() {
  const surfaceContracts = await readSurfaceContracts();
  const { headers, rows } = await readDataset();
  const findings = [];
  let updatedRows = 0;

  for (const row of rows) {
    const surfaceId = `${row.category_slug}:${row.format_slug}:${row.variant_slug}`;
    const contract = surfaceContracts.get(surfaceId);
    const exportIssue = exportedGeometryIssue(row);
    if (!contract && !exportIssue) {
      continue;
    }

    const configurationIssue = contract ? tubeConfigurationIssue(contract, row) : "";
    const geometryIssue = exportIssue || (contract ? generatedGeometryIssue(contract, row) : "");
    const issue = configurationIssue || geometryIssue;

    if (!issue) {
      if (["invalid_configuration", "invalid_geometry"].includes(row.slice_status)) {
        findings.push({ sampleId: row.sample_id, surfaceId, issue: "stale_invalid_status" });
      }
      continue;
    }

    const expectedStatus = configurationIssue ? "invalid_configuration" : "invalid_geometry";
    if (row.slice_status === expectedStatus && row.slice_error === issue) {
      continue;
    }

    findings.push({ sampleId: row.sample_id, surfaceId, issue, previousStatus: row.slice_status });
    if (fixMode) {
      row.slice_status = expectedStatus;
      row.slice_error = issue;
      for (const field of metricAndCostFields) {
        if (headers.includes(field)) {
          row[field] = "";
        }
      }
      updatedRows += 1;
    }
  }

  if (fixMode && updatedRows > 0) {
    await fs.writeFile(datasetPath, toCsv(rows, headers), "utf8");
  }

  const unresolved = fixMode
    ? findings.filter((finding) => finding.issue === "stale_invalid_status")
    : findings;
  console.log(
    `Modelos de precificacao: ${rows.length} linhas, ${findings.length} inconsistencia(s), ${updatedRows} corrigida(s).`
  );
  if (findings.length > 0) {
    const bySurface = findings.reduce((groups, finding) => {
      groups[finding.surfaceId] ||= [];
      groups[finding.surfaceId].push(finding);
      return groups;
    }, {});
    for (const [surfaceId, items] of Object.entries(bySurface)) {
      console.log(`${surfaceId}: ${items.length}`);
    }
  }

  if ((checkMode || fixMode) && unresolved.length > 0) {
    console.error(`Restaram ${unresolved.length} inconsistencias de modelo.`);
    process.exitCode = 1;
  }
}

function exportedGeometryIssue(row) {
  const volume = Number(row.volume_model_units3);
  const height = Number(row.bbox_z);
  const hasGeometryMetrics = row.object_type && row.volume_model_units3 !== "" && row.bbox_z !== "";

  if (
    row.category_slug === "sapata-pino" &&
    (row.slice_status === "error" ||
      (row.slice_status === "invalid_geometry" && row.slice_error === "orca_slice_failed_for_geometry")) &&
    Number(row.material_grams || 0) <= 0 &&
    Number(row.print_minutes || 0) <= 0
  ) {
    return "orca_slice_failed_for_geometry";
  }

  if (
    row.category_slug === "sapata-base-lisa" &&
    row.variant_slug === "com-parafuso" &&
    (row.slice_status === "error" || row.slice_status === "invalid_geometry") &&
    Number(row.material_grams || 0) <= 0 &&
    Number(row.print_minutes || 0) <= 0
  ) {
    return "orca_slice_failed_for_geometry";
  }

  if (hasGeometryMetrics && (volume <= 0.0001 || height <= 0.0001)) {
    return "empty_or_invalid_export_geometry";
  }
  return "";
}

async function readSurfaceContracts() {
  const names = (await fs.readdir(catalogDir)).filter((name) => name.endsWith(".json"));
  const contracts = new Map();

  for (const name of names) {
    const product = JSON.parse(await fs.readFile(path.join(catalogDir, name), "utf8"));
    for (const variant of product.variants || []) {
      contracts.set(variant.pricing.surfaceId, {
        categorySlug: product.category.slug,
        variantId: variant.id,
        requiresNeck: product.category.slug === "ponteira-interna-tubo" || variant.id === "haste",
        tubeInnerSpan: product.manufacturing?.tubeInnerSpan || null
      });
    }
  }

  return contracts;
}

function tubeConfigurationIssue(contract, row) {
  const constraint = contract.tubeInnerSpan;
  if (!constraint) {
    return "";
  }

  const wall = Number(row[constraint.wallThicknessKey]);
  const spans = constraint.sizeKeys.map((key) => {
    return Number(row[key]) + Number(constraint.sizeOffsetsMm?.[key] || 0) - wall * 2;
  });
  const innerSpan = Math.min(...spans);

  if (!Number.isFinite(innerSpan) || innerSpan + 0.0001 >= Number(constraint.minimumMm)) {
    return "";
  }

  return `tube_inner_span_below_${formatNumber(constraint.minimumMm)}mm`;
}

function generatedGeometryIssue(contract, row) {
  if (contract.categorySlug === "sapata-u") {
    const expectedLength = Number(row.comprimento || 0);
    const expectedSpan = Number(row.diametro || 0) + Number(row.espessura || 0) * 2;
    const actualLength = Number(row.bbox_x || 0);
    const actualSpan = Math.max(Number(row.bbox_y || 0), Number(row.bbox_z || 0));

    if (expectedLength > 0 && actualLength + 0.1 < expectedLength) {
      return `incomplete_u_body_length_expected_${formatNumber(expectedLength)}mm_got_${formatNumber(actualLength)}mm`;
    }
    if (expectedSpan > 0 && actualSpan + 0.1 < expectedSpan) {
      return `incomplete_u_body_span_expected_${formatNumber(expectedSpan)}mm_got_${formatNumber(actualSpan)}mm`;
    }
    if (!String(row.export_selection || "").startsWith("export_3mf:")) {
      return "grasshopper_runtime_error_missing_export_3mf";
    }
  }

  if (!contract.requiresNeck || row.slice_status !== "ok") {
    return "";
  }

  const expectedHeight = Number(row.alturaBase || 0) + Number(row.alturaPescoco || 0);
  const actualHeight = Number(row.bbox_z || 0);
  if (expectedHeight > 0 && actualHeight + 0.1 < expectedHeight) {
    return `incomplete_neck_geometry_expected_${formatNumber(expectedHeight)}mm_got_${formatNumber(actualHeight)}mm`;
  }
  return "";
}

async function readDataset() {
  const records = parseCsv(await fs.readFile(datasetPath, "utf8"));
  const headers = records[0] || [];
  const rows = records.slice(1).map((record) => {
    return Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]));
  });
  return { headers, rows };
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
  return records.filter((item) => item.some((value) => String(value).trim() !== ""));
}

function toCsv(rows, headers) {
  return `${[
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
