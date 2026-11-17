import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { productCategories as clientCategories } from "../lib/client-configurator-data.js";
import { calculatePriceBreakdown, productCategories, validateConfiguration } from "../lib/configurator-data.js";
import { formatCurrency } from "../lib/format.js";
import { ogImageManifest } from "../lib/og-image-manifest.js";
import {
  buildPageMetadata,
  defaultOgImage,
  getConfiguratorOgImage,
  getFamilyOgImage
} from "../lib/page-metadata.js";
import { productManifests } from "../lib/product-registry.js";
import { brand, calculatePublishedPriceRange, company, families } from "../lib/site-data.js";
import {
  absoluteUrl,
  buildFamilyProductJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  parseCompanyAddress
} from "../lib/structured-data.js";

const siteUrl = "https://www.baseforma.com.br";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const googleAvailability = new Set([
  "BackOrder", "Discontinued", "InStock", "InStoreOnly", "LimitedAvailability",
  "OnlineOnly", "OutOfStock", "PreOrder", "PreSale", "SoldOut"
].map((value) => `https://schema.org/${value}`));

function assertAbsoluteHttps(url, label) {
  assert.match(String(url), /^https:\/\/[^/]+\//, `${label}: ${url}`);
}

function formatFor(family) {
  const product = productManifests.find((item) => item.seo.familySlug === family.slug);
  const format = productCategories
    .find((category) => category.slug === product.category.slug)
    .formats.find((item) => item.slug === product.category.formatSlug);
  const clientFormat = clientCategories
    .find((category) => category.slug === product.category.slug)
    .formats.find((item) => item.slug === product.category.formatSlug);

  return { product, format, clientFormat };
}

// Gerador deterministico para amostrar configuracoes sem depender de Math.random.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomConfiguration(format, random) {
  const values = {};

  for (const parameter of format.parameters) {
    if (parameter.type === "boolean") {
      values[parameter.key] = random() < 0.5;
      continue;
    }

    const step = Number(parameter.step) || 1;
    const count = Math.floor((parameter.max - parameter.min) / step + 1e-9);
    values[parameter.key] = Math.round((parameter.min + Math.floor(random() * (count + 1)) * step) * 1e6) / 1e6;
  }

  return values;
}

test("Organization (OnlineStore) traz identidade, endereco, contato e logo absolutos", () => {
  const data = buildOrganizationJsonLd({
    siteUrl,
    brand,
    company,
    cnpj: "42616830000198",
    logoPath: "/brand/baseforma-mark.png"
  });

  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "OnlineStore");
  assert.equal(data["@id"], `${siteUrl}/#organization`);
  assert.equal(data.name, "Baseforma");
  assert.equal(data.legalName, "GEMIGNANI DESIGN LTDA");
  assert.equal(data.url, `${siteUrl}/`);
  assertAbsoluteHttps(data.logo, "logo");
  assert.equal(data.email, brand.email);
  assert.equal(data.taxID, "42.616.830/0001-98");
  assert.deepEqual(data.address, {
    "@type": "PostalAddress",
    streetAddress: "Rua Antônio Aggio, 1280 - Jardim Ampliação",
    addressLocality: "São Paulo",
    addressRegion: "SP",
    postalCode: "05713-420",
    addressCountry: "BR"
  });
  assert.equal(data.contactPoint[0]["@type"], "ContactPoint");
  assert.equal(data.contactPoint[0].email, company.supportEmail);

  const policy = data.hasMerchantReturnPolicy;
  assert.equal(policy.applicableCountry, "BR");
  assert.equal(policy.returnPolicyCategory, "https://schema.org/MerchantReturnFiniteReturnWindow");
  assert.equal(policy.merchantReturnDays, 7);
  assert.equal(policy.returnFees, "https://schema.org/FreeReturn");
  assertAbsoluteHttps(policy.merchantReturnLink, "merchantReturnLink");
});

test("Organization omite taxID quando o CNPJ nao tem 14 digitos", () => {
  const data = buildOrganizationJsonLd({ siteUrl, brand, company, cnpj: "", logoPath: "/logo.png" });

  assert.equal("taxID" in data, false);
});

test("parseCompanyAddress separa logradouro e CEP", () => {
  assert.deepEqual(parseCompanyAddress("Rua A, 10 - Centro - CEP 01001000"), {
    streetAddress: "Rua A, 10 - Centro",
    postalCode: "01001-000"
  });
});

test("WebSite declara nome, URL, idioma e nao anuncia busca inexistente", () => {
  const data = buildWebSiteJsonLd({ siteUrl, brand });

  assert.equal(data["@type"], "WebSite");
  assert.equal(data.url, `${siteUrl}/`);
  assert.equal(data.inLanguage, "pt-BR");
  assert.equal("potentialAction" in data, false);
  assert.equal(data.publisher["@id"], `${siteUrl}/#organization`);
});

