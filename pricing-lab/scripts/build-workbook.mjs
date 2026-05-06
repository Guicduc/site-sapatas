import fs from "node:fs/promises";
import path from "node:path";

import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(process.cwd(), "pricing-lab");
const workbookPath = path.join(root, "pricing-lab.xlsx");

const families = await readCsv(path.join(root, "inputs", "families.csv"));
const assumptions = await readCsv(path.join(root, "inputs", "assumptions.csv"));
const grid = await readCsv(path.join(root, "inputs", "sample-grid.csv"));
const results = await readCsv(path.join(root, "results", "orca-results.csv"));

const workbook = Workbook.create();

addSummary(workbook);
addTableSheet(workbook, "Families", families);
addTableSheet(workbook, "Assumptions", assumptions);
addTableSheet(workbook, "Sample Grid", grid);
addTableSheet(workbook, "Orca Results", results);
addPricingSheet(workbook, results.length);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan"
});
console.log(errors.ndjson);

for (const sheetName of ["Summary", "Families", "Assumptions", "Sample Grid", "Orca Results", "Pricing"]) {
  await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(workbookPath);
console.log(workbookPath);

function addSummary(workbook) {
  const sheet = workbook.worksheets.add("Summary");
  sheet.showGridLines = false;
  sheet.getRange("A1:F1").merge();
  sheet.getRange("A1").values = [["Pricing Lab - Grasshopper + Orca"]];
  sheet.getRange("A2:F2").merge();
  sheet.getRange("A2").values = [["Use este workbook para consolidar amostras, resultados de fatiamento e preco tecnico."]];
  sheet.getRange("A4:B9").values = [
    ["Etapa", "Responsavel"],
    ["1. Definir grid de medidas", "Sample Grid"],
    ["2. Exportar STLs no Grasshopper", "stl/{familia}/"],
    ["3. Fatiar no Orca", "gcode/{familia}/"],
    ["4. Preencher tempo/material", "Orca Results"],
    ["5. Revisar custo/preco", "Pricing"]
  ];
  sheet.getRange("A11:F14").values = [
    ["Decisao operacional", "Recomendacao", "", "", "", ""],
    ["Site publico", "Usar tabela pre-fatiada/interpolada, nao fatiamento em tempo real.", "", "", "", ""],
    ["Admin/operacao", "Opcional: usar fatiamento real so para conferencia de pedido.", "", "", "", ""],
    ["Grasshopper", "Ler Sample Grid e exportar um STL por sample_id.", "", "", "", ""]
  ];
  styleTitle(sheet.getRange("A1:F2"));
  styleHeader(sheet.getRange("A4:B4"));
  styleHeader(sheet.getRange("A11:B11"));
  sheet.getRange("A4:B14").format.autofitColumns();
}

function addTableSheet(workbook, name, rows) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  const headers = Object.keys(rows[0] || { blank: "" });
  const values = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))];
  const range = sheet.getRangeByIndexes(0, 0, values.length, headers.length);
  range.values = values;
  styleHeader(sheet.getRangeByIndexes(0, 0, 1, headers.length));
  sheet.freezePanes.freezeRows(1);
  range.format.autofitColumns();
}

function addPricingSheet(workbook, rowCount) {
  const sheet = workbook.worksheets.add("Pricing");
  sheet.showGridLines = false;
  const headers = [
    "family_slug",
    "sample_id",
    "material_grams",
    "print_minutes",
    "material_cost_brl",
    "machine_cost_brl",
    "energy_cost_brl",
    "operator_cost_brl",
    "packaging_brl",
    "direct_cost_brl",
    "channel_fee_brl",
    "suggested_price_brl",
    "notes"
  ];
  sheet.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
  styleHeader(sheet.getRangeByIndexes(0, 0, 1, headers.length));

  for (let row = 2; row <= Math.max(2, rowCount + 1); row += 1) {
    sheet.getRange(`A${row}:D${row}`).formulas = [[
      `='Orca Results'!A${row}`,
      `='Orca Results'!B${row}`,
      `=IF('Orca Results'!F${row}="","",'Orca Results'!F${row})`,
      `=IF('Orca Results'!G${row}="","",'Orca Results'!G${row})`
    ]];
    sheet.getRange(`E${row}:L${row}`).formulas = [[
      `=IF(C${row}="","",C${row}*(1+XLOOKUP("print_waste_rate",Assumptions!A:A,Assumptions!B:B))*XLOOKUP("tpu_filament_brl_per_kg",Assumptions!A:A,Assumptions!B:B)/1000)`,
      `=IF(D${row}="","",D${row}/60*XLOOKUP("machine_cost_brl_per_hour",Assumptions!A:A,Assumptions!B:B))`,
      `=IF(D${row}="","",D${row}/60*XLOOKUP("energy_cost_brl_per_hour",Assumptions!A:A,Assumptions!B:B))`,
      `=IF(D${row}="","",XLOOKUP("operator_minutes_per_order",Assumptions!A:A,Assumptions!B:B)/60*XLOOKUP("operator_cost_brl_per_hour",Assumptions!A:A,Assumptions!B:B))`,
      `=IF(D${row}="","",XLOOKUP("packaging_brl_per_order",Assumptions!A:A,Assumptions!B:B))`,
      `=IF(D${row}="","",SUM(E${row}:I${row}))`,
      `=IF(D${row}="","",J${row}*XLOOKUP("markup",Assumptions!A:A,Assumptions!B:B)*XLOOKUP("channel_fee_rate",Assumptions!A:A,Assumptions!B:B))`,
      `=IF(D${row}="","",MAX(XLOOKUP("min_order_price_brl",Assumptions!A:A,Assumptions!B:B),J${row}*XLOOKUP("markup",Assumptions!A:A,Assumptions!B:B)+K${row}))`
    ]];
  }

  sheet.getRange(`E2:L${Math.max(2, rowCount + 1)}`).format.numberFormat = "R$ #,##0.00";
  sheet.freezePanes.freezeRows(1);
  sheet.getRangeByIndexes(0, 0, Math.max(2, rowCount + 1), headers.length).format.autofitColumns();
}

function styleTitle(range) {
  range.format = {
    fill: "#0F766E",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true
  };
}

function styleHeader(range) {
  range.format = {
    fill: "#1F2937",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true
  };
}

async function readCsv(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const rows = parseCsv(text);
  const headers = rows.shift() || [];
  return rows
    .filter((row) => row.some((value) => value !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
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
