import {
  getInitialValues,
  productCategories,
  validateConfiguration
} from "./client-configurator-data.js";
import { calculateClientPricePreview, getClientPricingModel } from "./client-pricing-preview.js";
import { getFamilyGallery } from "./product-visuals.js";
import { productManifests } from "./product-registry.js";

function normalizeSiteUrl(url) {
  const rawUrl = (url || "https://www.baseforma.com.br").trim().replace(/\/+$/, "");

  try {
    const parsedUrl = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);

    if (parsedUrl.hostname === "baseforma.com.br") {
      parsedUrl.hostname = "www.baseforma.com.br";
    }

    return parsedUrl.toString().replace(/\/+$/, "");
  } catch {
    return "https://www.baseforma.com.br";
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export { colorMap } from "./brand-colors.js";

export const brand = {
  name: "Baseforma",
  shortName: "Baseforma",
  tagline: "Componentes técnicos sob medida para mobiliário",
  description:
    "Componentes técnicos para mobiliário com catálogo parametrizado, produção sob demanda e desenvolvimento especial.",
  email: "comercial@baseforma.com.br",
  city: "São Paulo",
  country: "Brasil"
};

// Identificacao do fornecedor exigida pelo Decreto 7.962/2013 para venda a distancia.
// O CNPJ vem de INVOICE_ISSUER_CNPJ (lib/invoice-config.js) para nao duplicar o dado fiscal.
// Razao social e endereco comercial conferem com o cadastro PJ da conta Mercado Pago
// (mesmo CNPJ do emissor da NF-e). Cidade/UF ficam em city/state e aparecem em linha propria.
export const company = {
  legalName: "GEMIGNANI DESIGN LTDA",
  tradeName: brand.name,
  address: "Rua Antônio Aggio, 1280 - Jardim Ampliação - CEP 05713-420",
  city: brand.city,
  state: "SP",
  country: brand.country,
  supportEmail: "atendimento@baseforma.com.br"
};

export const navigation = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/carrinho", label: "Carrinho" },
  { href: "/projeto-especial", label: "Projeto especial" },
  { href: "/faq", label: "FAQ" }
];

function findCategory(slug) {
  return productCategories.find((category) => category.slug === slug);
}

function findFormat(categorySlug, formatSlug) {
  return findCategory(categorySlug)?.formats.find((format) => format.slug === formatSlug);
}

function variantFromFormat(categorySlug, formatSlug, overrides = {}) {
  const format = findFormat(categorySlug, formatSlug);
  const first = format?.parameters[0];
  const second = format?.parameters[1];
  const third = format?.parameters[2];
  const base = Number(first?.defaultValue || 0);
  const height = Number(second?.defaultValue || third?.defaultValue || 0);
  const compatible = `customizável até 150 x 150 mm`;

  const defaultPrice = format
    ? calculateClientPricePreview(format, getInitialValues(format), 1).totalPriceBrl
    : 29;

  return {
    sku: `${format?.skuPrefix || "BF-CUSTOM"}-CUSTOM-PRE`,
    label: overrides.label || `${format?.name || "Sapata"} preta customizável`,
    dimensions: {
      baseMm: base,
      heightMm: height,
      compatibleRangeMm: compatible
    },
    color: "Preto",
    material: "TPU",
    finish: "não se aplica",
    salesUnit: "unidade",
    priceBrl: overrides.priceBrl || defaultPrice,
    leadTimeDays: overrides.leadTimeDays || format?.leadTimeBaseDays || 5,
    technicalFile: overrides.technicalFile || "modelo-paramétrico"
  };
}

function finalProductImages(slug) {
  return getFamilyGallery(slug).map((item) => ({
    type: item.type,
    title: item.label,
    src: item.src,
    alt: item.alt
  }));
}

function withFamilyImages(family) {
  const images = finalProductImages(family.slug);
  const product = productManifests.find((item) => item.seo.familySlug === family.slug);

  return {
    ...family,
    images,
    image: images[0],
    // Categoria do configurador que vende a familia; usada para priorizar relacionadas.
    categorySlug: product?.category.slug || null,
    configuratorPath: product
      ? `/configurar/${product.category.slug}?formato=${product.category.formatSlug}`
      : null
  };
}

