import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const repoRoot = process.env.TRACO_BASE_REPO
  ? path.resolve(process.env.TRACO_BASE_REPO)
  : path.resolve(scriptDir, "../..");
const defaultOrcaPath = path.join(
  repoRoot,
  "Produtos",
  "tools",
  "OrcaSlicer_Windows_V2.3.1_portable",
  "orca-slicer.exe"
);
const defaultLoadSettings = [
  path.join(repoRoot, "Produtos", "orca-cli-profiles", "p2s-04-tpu-machine-cli-estimate.json"),
  path.join(repoRoot, "Produtos", "orca-cli-profiles", "p2s-020-process.json")
].join(";");
const defaultLoadFilaments = path.join(
  repoRoot,
  "Produtos",
  "orca-cli-profiles",
  "generic-tpu-220.json"
);

const canonicalHeaders = [
  "source_gh",
  "sample_id",
  "variation_index",
  "product_family",
  "category_slug",
  "format_slug",
  "variant_slug",
  "has_neck",
  "sample_strategy",
  "export_selection",
  "slider_values",
  "model_file",
  "stl_file",
  "diametro",
  "diametroBase",
  "tamanhoBaseX",
  "tamanhoBaseY",
  "alturaBase",
  "alturaPescoco",
  "diametroPescoco",
  "diametroParafuso",
  "paredeTubo",
  "pescoco",
  "comprimento",
  "espessura",
  "object_type",
  "area_model_units2",
  "volume_model_units3",
  "bbox_x",
  "bbox_y",
  "bbox_z",
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
  "slice_status",
  "slice_error"
];

const parameterHeaders = [
  "diametro",
  "diametroBase",
  "tamanhoBaseX",
  "tamanhoBaseY",
  "alturaBase",
  "alturaPescoco",
  "diametroPescoco",
  "diametroParafuso",
  "paredeTubo",
  "pescoco",
  "comprimento",
  "espessura"
];

const args = new Set(process.argv.slice(2));

const config = {
  orcaPath: resolveOptionalPath(process.env.ORCA_SLICER_PATH || defaultOrcaPath),
  outputDir: path.resolve(
    process.env.ORCA_SLICER_OUTPUT_DIR ||
      path.join(repoRoot, "Produtos", "slicer-output-current")
  ),
  datasetPath: path.resolve(
    process.env.ORCA_DATASET_PATH ||
      path.join(repoRoot, "Produtos", "datasets", "slicer_pricing_dataset.csv")
  ),
  loadSettings: process.env.ORCA_SLICER_LOAD_SETTINGS || defaultLoadSettings,
  loadFilaments: process.env.ORCA_SLICER_LOAD_FILAMENTS || defaultLoadFilaments,
  extraArgs: splitArgs(process.env.ORCA_SLICER_EXTRA_ARGS || "--allow-newer-file"),
  profileId: process.env.ORCA_SLICER_PROFILE_ID || "bambu-p2s-0.4-tpu-220c",
  printerId: process.env.ORCA_PRINTER_ID || "bambu-p2s",
  materialId: process.env.ORCA_MATERIAL_ID || "tpu",
  nozzleTempC: Number(process.env.ORCA_NOZZLE_TEMP_C || 220),
  bedTempC: Number(process.env.ORCA_BED_TEMP_C || 35),
  concurrency: Math.max(1, Number(process.env.ORCA_SLICER_CONCURRENCY || 4)),
  timeoutMs: Number(process.env.ORCA_SLICER_TIMEOUT_MS || 180000),
  sliceOnlyMissing: process.env.ORCA_SLICE_ONLY_MISSING === "true"
};

