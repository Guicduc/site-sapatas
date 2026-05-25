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

const config = {
  orcaPath: process.env.ORCA_SLICER_PATH || "",
  modelDir: path.resolve(process.env.ORCA_MODEL_DIR || path.join(repoRoot, "Produtos", "STL")),
  outputDir: path.resolve(process.env.ORCA_SLICER_OUTPUT_DIR || path.join(repoRoot, "Produtos", "slicer-output")),
  datasetPath: path.resolve(
    process.env.ORCA_DATASET_PATH ||
      path.join(repoRoot, "Produtos", "datasets", "orca_tpu_p2s_220c_dataset.csv")
  ),
  loadSettings: process.env.ORCA_SLICER_LOAD_SETTINGS || "",
  loadFilaments: process.env.ORCA_SLICER_LOAD_FILAMENTS || "",
  extraArgs: splitArgs(process.env.ORCA_SLICER_EXTRA_ARGS || ""),
  profileId: process.env.ORCA_SLICER_PROFILE_ID || "bambu-p2s-0.4-tpu-220c",
  printerId: process.env.ORCA_PRINTER_ID || "bambu-p2s",
  materialId: process.env.ORCA_MATERIAL_ID || "tpu",
  nozzleTempC: Number(process.env.ORCA_NOZZLE_TEMP_C || 220),
  bedTempC: Number(process.env.ORCA_BED_TEMP_C || 35),
  concurrency: Math.max(1, Number(process.env.ORCA_SLICER_CONCURRENCY || 4)),
  timeoutMs: Number(process.env.ORCA_SLICER_TIMEOUT_MS || 180000)
};

async function main() {
  await assertFile(config.orcaPath, "Configure ORCA_SLICER_PATH com o executavel do Orca Slicer.");
  await fs.mkdir(config.outputDir, { recursive: true });
  await fs.mkdir(path.dirname(config.datasetPath), { recursive: true });

  const modelFiles = await listModelFiles(config.modelDir);

  if (modelFiles.length === 0) {
    throw new Error(`Nenhum modelo .stl ou .3mf encontrado em ${config.modelDir}.`);
  }

  const rows = await mapConcurrent(modelFiles, config.concurrency, sliceModel);

  await fs.writeFile(config.datasetPath, toCsv(rows));
  console.log(`Dataset gerado: ${config.datasetPath}`);
  console.log(`Modelos fatiados: ${rows.length}`);
}

async function sliceModel(modelPath, index, total) {
  const sampleId = sanitizeSampleId(path.basename(modelPath, path.extname(modelPath)));
  const sampleOutputDir = path.join(config.outputDir, sampleId);
  await fs.mkdir(sampleOutputDir, { recursive: true });

  const args = buildOrcaArgs({ modelPath, outputDir: sampleOutputDir });
  const startedAt = new Date().toISOString();
  console.log(`[${index + 1}/${total}] Fatiando ${path.basename(modelPath)}`);
  const { stdout = "", stderr = "" } = await execFileAsync(config.orcaPath, args, {
    windowsHide: true,
    timeout: config.timeoutMs,
    maxBuffer: 1024 * 1024 * 16
  });
  const gcodePath = await findNewestGcode(sampleOutputDir);
  const gcodeText = gcodePath ? await fs.readFile(gcodePath, "utf8") : "";
  const parsed = parseOrcaMetrics(`${stdout}\n${stderr}\n${gcodeText}`);

  return {
    sample_id: sampleId,
    model_file: relativePath(modelPath),
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
    parser: parsed.parser
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

async function listModelFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listModelFiles(entryPath)));
    } else if (/\.(3mf|stl)$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function findNewestGcode(outputDir) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.gcode$/i.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(outputDir, entry.name);
        const stat = await fs.stat(filePath);
        return { filePath, mtimeMs: stat.mtimeMs };
      })
  );

  return files.sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath || "";
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
    return colon[3] ? first * 60 + second + Math.round(third / 60) : first * 60 + second;
  }

  const hours = firstNumber(text, [/([\d.,]+)\s*h/i, /([\d.,]+)\s*hour/i]);
  const minutes = firstNumber(text, [/([\d.,]+)\s*m(?!m)/i, /([\d.,]+)\s*min/i]);
  const seconds = firstNumber(text, [/([\d.,]+)\s*s/i, /([\d.,]+)\s*sec/i]);
  return Math.round(hours * 60 + minutes + seconds / 60);
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

function toCsv(rows) {
  const headers = Object.keys(rows[0] || {});
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

function splitArgs(value) {
  return String(value || "")
    .match(/(?:"[^"]+"|'[^']+'|\S+)/g)
    ?.map((item) => item.replace(/^["']|["']$/g, "")) || [];
}

function splitPathList(value) {
  return String(value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
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
