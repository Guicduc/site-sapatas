import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { buildSlicedPricingResult } from "@/lib/pricing-engine";

const execFileAsync = promisify(execFile);

export function getOrcaSlicerConfig() {
  const outputDir =
    process.env.ORCA_SLICER_OUTPUT_DIR ||
    path.join(/*turbopackIgnore: true*/ process.cwd(), ".local-data", "orca");
  const stlDir =
    process.env.ORCA_STL_DIR ||
    path.join(/*turbopackIgnore: true*/ process.cwd(), "exports", "stl");
  const profilesDir = process.env.ORCA_SLICER_PROFILES_DIR || "";
  const profileId = process.env.ORCA_SLICER_PROFILE_ID || "default";

  return {
    executablePath: process.env.ORCA_SLICER_PATH || "",
    stlDir: path.resolve(/*turbopackIgnore: true*/ stlDir),
    outputDir: path.resolve(/*turbopackIgnore: true*/ outputDir),
    profilesDir: profilesDir ? path.resolve(/*turbopackIgnore: true*/ profilesDir) : "",
    profileId,
    loadSettings: process.env.ORCA_SLICER_LOAD_SETTINGS || "",
    loadFilaments: process.env.ORCA_SLICER_LOAD_FILAMENTS || "",
    extraArgs: splitArgs(process.env.ORCA_SLICER_EXTRA_ARGS || ""),
    timeoutMs: Number(process.env.ORCA_SLICER_TIMEOUT_MS || 120000)
  };
}

export async function priceOrderWithOrca(order) {
  const cad = order?.metadata?.cad || {};
  const cadFileName = String(cad.fileName || "").trim();

  if (!cadFileName) {
    throw userError("orca_missing_stl", "Registre o STL do pedido antes de calcular com Orca.");
  }

  const quantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;
  const config = getOrcaSlicerConfig();
  const sliceResult = await sliceStlWithOrca({ cadFileName, orderNumber: order.orderNumber, config });

  return buildSlicedPricingResult({
    materialGrams: sliceResult.materialGrams,
    printMinutes: sliceResult.printMinutes,
    quantity,
    orcaVersion: sliceResult.orcaVersion,
    profileId: config.profileId,
    gcodeFileName: sliceResult.gcodeFileName,
    raw: {
      stlFileName: cadFileName,
      commandArgs: sliceResult.commandArgs,
      parser: sliceResult.parser,
      stdout: sliceResult.stdout.slice(-4000),
      stderr: sliceResult.stderr.slice(-4000)
    }
  });
}

export async function sliceStlWithOrca({ cadFileName, orderNumber, config = getOrcaSlicerConfig() }) {
  if (!config.executablePath) {
    throw userError(
      "orca_not_configured",
      "Configure ORCA_SLICER_PATH para habilitar a precificacao com Orca."
    );
  }

  const stlPath = resolveInside(config.stlDir, cadFileName);
  await assertFileExists(stlPath, "orca_stl_not_found", `STL nao encontrado em ${stlPath}.`);
  await assertFileExists(config.executablePath, "orca_executable_not_found", "Orca Slicer nao encontrado.");
  await fs.mkdir(config.outputDir, { recursive: true });

  const outputDir = path.join(config.outputDir, sanitizeFilePart(orderNumber || "order"));
  await fs.mkdir(outputDir, { recursive: true });

  const args = buildOrcaArgs({ stlPath, outputDir, config });
  const { stdout = "", stderr = "" } = await execFileAsync(config.executablePath, args, {
    windowsHide: true,
    timeout: config.timeoutMs,
    maxBuffer: 1024 * 1024 * 12
  });

  const gcodePath = await findNewestGcode(outputDir);
  const gcodeText = gcodePath ? await fs.readFile(gcodePath, "utf8") : "";
  const parsed = parseOrcaOutput(`${stdout}\n${stderr}\n${gcodeText}`);

  if (!parsed.materialGrams || !parsed.printMinutes) {
    throw userError(
      "orca_parse_failed",
      "Orca executou, mas nao foi possivel ler tempo e material do G-code gerado."
    );
  }

  return {
    ...parsed,
    gcodeFileName: gcodePath ? path.basename(gcodePath) : "",
    commandArgs: args,
    stdout,
    stderr
  };
}

export function parseOrcaOutput(text) {
  const source = String(text || "");
  const materialGrams = firstNumber(source, [
    /total\s+filament\s+used\s*\[g\]\s*=\s*([\d.,]+)/i,
    /filament\s+used\s*\[g\]\s*=\s*([\d.,]+)/i,
    /filament\s+weight\s*=\s*([\d.,]+)\s*g/i,
    /used\s+filament\s*:\s*[\d.,]+\s*m\s*,\s*([\d.,]+)\s*g/i,
    /total\s+filament\s+weight\s*:\s*([\d.,]+)\s*g/i
  ]);
  const printMinutes = firstPrintMinutes(source);
  const orcaVersion =
    firstText(source, [
      /OrcaSlicer\s+Version\s+([^\s;]+)/i,
      /OrcaSlicer\s+([0-9][^\s;]+)/i,
      /generated\s+by\s+OrcaSlicer\s+([^\s;]+)/i
    ]) || "";

  return {
    materialGrams,
    printMinutes,
    orcaVersion,
    parser: "orca-gcode-comments-v1"
  };
}

function buildOrcaArgs({ stlPath, outputDir, config }) {
  const args = [];

  if (config.loadFilaments) {
    args.push("--load-filaments", config.loadFilaments);
  }

  if (config.loadSettings) {
    args.push("--load-settings", config.loadSettings);
  } else if (config.profilesDir) {
    const profilePath = path.join(config.profilesDir, `${config.profileId}.json`);
    args.push("--load-settings", profilePath);
  }

  args.push(...config.extraArgs);
  args.push("--export-gcode", "--outputdir", outputDir, stlPath);
  return args;
}

async function assertFileExists(filePath, code, message) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error(message);
    }
  } catch {
    throw userError(code, message);
  }
}

async function findNewestGcode(outputDir) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.gcode$/i.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(outputDir, entry.name);
        const stat = await fs.stat(filePath);
        return { filePath, mtimeMs: stat.mtimeMs };
      })
  );

  return files.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.filePath || "";
}

function resolveInside(root, fileName) {
  const rootPath = path.resolve(root);
  const targetPath = path.resolve(rootPath, fileName);

  if (targetPath !== rootPath && !targetPath.startsWith(`${rootPath}${path.sep}`)) {
    throw userError("orca_invalid_stl_path", "Nome de STL fora do diretorio configurado.");
  }

  return targetPath;
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

function firstPrintMinutes(text) {
  const patterns = [
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

function splitArgs(value) {
  return String(value || "")
    .match(/(?:"[^"]+"|'[^']+'|\S+)/g)
    ?.map((item) => item.replace(/^["']|["']$/g, "")) || [];
}

function sanitizeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function userError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
