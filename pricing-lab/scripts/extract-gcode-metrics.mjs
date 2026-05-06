import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), "pricing-lab");
const gridPath = path.join(root, "inputs", "sample-grid.csv");
const resultsPath = path.join(root, "results", "orca-results.csv");
const gcodeRoot = path.join(root, "gcode");

const grid = await readCsv(gridPath);
const existingResults = await readCsv(resultsPath).catch(() => []);
const existingByKey = new Map(existingResults.map((row) => [key(row), row]));
const nextResults = [];

for (const sample of grid) {
  const family = sample.family_slug;
  const sampleId = sample.sample_id;
  const current = existingByKey.get(key(sample)) || {};
  const familyGcodeDir = path.join(gcodeRoot, family);
  const gcodeFile = await findGcodeForSample(familyGcodeDir, sample);

  if (!gcodeFile) {
    nextResults.push({
      family_slug: family,
      sample_id: sampleId,
      profile_id: current.profile_id || "tpu-default",
      stl_file: sample.stl_file,
      gcode_file: current.gcode_file || "",
      material_grams: current.material_grams || "",
      print_minutes: current.print_minutes || "",
      orca_version: current.orca_version || "",
      sliced_at: current.sliced_at || "",
      notes: current.notes || "Aguardando G-code"
    });
    continue;
  }

  const gcodeText = await fs.readFile(path.join(familyGcodeDir, gcodeFile), "utf8");
  const parsed = parseGcodeMetrics(gcodeText);

  nextResults.push({
    family_slug: family,
    sample_id: sampleId,
    profile_id: current.profile_id || "tpu-default",
    stl_file: sample.stl_file,
    gcode_file: gcodeFile,
    material_grams: parsed.materialGrams || current.material_grams || "",
    print_minutes: parsed.printMinutes || current.print_minutes || "",
    orca_version: parsed.orcaVersion || current.orca_version || "",
    sliced_at: current.sliced_at || new Date().toISOString(),
    notes: parsed.materialGrams && parsed.printMinutes ? "Extraido do G-code" : "Revisar metadados do G-code"
  });
}

await writeCsv(resultsPath, nextResults);
console.log(`Atualizado: ${resultsPath}`);

function parseGcodeMetrics(text) {
  const materialGrams = firstNumber(text, [
    /total\s+filament\s+used\s*\[g\]\s*=\s*([\d.,]+)/i,
    /filament\s+used\s*\[g\]\s*=\s*([\d.,]+)/i,
    /filament\s+weight\s*=\s*([\d.,]+)\s*g/i,
    /used\s+filament\s*:\s*[\d.,]+\s*m\s*,\s*([\d.,]+)\s*g/i,
    /total\s+filament\s+weight\s*:\s*([\d.,]+)\s*g/i
  ]);
  const printMinutes = firstPrintMinutes(text);
  const orcaVersion = firstText(text, [
    /OrcaSlicer\s+Version\s+([^\s;]+)/i,
    /OrcaSlicer\s+([0-9][^\s;]+)/i,
    /generated\s+by\s+OrcaSlicer\s+([^\s;]+)/i
  ]);

  return {
    materialGrams: materialGrams ? round(materialGrams) : "",
    printMinutes: printMinutes ? Math.round(printMinutes) : "",
    orcaVersion
  };
}

async function findGcodeForSample(directory, sample) {
  try {
    const files = await fs.readdir(directory);
    const stlStem = path.basename(sample.stl_file, path.extname(sample.stl_file));
    const sampleId = sample.sample_id;
    return files.find((file) => file.toLowerCase().endsWith(".gcode") && file.includes(stlStem))
      || files.find((file) => file.toLowerCase().endsWith(".gcode") && file.includes(sampleId))
      || "";
  } catch {
    return "";
  }
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
      return Number(match[1]) / 60;
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
    return colon[3] ? first * 60 + second + third / 60 : first * 60 + second;
  }

  const hours = firstNumber(text, [/([\d.,]+)\s*h/i, /([\d.,]+)\s*hour/i]);
  const minutes = firstNumber(text, [/([\d.,]+)\s*m(?!m)/i, /([\d.,]+)\s*min/i]);
  const seconds = firstNumber(text, [/([\d.,]+)\s*s/i, /([\d.,]+)\s*sec/i]);
  return hours * 60 + minutes + seconds / 60;
}

function firstNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match?.[1]) {
      return Number(String(match[1]).replace(",", "."));
    }
  }

  return 0;
}

function firstText(text, patterns) {
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function key(row) {
  return `${row.family_slug}::${row.sample_id}`;
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

async function readCsv(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const rows = parseCsv(text);
  const headers = rows.shift() || [];
  return rows
    .filter((row) => row.some((value) => value !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

async function writeCsv(filePath, rows) {
  const headers = [
    "family_slug",
    "sample_id",
    "profile_id",
    "stl_file",
    "gcode_file",
    "material_grams",
    "print_minutes",
    "orca_version",
    "sliced_at",
    "notes"
  ];
  const text = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(","))
  ].join("\n");
  await fs.writeFile(filePath, `${text}\n`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function escapeCsv(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}