async function main() {
  const { headers, rows } = await readDataset(config.datasetPath);
  const validation = validateDataset(headers, rows);

  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join("\n"));
  }

  for (const warning of validation.warnings) {
    console.warn(`Aviso: ${warning}`);
  }

  if (args.has("--check")) {
    console.log(`Dataset canonico OK: ${config.datasetPath}`);
    console.log(`Linhas: ${rows.length}`);
    return;
  }

  await assertFile(config.orcaPath, "Configure ORCA_SLICER_PATH com o executavel do Orca Slicer.");
  await fs.mkdir(config.outputDir, { recursive: true });

  if (rows.length === 0) {
    console.log(`Dataset sem linhas para fatiar: ${config.datasetPath}`);
    return;
  }

  const slicedRows = await mapConcurrent(rows, config.concurrency, sliceDatasetRow);
  const outputHeaders = mergeHeaders(headers, canonicalHeaders, slicedRows);
  await fs.writeFile(config.datasetPath, toCsv(slicedRows, outputHeaders));

  const okCount = slicedRows.filter((row) => row.slice_status === "ok").length;
  const warningCount = slicedRows.filter((row) => row.slice_status && row.slice_status !== "ok").length;
  console.log(`Dataset atualizado: ${config.datasetPath}`);
  console.log(`Linhas OK: ${okCount}`);
  console.log(`Linhas com alerta: ${warningCount}`);
}

async function readDataset(datasetPath) {
  const text = (await fs.readFile(datasetPath, "utf8").catch(() => "")).replace(/^\uFEFF/, "");

  if (!text.trim()) {
    throw new Error(
      `Dataset canonico nao encontrado ou vazio: ${datasetPath}\n` +
        "Gere primeiro com npm run export:gh."
    );
  }

  const records = parseCsv(text);
  const headers = records[0] || [];
  const rows = records.slice(1).map((record) => {
    return Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]));
  });

  return { headers, rows };
}

function validateDataset(headers, rows) {
  const errors = [];
  const warnings = [];
  const requiredHeaders = [
    "source_gh",
    "sample_id",
    "category_slug",
    "format_slug",
    "variant_slug",
    "model_file",
    "stl_file",
    "material_grams",
    "print_minutes"
  ];

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      errors.push(`Coluna obrigatoria ausente no dataset canonico: ${header}`);
    }
  }

  const seen = new Set();

  rows.forEach((row, index) => {
    const line = index + 2;
    const sampleId = String(row.sample_id || "").trim();

    if (!sampleId) {
      errors.push(`Linha ${line}: sample_id vazio.`);
    } else if (seen.has(sampleId)) {
      errors.push(`Linha ${line}: sample_id duplicado (${sampleId}).`);
    } else {
      seen.add(sampleId);
    }

    if (!row.model_file && !row.stl_file) {
      errors.push(`Linha ${line}: model_file/stl_file vazios.`);
    }

    if (!parameterHeaders.some((header) => String(row[header] ?? "").trim() !== "")) {
      warnings.push(`Linha ${line}: sem parametros de produto preenchidos.`);
    }
  });

  if (rows.length === 0) {
    warnings.push("dataset ainda nao tem linhas; rode o exportador do Grasshopper.");
  }

  return { errors, warnings };
}

