import assert from "node:assert/strict";
import test from "node:test";

import sitemap from "../app/sitemap.js";
import categoriesDocument from "../catalog/categories.json" with { type: "json" };
import { productCategories } from "../lib/configurator-data.js";
import { familyGuides, manifestFamilyCopy } from "../lib/family-content.js";
import { guidePath, guides } from "../lib/guides.js";
import { withBrandSuffix } from "../lib/page-metadata.js";
import { pageSeo } from "../lib/seo-copy.js";
import { families, siteUrl } from "../lib/site-data.js";

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 155;
const MIN_DESCRIPTION = 70;

// Marcas de terceiros e termos ambiguos que nao podem aparecer em title ou H1
// (docs/seo/keyword-research.md, secao h).
const forbiddenInTitles = /\b(eames|eiffel|bertoia|tolix|tramontina|allegra|cesca)\b|sapata interna/i;

function assertTitle(title, label) {
  assert.ok(title, `${label}: title ausente`);
  const full = withBrandSuffix(title);
  assert.ok(full.length <= MAX_TITLE, `${label}: title com ${full.length} caracteres (${full})`);
  assert.doesNotMatch(title, forbiddenInTitles, `${label}: termo proibido no title`);
}

function assertDescription(description, label) {
  assert.ok(description, `${label}: description ausente`);
  assert.ok(
    description.length <= MAX_DESCRIPTION,
    `${label}: description com ${description.length} caracteres`
  );
  assert.ok(
    description.length >= MIN_DESCRIPTION,
    `${label}: description curta demais (${description.length})`
  );
}

const indexablePages = [
  ...Object.entries(pageSeo).map(([key, page]) => ({ label: `pagina ${key}`, ...page })),
  ...families.map((family) => ({
    label: `familia ${family.slug}`,
    title: family.seoTitle,
    description: family.seoDescription,
    heading: family.heroTitle
  })),
  ...productCategories.map((category) => ({
    label: `configurador ${category.slug}`,
    title: category.seoTitle,
    description: category.description,
    heading: category.heading
  })),
  ...guides.map((guide) => ({
    label: `guia ${guide.slug}`,
    title: guide.title,
    description: guide.description,
    heading: guide.heading
  }))
];

test("paginas indexaveis respeitam os limites de title e meta description", () => {
  for (const page of indexablePages) {
    assertTitle(page.title, page.label);
    assertDescription(page.description, page.label);

    if (page.heading) {
      assert.doesNotMatch(page.heading, forbiddenInTitles, `${page.label}: termo proibido no H1`);
    }
  }
});

test("titles das paginas indexaveis nao se repetem", () => {
  const titles = indexablePages.map((page) => page.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length);
});

test("o nome operacional das categorias fica separado do rotulo publico", () => {
  // `name` vai para pedido, NF-e e Mercado Pago (lib/order-validation.js). Mudancas de SEO
  // usam publicName/seoTitle/heading/lead.
  assert.deepEqual(
    categoriesDocument.categories.map((category) => [category.slug, category.name]),
    [
      ["ponteira-interna-tubo", "Sapata interna tubos"],
      ["sapata-base-lisa", "Sapata lisa"],
      ["sapata-com-parafuso", "Sapata com parafuso"],
      ["sapata-esferica", "Sapata esférica"],
      ["sapata-u", "Sapata U"]
    ]
  );

  for (const category of productCategories) {
    assert.ok(category.publicName, `${category.slug}: publicName ausente`);
    assert.ok(category.heading, `${category.slug}: heading ausente`);
    assert.ok(category.lead, `${category.slug}: lead ausente`);
  }
});

test("toda familia tem guia proprio, categoria de produto e FAQs", () => {
  for (const family of families) {
    const guide = familyGuides[family.slug];

    assert.ok(guide, `${family.slug}: sem conteudo em lib/family-content.js`);
    assert.ok(guide.intro.length > 0, `${family.slug}: sem introducao`);
    assert.ok(guide.sections.length >= 2, `${family.slug}: guia curto demais`);
    assert.ok(family.productCategory, `${family.slug}: sem productCategory`);
    assert.ok(family.faqs.length >= 3, `${family.slug}: poucas FAQs`);
  }

  for (const slug of Object.keys(manifestFamilyCopy)) {
    assert.ok(families.some((family) => family.slug === slug), `${slug}: copy sem familia`);
  }
});

test("todo guia tem os campos obrigatorios e aparece no sitemap", () => {
  const urls = new Set(sitemap().map((entry) => entry.url));
  const slugs = guides.map((guide) => guide.slug);

  assert.ok(guides.length >= 4, "publique ao menos 4 guias");
  assert.equal(new Set(slugs).size, slugs.length, "slugs de guia repetidos");
  assert.ok(urls.has(`${siteUrl}/guias`), "indice /guias fora do sitemap");

  for (const guide of guides) {
    assert.match(guide.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${guide.slug}: slug invalido`);
    assert.ok(guide.title && guide.description && guide.heading && guide.lead, guide.slug);
    assert.match(guide.datePublished, /^\d{4}-\d{2}-\d{2}$/, `${guide.slug}: datePublished`);
    assert.ok(guide.sections.length >= 3, `${guide.slug}: poucas secoes`);
    assert.ok(guide.cta?.length > 0, `${guide.slug}: sem chamada para o configurador`);
    assert.ok(urls.has(`${siteUrl}${guidePath(guide.slug)}`), `${guide.slug}: fora do sitemap`);
  }
});

function collectLinks(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectLinks(item, found));
  } else if (value && typeof value === "object") {
    if (typeof value.href === "string") {
      found.push(value.href);
    }
    Object.values(value).forEach((item) => collectLinks(item, found));
  }
  return found;
}

test("links internos dos guias e das familias apontam para rotas existentes", () => {
  const routes = new Set([
    "/catalogo",
    "/projeto-especial",
    "/guias",
    ...families.map((family) => family.url),
    ...productCategories.map((category) => `/configurar/${category.slug}`),
    ...guides.map((guide) => guidePath(guide.slug))
  ]);
  const hrefs = collectLinks([guides, familyGuides]);

  assert.ok(hrefs.length > 0);
  for (const href of hrefs) {
    assert.ok(routes.has(href), `link interno quebrado: ${href}`);
  }

  for (const guide of Object.values(familyGuides)) {
    for (const slug of guide.guides || []) {
      assert.ok(guides.some((item) => item.slug === slug), `guia relacionado inexistente: ${slug}`);
    }
  }
});