test("Product de cada familia tem campos obrigatorios, URLs absolutas e preco coerente", () => {
  for (const family of families) {
    const data = buildFamilyProductJsonLd(family, { siteUrl, brand });
    const { product } = formatFor(family);
    const offer = data.offers;

    assert.equal(data["@type"], "Product", family.slug);
    assert.ok(data.name, family.slug);
    assert.ok(data.description, family.slug);
    assert.equal(data.url, absoluteUrl(family.url, siteUrl));
    assert.equal(data.sku, product.skuPrefix, family.slug);
    assert.equal(data.brand.name, brand.name);
    assert.ok(data.material, family.slug);
    assert.ok(Array.isArray(data.color) && data.color.length > 0, family.slug);
    assert.ok(data.image.length > 0, family.slug);
    data.image.forEach((url) => assertAbsoluteHttps(url, `${family.slug} image`));

    assert.equal(offer["@type"], "AggregateOffer");
    assert.equal(offer.priceCurrency, "BRL");
    assert.equal(typeof offer.lowPrice, "number");
    assert.equal(typeof offer.highPrice, "number");
    assert.ok(offer.lowPrice > 0, `${family.slug} lowPrice`);
    assert.ok(offer.lowPrice <= offer.highPrice, `${family.slug} lowPrice <= highPrice`);
    assert.ok(googleAvailability.has(offer.availability), offer.availability);
    assert.equal(offer.url, data.url);
    assert.equal(offer.seller["@id"], `${siteUrl}/#organization`);

    // O "A partir de" visivel (pagina e card) usa family.priceFromBrl.
    assert.equal(offer.lowPrice, family.priceFromBrl, `${family.slug} lowPrice == preco visivel`);
    assert.equal(formatCurrency(offer.lowPrice), formatCurrency(family.priceFromBrl));
    assert.equal(offer.highPrice, family.priceToBrl, `${family.slug} highPrice`);
  }
});

test("faixa publicada bate com o motor autoritativo e contem configuracoes amostradas", () => {
  for (const family of families) {
    const { product, format, clientFormat } = formatFor(family);
    const range = calculatePublishedPriceRange(product, clientFormat);
    const tolerance = 0.25;

    assert.equal(range.lowBrl, family.priceFromBrl, family.slug);
    assert.equal(range.highBrl, family.priceToBrl, family.slug);

    for (const [label, values, expected] of [
      ["low", range.lowValues, range.lowBrl],
      ["high", range.highValues, range.highBrl]
    ]) {
      assert.deepEqual(validateConfiguration(format, values), [], `${family.slug} ${label} valido`);
      const authoritative = calculatePriceBreakdown(format, values, 1);
      assert.ok(authoritative.pricingAvailable, `${family.slug} ${label} precificavel`);
      assert.ok(
        Math.abs(authoritative.unitPriceBrl - expected) <= tolerance,
        `${family.slug} ${label}: motor ${authoritative.unitPriceBrl} x publicado ${expected}`
      );
    }

    const random = seededRandom(family.slug.length * 7919);
    let checked = 0;

    for (let attempt = 0; attempt < 600 && checked < 150; attempt += 1) {
      const values = randomConfiguration(format, random);
      if (validateConfiguration(format, values).length > 0) continue;
      const price = calculatePriceBreakdown(format, values, 1);
      if (!price.pricingAvailable) continue;
      checked += 1;
      assert.ok(
        price.unitPriceBrl >= range.lowBrl - tolerance && price.unitPriceBrl <= range.highBrl + tolerance,
        `${family.slug}: ${price.unitPriceBrl} fora de ${range.lowBrl}-${range.highBrl} em ${JSON.stringify(values)}`
      );
    }

    assert.ok(checked > 20, `${family.slug}: poucas configuracoes validas amostradas (${checked})`);
  }
});

test("OG por familia e configurador: imagem propria, 1200x630 e leve", () => {
  const keys = [
    ...families.map((family) => `familias/${family.slug}`),
    ...productCategories.map((category) => `configurar/${category.slug}`)
  ];

  for (const key of keys) {
    const image = ogImageManifest[key];
    assert.ok(image, `falta OG para ${key}; rode node scripts/build-og-images.mjs`);
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
    assert.ok(image.alt, `${key} alt`);

    const file = path.join(root, "public", image.url);
    const buffer = readFileSync(file);
    assert.equal(buffer[0], 0xff, `${key} deve ser JPEG`);
    assert.equal(buffer[1], 0xd8, `${key} deve ser JPEG`);
    assert.ok(statSync(file).size < 300 * 1024, `${key} acima de 300 KB`);
  }

  for (const family of families) {
    assert.equal(ogImageManifest[`familias/${family.slug}`].source, family.image.src, family.slug);
  }
});

test("buildPageMetadata usa a imagem informada e mantem a padrao sem ela", () => {
  const family = families[0];
  const image = getFamilyOgImage(family.slug);
  const withImage = buildPageMetadata({ title: "X", description: "Y", path: family.url, image });

  assert.deepEqual(withImage.openGraph.images, [image]);
  assert.deepEqual(withImage.twitter.images, [{ url: image.url, alt: image.alt }]);
  assert.equal(withImage.twitter.card, "summary_large_image");

  const configurator = getConfiguratorOgImage(productCategories[0].slug);
  assert.ok(configurator.url.startsWith("/og/configurar/"));

  const fallback = buildPageMetadata({ title: "X", description: "Y", path: "/faq" });
  assert.deepEqual(fallback.openGraph.images, [defaultOgImage]);
  assert.deepEqual(fallback.twitter.images, [{ url: defaultOgImage.url, alt: defaultOgImage.alt }]);
  assert.equal(getFamilyOgImage("inexistente"), undefined);
});