async function sliceDatasetRow(row, index, total) {
  if (["invalid_configuration", "invalid_geometry"].includes(row.slice_status)) {
    return row;
  }

  if (
    config.sliceOnlyMissing &&
    row.slice_status === "ok" &&
    Number(row.material_grams || 0) > 0 &&
    Number(row.print_minutes || 0) > 0
  ) {
    return row;
  }

  const sampleId = sanitizeSampleId(row.sample_id || `sample-${index + 1}`);
  const modelPath = resolveModelPath(row);

  if (!modelPath) {
    return markSliceError(row, "missing_model_file", "stl_file/model_file vazio");
  }

  const stat = await fs.stat(modelPath).catch(() => null);

  if (!stat?.isFile()) {
    return markSliceError(row, "missing_model", `Arquivo nao encontrado: ${relativePath(modelPath)}`);
  }

  const sampleOutputDir = path.join(config.outputDir, sampleId);
  await fs.rm(sampleOutputDir, { recursive: true, force: true });
  await fs.mkdir(sampleOutputDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const args = buildOrcaArgs({ modelPath, outputDir: sampleOutputDir });
  console.log(`[${index + 1}/${total}] Fatiando ${path.basename(modelPath)} (${sampleId})`);

  try {
    const { stdout = "", stderr = "" } = await execFileAsync(config.orcaPath, args, {
      windowsHide: true,
      timeout: config.timeoutMs,
      maxBuffer: 1024 * 1024 * 16
    });
    return readSliceResult(row, sampleOutputDir, startedAt, `${stdout}\n${stderr}`);
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`;
    const parsedRow = await readSliceResult(row, sampleOutputDir, startedAt, output);

    if (Number(parsedRow.material_grams || 0) > 0 && Number(parsedRow.print_minutes || 0) > 0) {
      return {
        ...parsedRow,
        slice_status: "ok",
        slice_error: ""
      };
    }

    return {
      ...parsedRow,
      slice_status: "error",
      slice_error: truncate(error.message || "Orca retornou erro.")
    };
  }
}

async function readSliceResult(row, outputDir, startedAt, processOutput) {
  const gcodePath = await findNewestGcode(outputDir);
  const gcodeText = gcodePath ? await fs.readFile(gcodePath, "utf8").catch(() => "") : "";
  const parsed = parseOrcaMetrics(`${processOutput}\n${gcodeText}`);
  const hasMetrics = parsed.materialGrams > 0 && parsed.printMinutes > 0;

  return {
    ...row,
    gcode_file: gcodePath ? relativePath(gcodePath) : "",
    material_grams: parsed.materialGrams,
    print_minutes: parsed.printMinutes,
    filament_mm: parsed.filamentMm,
    orca_version: parsed.orcaVersion,
    profile_id: config.profileId,
    printer_id: config.printerId,
    material_id: config.materialId,
    nozzle_temp_c: config.nozzleTempC,
    bed_temp_c: config.bedTempC,
    sliced_at: startedAt,
    parser: parsed.parser,
    slice_status: hasMetrics ? "ok" : "metrics_missing",
    slice_error: hasMetrics ? "" : "Orca gerou saida sem material_grams ou print_minutes reconhecivel."
  };
}

function markSliceError(row, status, message) {
  return {
    ...row,
    profile_id: config.profileId,
    printer_id: config.printerId,
    material_id: config.materialId,
    nozzle_temp_c: config.nozzleTempC,
    bed_temp_c: config.bedTempC,
    sliced_at: new Date().toISOString(),
    parser: "orca-gcode-comments-v1",
    slice_status: status,
    slice_error: message
  };
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function buildOrcaArgs({ modelPath, outputDir }) {
  const args = [];

  if (config.loadSettings) {
    args.push("--load-settings", splitPathList(config.loadSettings).join(";"));
  }

  if (config.loadFilaments) {
    args.push("--load-filaments", splitPathList(config.loadFilaments).join(";"));
  }

  args.push(...config.extraArgs);
  args.push("--outputdir", outputDir, "--slice", "0", modelPath);
  return args;
}

function resolveModelPath(row) {
  const modelValue = row.stl_file || row.model_file || "";

  if (!modelValue) {
    return "";
  }

  return path.isAbsolute(modelValue) ? modelValue : path.resolve(repoRoot, modelValue);
}

async function findNewestGcode(outputDir) {
  const files = await listGcodeFiles(outputDir);
  return files.sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath || "";
}

async function listGcodeFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listGcodeFiles(entryPath)));
    } else if (/\.gcode$/i.test(entry.name)) {
      const stat = await fs.stat(entryPath);
      files.push({ filePath: entryPath, mtimeMs: stat.mtimeMs });
    }
  }

  return files;
}

function parseOrcaMetrics(text) {
  const source = String(text || "");

  return {
    materialGrams: materialGrams(source),
    filamentMm: firstNumber(source, [
      /filament\s+used\s*\[mm\]\s*=\s*([\d.,]+)/i,
      /filament\s+used\s*=\s*([\d.,]+)\s*mm/i
    ]),
    printMinutes: firstPrintMinutes(source),
    orcaVersion:
      firstText(source, [
        /OrcaSlicer\s+Version\s+([^\s;]+)/i,
        /OrcaSlicer\s+([0-9][^\s;]+)/i,
        /generated\s+by\s+OrcaSlicer\s+([^\s;]+)/i
      ]) || "",
    parser: "orca-gcode-comments-v1"
  };
}

function materialGrams(source) {
  const explicitGrams = firstNumber(source, [
    /total\s+filament\s+used\s*\[g\]\s*=\s*([\d.,]+)/i,
    /filament\s+used\s*\[g\]\s*=\s*([\d.,]+)/i,
    /filament\s+weight\s*=\s*([\d.,]+)\s*g/i,
    /used\s+filament\s*:\s*[\d.,]+\s*m\s*,\s*([\d.,]+)\s*g/i,
    /total\s+filament\s+weight\s*:\s*([\d.,]+)\s*g/i
  ]);

  if (explicitGrams > 0) {
    return explicitGrams;
  }

  const cubicCentimeters = firstNumber(source, [/filament\s+used\s*\[cm3\]\s*=\s*([\d.,]+)/i]);
  const density = firstNumber(source, [/filament_density\s*=\s*([\d.,]+)/i, /filament_density:\s*([\d.,]+)/i]);

  return cubicCentimeters > 0 && density > 0 ? Number((cubicCentimeters * density).toFixed(3)) : 0;
}

function firstPrintMinutes(text) {
  const patterns = [
    /model\s+printing\s+time\s*:\s*([^;\r\n]+)/i,
    /total\s+estimated\s+time\s*:\s*([^;\r\n]+)/i,
    /estimated\s+printing\s+time\s*\([^)]*\)\s*=\s*([^\r\n;]+)/i,
    /estimated\s+printing\s+time\s*:\s*([^\r\n;]+)/i,
    /print\s+time\s*=\s*([^\r\n;]+)/i,
    /;TIME:\s*(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    if (/;TIME:/i.test(match[0])) {
      return Math.round(Number(match[1]) / 60);
    }

    const minutes = parseDurationToMinutes(match[1]);

    if (minutes > 0) {
      return minutes;
    }
  }

  return 0;
}

function parseDurationToMinutes(value) {
  const text = String(value || "").trim();
  const colon = text.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);

  if (colon) {
    const first = Number(colon[1]);
    const second = Number(colon[2]);
    const third = Number(colon[3] || 0);
    return colon[3] ? first * 60 + second + Math.ceil(third / 60) : first * 60 + second;
  }

  const hours = firstNumber(text, [/([\d.,]+)\s*h/i, /([\d.,]+)\s*hour/i]);
  const minutes = firstNumber(text, [/([\d.,]+)\s*m(?!m)/i, /([\d.,]+)\s*min/i]);
  const seconds = firstNumber(text, [/([\d.,]+)\s*s/i, /([\d.,]+)\s*sec/i]);
  const totalMinutes = hours * 60 + minutes + seconds / 60;
  return totalMinutes > 0 ? Math.max(1, Math.ceil(totalMinutes)) : 0;
}

function firstNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return Number(String(match[1]).replace(",", "."));
    }
  }

  return 0;
}

function firstText(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((record) => record.some((cellValue) => String(cellValue || "").trim() !== ""));
}

function toCsv(rows, headers) {
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function mergeHeaders(inputHeaders, baseHeaders, rows) {
  const merged = [...baseHeaders];

  for (const header of inputHeaders) {
    if (header && !merged.includes(header)) {
      merged.push(header);
    }
  }

  for (const row of rows) {
    for (const header of Object.keys(row)) {
      if (header && !merged.includes(header)) {
        merged.push(header);
      }
    }
  }

  return merged;
}

function splitArgs(value) {
  return String(value || "")
    .match(/(?:"[^"]+"|'[^']+'|\S+)/g)
    ?.map((item) => item.replace(/^["']|["']$/g, "")) || [];
}

function splitPathList(value) {
  return String(value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (path.isAbsolute(item) ? item : path.resolve(repoRoot, item)));
}

function resolveOptionalPath(value) {
  return value ? (path.isAbsolute(value) ? value : path.resolve(repoRoot, value)) : "";
}

function sanitizeSampleId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function truncate(value, maxLength = 500) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

async function assertFile(filePath, message) {
  if (!filePath) {
    throw new Error(message);
  }

  const stat = await fs.stat(filePath).catch(() => null);

  if (!stat?.isFile()) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
