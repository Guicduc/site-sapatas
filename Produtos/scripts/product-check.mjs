#!/usr/bin/env node
// Valida o registry canônico de produtos (catalog/).
//
// Uso:
//   npm run product:check                 -> valida todo o registry
//   npm run product:check -- <productId>  -> valida somente um produto
//
// Checagens:
// 1. Estrutura de cada manifesto contra catalog/product.schema.json (subset estrutural).
// 2. Unicidade de productId, familySlug, skuPrefix, rota (categoria+formato) e códigos de SKU/variante.
// 3. Coerência CAD: script .gh existe; sliderOrder só referencia parâmetros do produto.
// 4. Toda variante pública tem superfície de preço com amostras no dataset canônico de slice.
// 5. Paridade com o catálogo legado (lib/configurator-data.js): parâmetros, ranges, defaults,
//    prefixo de SKU e prazo precisam bater enquanto os consumidores não migram para o registry.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const catalogDir = path.join(repoRoot, "catalog");
const productsDir = path.join(catalogDir, "products");

const onlyProductId = process.argv[2] || "";
const errors = [];
const warnings = [];

function fail(productId, message) {
  errors.push(`${productId ? `[${productId}] ` : ""}${message}`);
}

function warn(productId, message) {
  warnings.push(`${productId ? `[${productId}] ` : ""}${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const categoriesFile = readJson(path.join(catalogDir, "categories.json"));
const categorySlugs = new Set(categoriesFile.categories.map((category) => category.slug));

const manifestFiles = fs
  .readdirSync(productsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

let manifests = manifestFiles.map((name) => ({
  file: name,
  data: readJson(path.join(productsDir, name))
}));

if (onlyProductId) {
  manifests = manifests.filter((entry) => entry.data.productId === onlyProductId);
  if (manifests.length === 0) {
    console.error(`Nenhum manifesto com productId "${onlyProductId}".`);
    process.exit(1);
  }
}

// --- 1. Estrutura -----------------------------------------------------------

const requiredTopLevel = [
  "productId",
  "status",
  "name",
  "category",
  "seo",
  "skuPrefix",
  "sku",
  "material",
  "colors",
  "leadTimeBaseDays",
  "generationMode",
  "parameters",
  "variants"
];

for (const { file, data } of manifests) {
  const id = data.productId || file;

  for (const field of requiredTopLevel) {
    if (data[field] === undefined) {
      fail(id, `campo obrigatório ausente: ${field}`);
    }
  }

  if (file !== `${data.productId}.json`) {
    fail(id, `nome do arquivo (${file}) deve ser <productId>.json`);
  }

  if (!["draft", "active"].includes(data.status)) {
    fail(id, `status inválido: ${data.status}`);
  }

  if (!categorySlugs.has(data.category?.slug)) {
    fail(id, `categoria desconhecida: ${data.category?.slug}`);
  }

  if (data.sku?.versionMarker !== "V2") {
    fail(id, "sku.versionMarker deve ser V2");
  }

  if (data.generationMode !== "local_manual") {
    fail(id, `generationMode inválido: ${data.generationMode}`);
  }

  const parameterKeys = new Set();
  for (const parameter of data.parameters || []) {
    if (parameterKeys.has(parameter.key)) {
      fail(id, `parâmetro duplicado: ${parameter.key}`);
    }
    parameterKeys.add(parameter.key);

    if (parameter.type === "dimension") {
      for (const field of ["unit", "min", "max", "default"]) {
        if (parameter[field] === undefined) {
          fail(id, `parâmetro ${parameter.key} sem ${field}`);
        }
      }
      if (Number(parameter.min) > Number(parameter.max)) {
        fail(id, `parâmetro ${parameter.key} com min > max`);
      }
      const defaultValue = Number(parameter.default);
      if (defaultValue < parameter.min || defaultValue > parameter.max) {
        fail(id, `parâmetro ${parameter.key} com default fora do range`);
      }
    }

    if (parameter.dependsOn && !(data.parameters || []).some((item) => item.key === parameter.dependsOn && item.type === "boolean")) {
      fail(id, `parâmetro ${parameter.key} depende de toggle inexistente: ${parameter.dependsOn}`);
    }
  }

  const tubeInnerSpan = data.manufacturing?.tubeInnerSpan;
  if (tubeInnerSpan) {
    if (!(Number(tubeInnerSpan.minimumMm) > 0)) {
      fail(id, "manufacturing.tubeInnerSpan.minimumMm deve ser positivo");
    }
    if (!parameterKeys.has(tubeInnerSpan.wallThicknessKey)) {
      fail(id, `manufacturing.tubeInnerSpan referencia parede inexistente: ${tubeInnerSpan.wallThicknessKey}`);
    }
    for (const key of tubeInnerSpan.sizeKeys || []) {
      if (!parameterKeys.has(key)) {
        fail(id, `manufacturing.tubeInnerSpan referencia tamanho inexistente: ${key}`);
      }
    }
    for (const key of Object.keys(tubeInnerSpan.sizeOffsetsMm || {})) {
      if (!(tubeInnerSpan.sizeKeys || []).includes(key)) {
        fail(id, `manufacturing.tubeInnerSpan.sizeOffsetsMm referencia tamanho não declarado: ${key}`);
      }
    }
  }

  // Composição do SKU cobre todos os parâmetros numéricos.
  const numericKeys = (data.parameters || [])
    .filter((parameter) => parameter.type === "dimension")
    .map((parameter) => parameter.key);
  for (const key of numericKeys) {
    if (!(data.sku?.parameterOrder || []).includes(key)) {
      fail(id, `parâmetro ${key} fora de sku.parameterOrder`);
    }
    if (!data.sku?.parameterCodes?.[key]) {
      fail(id, `parâmetro ${key} sem código curto em sku.parameterCodes`);
    }
  }
  for (const key of data.sku?.parameterOrder || []) {
    if (!parameterKeys.has(key)) {
      fail(id, `sku.parameterOrder referencia parâmetro inexistente: ${key}`);
    }
  }

  // Variantes.
  const variantIds = new Set();
  const variantCodes = new Set();
  for (const variant of data.variants || []) {
    if (variantIds.has(variant.id)) {
      fail(id, `variante duplicada: ${variant.id}`);
    }
    variantIds.add(variant.id);

    if (variantCodes.has(variant.code)) {
      fail(id, `código de variante duplicado: ${variant.code}`);
    }
    variantCodes.add(variant.code);

    // 3. Coerência CAD.
    const scriptPath = path.join(repoRoot, variant.cad?.script || "");
    if (!variant.cad?.script || !fs.existsSync(scriptPath)) {
      fail(id, `variante ${variant.id}: script Grasshopper não encontrado: ${variant.cad?.script}`);
    }
    for (const key of variant.cad?.sliderOrder || []) {
      if (!parameterKeys.has(key)) {
        fail(id, `variante ${variant.id}: sliderOrder referencia parâmetro inexistente: ${key}`);
      }
    }
    for (const key of Object.keys(variant.cad?.sliderTransforms || {})) {
      if (!parameterKeys.has(key)) {
        fail(id, `variante ${variant.id}: sliderTransforms referencia parâmetro inexistente: ${key}`);
      }
    }

    if (!variant.pricing?.surfaceId) {
      fail(id, `variante ${variant.id}: pricing.surfaceId ausente`);
    } else {
      const expectedSurface = `${data.category.slug}:${data.category.formatSlug}:${variant.id}`;
      if (variant.pricing.surfaceId !== expectedSurface) {
        fail(id, `variante ${variant.id}: surfaceId (${variant.pricing.surfaceId}) difere do esperado (${expectedSurface})`);
      }
    }
  }
}

// --- 2. Unicidade entre produtos --------------------------------------------

function checkUnique(label, selector) {
  const seen = new Map();
  for (const { data } of manifests) {
    const value = selector(data);
    if (seen.has(value)) {
      fail(null, `${label} duplicado entre ${seen.get(value)} e ${data.productId}: ${value}`);
    }
    seen.set(value, data.productId);
  }
}

if (!onlyProductId) {
  checkUnique("productId", (data) => data.productId);
  checkUnique("familySlug", (data) => data.seo?.familySlug);
  checkUnique("skuPrefix", (data) => data.skuPrefix);
  checkUnique("rota", (data) => `${data.category?.slug}:${data.category?.formatSlug}`);
}

// --- 4. Cobertura de slice das variantes públicas ---------------------------

const { slicerPricingSamples } = await import(
  pathToFileURL(path.join(repoRoot, "lib", "slicer-pricing-data.js")).href
);

for (const { data } of manifests) {
  for (const variant of data.variants || []) {
    const samples = slicerPricingSamples.filter((sample) => {
      return (
        sample.categorySlug === data.category.slug &&
        sample.formatSlug === data.category.formatSlug &&
        sample.variantSlug === variant.id
      );
    });

    if (variant.public && data.status === "active" && samples.length === 0) {
      fail(data.productId, `variante pública ${variant.id} sem amostras de slice (superfície ${variant.pricing?.surfaceId}) — produto não pode estar active`);
    }

    if (!variant.public && samples.length === 0) {
      warn(data.productId, `variante oculta ${variant.id} sem amostras de slice (ok, mas sem preço até ter dados)`);
    }
  }
}

// --- 5. Paridade com o catálogo legado --------------------------------------

const { productCategories } = await import(
  pathToFileURL(path.join(repoRoot, "lib", "configurator-data.js")).href
);

for (const { data } of manifests) {
  const category = productCategories.find((item) => item.slug === data.category.slug);
  const format = category?.formats?.find((item) => item.slug === data.category.formatSlug);

  if (!format) {
    fail(data.productId, "produto sem correspondente no catálogo legado (lib/configurator-data.js)");
    continue;
  }

  if (format.skuPrefix !== data.skuPrefix) {
    fail(data.productId, `skuPrefix difere do legado: ${data.skuPrefix} vs ${format.skuPrefix}`);
  }
  if (format.leadTimeBaseDays !== data.leadTimeBaseDays) {
    fail(data.productId, `leadTimeBaseDays difere do legado: ${data.leadTimeBaseDays} vs ${format.leadTimeBaseDays}`);
  }
  if (JSON.stringify(format.manufacturing || null) !== JSON.stringify(data.manufacturing || null)) {
    fail(data.productId, "manufacturing difere do catálogo legado");
  }

  const legacyParams = new Map(format.parameters.map((parameter) => [parameter.key, parameter]));
  for (const parameter of data.parameters) {
    const legacy = legacyParams.get(parameter.key);
    if (!legacy) {
      fail(data.productId, `parâmetro ${parameter.key} não existe no catálogo legado`);
      continue;
    }
    if (parameter.type === "dimension") {
      for (const field of ["min", "max"]) {
        if (Number(legacy[field]) !== Number(parameter[field])) {
          fail(data.productId, `parâmetro ${parameter.key}: ${field} difere do legado (${parameter[field]} vs ${legacy[field]})`);
        }
      }
      if (Number(legacy.defaultValue) !== Number(parameter.default)) {
        fail(data.productId, `parâmetro ${parameter.key}: default difere do legado (${parameter.default} vs ${legacy.defaultValue})`);
      }
      if (Number(legacy.step || 1) !== Number(parameter.step || 1)) {
        fail(data.productId, `parâmetro ${parameter.key}: step difere do legado (${parameter.step} vs ${legacy.step})`);
      }
    }
  }
  for (const key of legacyParams.keys()) {
    if (!data.parameters.some((parameter) => parameter.key === key)) {
      fail(data.productId, `parâmetro do legado ausente no manifesto: ${key}`);
    }
  }
}

// --- Resultado ---------------------------------------------------------------

for (const message of warnings) {
  console.warn(`AVISO  ${message}`);
}

if (errors.length > 0) {
  for (const message of errors) {
    console.error(`ERRO   ${message}`);
  }
  console.error(`\nproduct:check falhou com ${errors.length} erro(s) em ${manifests.length} manifesto(s).`);
  process.exit(1);
}

console.log(`product:check ok — ${manifests.length} manifesto(s) válidos, ${warnings.length} aviso(s).`);