const editorialFamilies = [
  {
    slug: "sapata-tubo-redondo",
    name: "Sapata para tubo redondo",
    eyebrow: "Sapata customizável para tubo",
    seoTitle: "Sapata para tubo redondo sob medida",
    seoDescription:
      "Sapata sob medida para tubo redondo, disponível em preto, branco, cinza e marrom, customizável até 150 x 150 mm.",
    keyword: "sapata para tubo redondo",
    tagline: "Sapata customizável em quatro cores para tubos redondos medidos pelo diâmetro externo.",
    heroTitle: "Sapata para tubo redondo customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida para tubos redondos. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-tubo-redondo",
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["mesas metálicas", "cadeiras", "banquetas", "serralheria"],
    fixation: "press-fit interno",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["tubo redondo", "até 150 x 150 mm", "4 cores disponíveis"],
    highlights: ["customizável por medida", "sem quantidade mínima", "4 cores disponíveis"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Mesas, cadeiras, banquetas e estruturas tubulares redondas que precisam de sapata sob medida.",
    asideTitle: "Modelo paramétrico disponível",
    asideDescription:
      "Esta família tem modelo paramétrico ativo: configure as medidas no configurador e veja preço e prazo na hora.",
    faqs: [
      {
        question: "Qual cor está disponível agora?",
        answer: "Preto, branco, cinza e marrom."
      },
      {
        question: "Existe quantidade mínima?",
        answer: "Não. A linha atual não aplica quantidade mínima."
      },
      {
        question: "Qual o limite de medida?",
        answer: "Medidas até 150 x 150 mm são tratadas como vendáveis."
      }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "redondo", { leadTimeDays: 5 })]
  },
  {
    slug: "sapata-tubo-quadrado",
    name: "Sapata para tubo quadrado",
    eyebrow: "Sapata customizável para tubo",
    seoTitle: "Sapata para tubo quadrado sob medida",
    seoDescription:
      "Sapata sob medida para tubo quadrado, disponível em preto, branco, cinza e marrom, customizável até 150 x 150 mm.",
    keyword: "sapata para tubo quadrado",
    tagline: "Sapata customizável em quatro cores para tubos quadrados e metalon.",
    heroTitle: "Sapata para tubo quadrado customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida para tubos quadrados. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-tubo-quadrado",
    leadTimeDays: 6,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["mesas metálicas", "buffets", "aparadores", "serralheria"],
    fixation: "press-fit interno",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["tubo quadrado", "até 150 x 150 mm", "4 cores disponíveis"],
    highlights: ["customizável por medida", "sem quantidade mínima", "4 cores disponíveis"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Estruturas de metalon, mesas, buffets e aparadores com tubo quadrado.",
    asideTitle: "Modelo paramétrico disponível",
    asideDescription:
      "Esta família tem modelo paramétrico ativo: configure as medidas no configurador e veja preço e prazo na hora.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Preto, branco, cinza e marrom." },
      { question: "Existe acabamento?", answer: "Não. Acabamento adicional não se aplica aos produtos da linha atual." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "quadrado", { leadTimeDays: 6 })]
  },
  {
    slug: "sapata-tubo-oblongo",
    name: "Sapata para tubo oblongo",
    eyebrow: "Sapata customizável para tubo",
    seoTitle: "Sapata para tubo oblongo sob medida",
    seoDescription:
      "Sapata sob medida para tubo oblongo, disponível em preto, branco, cinza e marrom, customizável até 150 x 150 mm.",
    keyword: "sapata para tubo oblongo",
    tagline: "Sapata customizável em quatro cores para perfis oblongos e ovais.",
    heroTitle: "Sapata para tubo oblongo customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida para tubos oblongos. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-tubo-oblongo",
    leadTimeDays: 8,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["cadeiras", "móveis importados", "reposição", "serralheria"],
    fixation: "press-fit interno",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["tubo oblongo", "até 150 x 150 mm", "4 cores disponíveis"],
    highlights: ["customizável por medida", "sem quantidade mínima", "4 cores disponíveis"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Perfis ovais ou oblongos em cadeiras, móveis importados e reposições fora de padrão.",
    asideTitle: "Modelo paramétrico disponível",
    asideDescription:
      "Esta família tem modelo paramétrico ativo: configure as medidas no configurador e veja preço e prazo na hora.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Preto, branco, cinza e marrom." },
      { question: "Existe quantidade mínima?", answer: "Não. A linha atual não aplica quantidade mínima." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "oblongo", { leadTimeDays: 8 })]
  },
  {
    slug: "sapata-lisa-redonda",
    name: "Sapata lisa redonda",
    eyebrow: "Modelo paramétrico disponível",
    seoTitle: "Sapata lisa redonda sob medida",
    seoDescription:
      "Sapata lisa redonda sob medida, disponível em preto, branco, cinza e marrom, customizável até 150 x 150 mm.",
    keyword: "sapata lisa redonda",
    tagline: "Sapata lisa redonda em quatro cores com modelo paramétrico já disponível.",
    heroTitle: "Sapata lisa redonda customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida com modelo paramétrico já disponível. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-lisa-redonda",
    leadTimeDays: 4,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["poltronas", "sofás", "bases circulares", "móveis autorais"],
    fixation: "apoio plano",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["lisa redonda", "até 150 x 150 mm", "4 cores disponíveis"],
    highlights: ["modelo paramétrico disponível", "sem quantidade mínima", "4 cores disponíveis"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Bases circulares, pés redondos e apoios planos que precisam de uma sapata lisa sob medida.",
    asideTitle: "Pronta para trabalhar nos modelos",
    asideDescription:
      "Esta é uma das famílias com modelo paramétrico disponível para evoluir primeiro.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Preto, branco, cinza e marrom." },
      { question: "Existe acabamento?", answer: "Não. Acabamento adicional não se aplica aos produtos da linha atual." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("sapata-base-lisa", "redonda", { leadTimeDays: 4 })]
  },
  {
    slug: "sapata-lisa-quadrada",
    name: "Sapata lisa quadrada",
    eyebrow: "Modelo paramétrico disponível",
    seoTitle: "Sapata lisa quadrada sob medida",
    seoDescription:
      "Sapata lisa quadrada sob medida, disponível em preto, branco, cinza e marrom, customizável até 150 x 150 mm.",
    keyword: "sapata lisa quadrada",
    tagline: "Sapata lisa quadrada em quatro cores com modelo paramétrico já disponível.",
    heroTitle: "Sapata lisa quadrada customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida com modelo paramétrico já disponível. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-lisa-quadrada",
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["chapa metálica", "banquinhos", "bases quadradas", "móveis autorais"],
    fixation: "apoio plano",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["lisa quadrada", "até 150 x 150 mm", "4 cores disponíveis"],
    highlights: ["modelo paramétrico disponível", "sem quantidade mínima", "4 cores disponíveis"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Bases quadradas, chapas e apoios planos que precisam de uma sapata lisa sob medida.",
    asideTitle: "Pronta para trabalhar nos modelos",
    asideDescription:
      "Esta é uma das famílias com modelo paramétrico disponível para evoluir primeiro.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Preto, branco, cinza e marrom." },
      { question: "Existe quantidade mínima?", answer: "Não. A linha atual não aplica quantidade mínima." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("sapata-base-lisa", "quadrada", { leadTimeDays: 5 })]
  },
  {
    slug: "sapata-com-parafuso-redonda",
    name: "Sapata com parafuso redonda",
    eyebrow: "Fixação mecânica central",
    seoTitle: "Sapata redonda com parafuso sob medida",
    seoDescription:
      "Sapata redonda em TPU, sob medida, com furo central técnico para fixação por parafuso.",
    keyword: "sapata redonda com parafuso",
    tagline: "Apoio redondo sob medida com fixação mecânica central e parafuso oculto do piso.",
    heroTitle: "Sapata redonda com parafuso, configurável de 12 a 150 mm.",
    heroDescription:
      "Configure diâmetro, altura, cor e parafusos de 2 a 10 mm. O escareamento inferior acompanha o dobro do diâmetro escolhido; o parafuso não está incluso.",
    url: "/familias/sapata-com-parafuso-redonda",
    leadTimeDays: 4,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["cadeiras", "mesas", "poltronas", "pés redondos de madeira"],
    fixation: "parafuso central",
    compatibilitySummary: "Diâmetro de 12 a 150 mm e altura de 1 a 10 mm.",
    parameterSummary: ["redonda", "furo de 2 a 10 mm", "quatro cores"],
    highlights: ["fixação mecânica", "modelo paramétrico", "sem quantidade mínima"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Pés redondos e bases circulares que precisam de fixação mais firme do que um apoio apenas colado.",
    asideTitle: "Geometria técnica validada",
    asideDescription:
      "A peça tem furo passante central configurável e escareamento inferior com o dobro do diâmetro para alojar a cabeça do parafuso.",
    faqs: [
      { question: "O parafuso acompanha a sapata?", answer: "Não. Escolha o parafuso adequado ao material e à profundidade do pé." },
      { question: "Posso alterar o diâmetro do furo?", answer: "Sim. O configurador aceita parafusos de 2 a 10 mm e valida a parede mínima da sapata." },
      { question: "Qual é a menor medida?", answer: "O diâmetro mínimo é 12 mm para preservar material ao redor do escareamento." }
    ],
    variants: [variantFromFormat("sapata-com-parafuso", "redonda", { leadTimeDays: 4 })]
  },
  {
    slug: "sapata-com-parafuso-quadrada",
    name: "Sapata com parafuso quadrada",
    eyebrow: "Fixação mecânica central",
    seoTitle: "Sapata quadrada com parafuso sob medida",
    seoDescription:
      "Sapata quadrada em TPU, sob medida, com furo central técnico para fixação por parafuso.",
    keyword: "sapata quadrada com parafuso",
    tagline: "Apoio quadrado sob medida com fixação mecânica central e parafuso oculto do piso.",
    heroTitle: "Sapata quadrada com parafuso, configurável de 12 a 150 mm.",
    heroDescription:
      "Configure os dois lados, a altura, a cor e parafusos de 2 a 10 mm. O escareamento inferior acompanha o dobro do diâmetro escolhido; o parafuso não está incluso.",
    url: "/familias/sapata-com-parafuso-quadrada",
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["cadeiras", "mesas", "banquinhos", "pés quadrados de madeira"],
    fixation: "parafuso central",
    compatibilitySummary: "Lados de 12 a 150 mm e altura de 1 a 10 mm.",
    parameterSummary: ["quadrada", "furo de 2 a 10 mm", "quatro cores"],
    highlights: ["fixação mecânica", "modelo paramétrico", "sem quantidade mínima"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Pés quadrados e bases planas que precisam de fixação mais firme do que um apoio apenas colado.",
    asideTitle: "Geometria técnica validada",
    asideDescription:
      "A peça tem furo passante central configurável e escareamento inferior com o dobro do diâmetro para alojar a cabeça do parafuso.",
    faqs: [
      { question: "O parafuso acompanha a sapata?", answer: "Não. Escolha o parafuso adequado ao material e à profundidade do pé." },
      { question: "Posso alterar o diâmetro do furo?", answer: "Sim. O configurador aceita parafusos de 2 a 10 mm e valida a parede mínima da sapata." },
      { question: "Qual é a menor medida?", answer: "Cada lado deve ter pelo menos 12 mm para preservar material ao redor do escareamento." }
    ],
    variants: [variantFromFormat("sapata-com-parafuso", "quadrada", { leadTimeDays: 5 })]
  }
].map(withFamilyImages);

// "A partir de" (priceFromBrl) e o teto (priceToBrl) saem do mesmo motor de preco do
// configurador para todas as familias; o JSON-LD da pagina usa exatamente estes campos.
export const families = [
  ...editorialFamilies,
  ...productManifests
    .filter((product) => {
      return product.status === "active" &&
        !editorialFamilies.some((family) => family.slug === product.seo.familySlug);
    })
    .map(familyFromManifest)
].map(withPublishedPriceRange);

function withPublishedPriceRange(family) {
  const product = productManifests.find((item) => item.seo.familySlug === family.slug);
  const format = product ? findFormat(product.category.slug, product.category.formatSlug) : null;
  const range = format ? calculatePublishedPriceRange(product, format) : null;

  return {
    ...family,
    priceFromBrl: range?.lowBrl ?? 0,
    priceToBrl: range?.highBrl ?? 0
  };
}

function familyFromManifest(product) {
  const format = findFormat(product.category.slug, product.category.formatSlug);
  const dimensions = product.parameters.filter((parameter) => parameter.type === "dimension");
  const rangeSummary = dimensions
    .slice(0, 2)
    .map((parameter) => `${parameter.label}: ${parameter.min} a ${parameter.max} ${parameter.unit}`)
    .join("; ");

  return withFamilyImages({
    slug: product.seo.familySlug,
    name: product.ui.summaryName,
    eyebrow: product.ui.fixation,
    seoTitle: `${product.ui.summaryName} sob medida`,
    seoDescription: product.description,
    keyword: product.ui.summaryName.toLowerCase(),
    tagline: product.description,
    heroTitle: product.ui.summaryName,
    heroDescription: product.notes?.[0] || product.description,
    url: `/familias/${product.seo.familySlug}`,
    leadTimeDays: product.leadTimeBaseDays,
    salesUnit: "unidade",
    defaultMaterial: product.material,
    availableColors: product.colors,
    applications: product.ui.applications,
    fixation: product.ui.fixation,
    compatibilitySummary: rangeSummary,
    parameterSummary: dimensions.slice(0, 3).map((parameter) => parameter.label),
    highlights: ["configuração por medida", "produção sob demanda", product.ui.fixation],
    fitTitle: "Aplicações indicadas",
    fitDescription: product.ui.applications.join(", "),
    asideTitle: "Modelo paramétrico disponível",
    asideDescription: "Configure as medidas para consultar fabricação, preço e prazo.",
    faqs: [
      {
        question: "Quais medidas posso configurar?",
        answer: rangeSummary || "Consulte os parâmetros disponíveis no configurador."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer: product.colors.join(", ")
      }
    ],
    variants: [variantFromFormat(product.category.slug, product.category.formatSlug)]
  });
}

/**
 * Faixa de preco unitario publicada (1 unidade) dentro das medidas validas de todas as
 * variantes publicas, calculada pelo motor de preco do configurador.
 *
 * O modelo monotono so cresce com cada medida, exceto a espessura de parede (`wallKey`),
 * que e interpolada por trechos. Por isso a parede e varrida em todos os passos do slider e,
 * para cada valor, as demais medidas sao levadas ao menor (ou maior) ponto fabricavel. Os
 * casos de canto da versao anterior entram como candidatos extras, entao a faixa nunca fica
 * mais estreita do que a calculada antes.
 */
export function calculatePublishedPriceRange(product, format) {
  const initialValues = getInitialValues(format);
  const candidates = product.variants
    .filter((variant) => variant.public)
    .flatMap((variant) => {
      const defaults = { ...initialValues, ...(variant.condition || {}) };
      const parameters = format.parameters.filter((parameter) => {
        return parameter.type !== "boolean" && (!parameter.dependsOn || defaults[parameter.dependsOn]);
      });
      const wallKey = getClientPricingModel(format, defaults)?.wallKey || "";
      const scanned = parameters.filter((parameter) => parameter.key === wallKey);
      const free = parameters.filter((parameter) => parameter.key !== wallKey);
      const cases = [...cornerCases(defaults, parameters)];

      for (const fixed of scanCombinations(defaults, scanned)) {
        cases.push(extremeValidPoint(format, fixed, free, "low"));
        cases.push(extremeValidPoint(format, fixed, free, "high"));
      }

      return cases.filter((values) => values && validateConfiguration(format, values).length === 0);
    })
    .map((values) => ({ values, priceBrl: calculateClientPricePreview(format, values, 1).unitPriceBrl }))
    .filter((candidate) => Number(candidate.priceBrl) > 0);

  if (candidates.length === 0) {
    const fallback = calculateClientPricePreview(format, initialValues, 1).unitPriceBrl;
    return { lowBrl: fallback, highBrl: fallback, lowValues: initialValues, highValues: initialValues };
  }

  const low = candidates.reduce((best, item) => (item.priceBrl < best.priceBrl ? item : best));
  const high = candidates.reduce((best, item) => (item.priceBrl > best.priceBrl ? item : best));

  return { lowBrl: low.priceBrl, highBrl: high.priceBrl, lowValues: low.values, highValues: high.values };
}

function parameterGrid(parameter) {
  const min = Number(parameter.min);
  const max = Number(parameter.max);
  const step = Number(parameter.step) > 0 ? Number(parameter.step) : 1;
  const count = Math.floor((max - min) / step + 1e-9);
  const values = Array.from({ length: count + 1 }, (_, index) => Math.round((min + index * step) * 1e6) / 1e6);

  return values.at(-1) < max ? [...values, max] : values;
}

function cornerCases(defaults, parameters) {
  const allMin = { ...defaults };
  const allMax = { ...defaults };
  const cases = [defaults];

  for (const parameter of parameters) {
    allMin[parameter.key] = parameter.min;
    allMax[parameter.key] = parameter.max;
    cases.push({ ...defaults, [parameter.key]: parameter.min });
    cases.push({ ...defaults, [parameter.key]: parameter.max });
  }

  return [...cases, allMin, allMax];
}

function scanCombinations(defaults, parameters) {
  return parameters.reduce((combinations, parameter) => {
    return combinations.flatMap((values) => {
      return parameterGrid(parameter).map((value) => ({ ...values, [parameter.key]: value }));
    });
  }, [defaults]);
}

// Menor ("low") ou maior ("high") ponto fabricavel com as medidas livres: primeiro avanca
// todas juntas a partir do extremo ate achar uma combinacao valida e depois aproxima cada
// medida do extremo, uma por vez, enquanto a configuracao continuar valida.
function extremeValidPoint(format, fixed, parameters, direction) {
  const grids = parameters.map((parameter) => {
    const grid = parameterGrid(parameter);
    return direction === "low" ? grid : [...grid].reverse();
  });
  const isValid = (values) => validateConfiguration(format, values).length === 0;
  const blendSteps = 64;
  let point = null;

  for (let step = 0; step <= blendSteps && !point; step += 1) {
    const values = { ...fixed };
    parameters.forEach((parameter, index) => {
      const grid = grids[index];
      values[parameter.key] = grid[Math.round((step / blendSteps) * (grid.length - 1))];
    });
    point = isValid(values) ? values : null;
  }

  if (!point) {
    return null;
  }

  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;

    parameters.forEach((parameter, index) => {
      const value = grids[index].find((candidate) => isValid({ ...point, [parameter.key]: candidate }));

      if (value !== undefined && value !== point[parameter.key]) {
        point = { ...point, [parameter.key]: value };
        changed = true;
      }
    });

    if (!changed) break;
  }

  return point;
}

export function getFamilyBySlug(slug) {
  return families.find((family) => family.slug === slug);
}

// Limita as relacionadas para reduzir peso da pagina e diluicao de links,
// priorizando familias da mesma categoria e mantendo a ordem editorial.
export function getRelatedFamilies(slug, limit = 3) {
  const current = getFamilyBySlug(slug);
  const others = families.filter((family) => family.slug !== slug);
  const sameCategory = current?.categorySlug
    ? others.filter((family) => family.categorySlug === current.categorySlug)
    : [];
  const remaining = others.filter((family) => !sameCategory.includes(family));

  return [...sameCategory, ...remaining].slice(0, limit);
}

export function buildFamilyMeasureKey(variant) {
  return [
    variant.dimensions.baseMm,
    variant.dimensions.heightMm,
    variant.dimensions.compatibleRangeMm
  ].join("|");
}

export function buildFamilyMeasureLabel(variant) {
  const compatible = variant.dimensions.compatibleRangeMm
    ? ` | compatível: ${variant.dimensions.compatibleRangeMm}`
    : "";

  return `${variant.dimensions.baseMm} x ${variant.dimensions.heightMm} mm${compatible}`;
}
