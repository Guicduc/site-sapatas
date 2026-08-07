import { calculatePriceBreakdown, getInitialValues, productCategories } from "./configurator-data.js";
import { getFamilyGallery } from "./product-visuals.js";

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
  whatsappNumber: "5511999990000",
  email: "comercial@baseforma.com.br",
  city: "São Paulo",
  country: "Brasil"
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
    ? calculatePriceBreakdown(format, getInitialValues(format), 1).totalPriceBrl
    : 29;

  return {
    sku: `${format?.skuPrefix || "BF-CUSTOM"}-CUSTOM-PRE`,
    label: overrides.label || `${format?.name || "Sapata"} preta customizável`,
    dimensions: {
      baseMm: base,
      heightMm: height,
      compatibleRangeMm: compatible
    },
    color: "Preta",
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

  return {
    ...family,
    images,
    image: images[0]
  };
}

export const families = [
  {
    slug: "sapata-tubo-redondo",
    name: "Sapata para tubo redondo",
    eyebrow: "Sapata customizável para tubo",
    seoTitle: "Sapata para tubo redondo sob medida | Baseforma",
    seoDescription:
      "Sapata preta sob medida para tubo redondo, customizável até 150 x 150 mm para mobiliário.",
    keyword: "sapata para tubo redondo",
    tagline: "Sapata preta customizável para tubos redondos medidos pelo diâmetro externo.",
    heroTitle: "Sapata para tubo redondo customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida para tubos redondos. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-tubo-redondo",
    priceFromBrl: 0.75,
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preta"],
    applications: ["mesas metálicas", "cadeiras", "banquetas", "serralheria"],
    fixation: "press-fit interno",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["tubo redondo", "até 150 x 150 mm", "cor preta"],
    highlights: ["customizável por medida", "sem quantidade mínima", "cor preta padrão"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Mesas, cadeiras, banquetas e estruturas tubulares redondas que precisam de sapata sob medida.",
    asideTitle: "Modelo paramétrico disponível",
    asideDescription:
      "Esta família tem modelo paramétrico ativo: configure as medidas no configurador e veja preço e prazo na hora.",
    faqs: [
      {
        question: "Qual cor está disponível agora?",
        answer: "Apenas preta."
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
    seoTitle: "Sapata para tubo quadrado sob medida | Baseforma",
    seoDescription:
      "Sapata preta sob medida para tubo quadrado, customizável até 150 x 150 mm para mobiliário.",
    keyword: "sapata para tubo quadrado",
    tagline: "Sapata preta customizável para tubos quadrados e metalon.",
    heroTitle: "Sapata para tubo quadrado customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida para tubos quadrados. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-tubo-quadrado",
    priceFromBrl: 0.75,
    leadTimeDays: 6,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preta"],
    applications: ["mesas metálicas", "buffets", "aparadores", "serralheria"],
    fixation: "press-fit interno",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["tubo quadrado", "até 150 x 150 mm", "cor preta"],
    highlights: ["customizável por medida", "sem quantidade mínima", "cor preta padrão"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Estruturas de metalon, mesas, buffets e aparadores com tubo quadrado.",
    asideTitle: "Modelo paramétrico disponível",
    asideDescription:
      "Esta família tem modelo paramétrico ativo: configure as medidas no configurador e veja preço e prazo na hora.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Apenas preta." },
      { question: "Existe acabamento?", answer: "Não. Acabamento adicional não se aplica aos produtos da linha atual." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "quadrado", { leadTimeDays: 6 })]
  },
  {
    slug: "sapata-tubo-oblongo",
    name: "Sapata para tubo oblongo",
    eyebrow: "Sapata customizável para tubo",
    seoTitle: "Sapata para tubo oblongo sob medida | Baseforma",
    seoDescription:
      "Sapata preta sob medida para tubo oblongo, customizável até 150 x 150 mm para mobiliário.",
    keyword: "sapata para tubo oblongo",
    tagline: "Sapata preta customizável para perfis oblongos e ovais.",
    heroTitle: "Sapata para tubo oblongo customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida para tubos oblongos. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-tubo-oblongo",
    priceFromBrl: 1,
    leadTimeDays: 8,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preta"],
    applications: ["cadeiras", "móveis importados", "reposição", "serralheria"],
    fixation: "press-fit interno",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["tubo oblongo", "até 150 x 150 mm", "cor preta"],
    highlights: ["customizável por medida", "sem quantidade mínima", "cor preta padrão"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Perfis ovais ou oblongos em cadeiras, móveis importados e reposições fora de padrão.",
    asideTitle: "Modelo paramétrico disponível",
    asideDescription:
      "Esta família tem modelo paramétrico ativo: configure as medidas no configurador e veja preço e prazo na hora.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Apenas preta." },
      { question: "Existe quantidade mínima?", answer: "Não. A linha atual não aplica quantidade mínima." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "oblongo", { leadTimeDays: 8 })]
  },
  {
    slug: "sapata-lisa-redonda",
    name: "Sapata lisa redonda",
    eyebrow: "Modelo paramétrico disponível",
    seoTitle: "Sapata lisa redonda sob medida | Baseforma",
    seoDescription:
      "Sapata lisa redonda preta sob medida, customizável até 150 x 150 mm para mobiliário.",
    keyword: "sapata lisa redonda",
    tagline: "Sapata lisa redonda preta com modelo paramétrico já disponível.",
    heroTitle: "Sapata lisa redonda customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida com modelo paramétrico já disponível. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-lisa-redonda",
    priceFromBrl: 0.3,
    leadTimeDays: 4,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preta"],
    applications: ["poltronas", "sofás", "bases circulares", "móveis autorais"],
    fixation: "apoio plano",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["lisa redonda", "até 150 x 150 mm", "cor preta"],
    highlights: ["modelo paramétrico disponível", "sem quantidade mínima", "cor preta padrão"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Bases circulares, pés redondos e apoios planos que precisam de uma sapata lisa sob medida.",
    asideTitle: "Pronta para trabalhar nos modelos",
    asideDescription:
      "Esta é uma das famílias com modelo paramétrico disponível para evoluir primeiro.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Apenas preta." },
      { question: "Existe acabamento?", answer: "Não. Acabamento adicional não se aplica aos produtos da linha atual." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("sapata-base-lisa", "redonda", { leadTimeDays: 4 })]
  },
  {
    slug: "sapata-lisa-quadrada",
    name: "Sapata lisa quadrada",
    eyebrow: "Modelo paramétrico disponível",
    seoTitle: "Sapata lisa quadrada sob medida | Baseforma",
    seoDescription:
      "Sapata lisa quadrada preta sob medida, customizável até 150 x 150 mm para mobiliário.",
    keyword: "sapata lisa quadrada",
    tagline: "Sapata lisa quadrada preta com modelo paramétrico já disponível.",
    heroTitle: "Sapata lisa quadrada customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida com modelo paramétrico já disponível. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-lisa-quadrada",
    priceFromBrl: 0.3,
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preta"],
    applications: ["chapa metálica", "banquinhos", "bases quadradas", "móveis autorais"],
    fixation: "apoio plano",
    compatibilitySummary: "Medidas customizáveis até 150 x 150 mm.",
    parameterSummary: ["lisa quadrada", "até 150 x 150 mm", "cor preta"],
    highlights: ["modelo paramétrico disponível", "sem quantidade mínima", "cor preta padrão"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Bases quadradas, chapas e apoios planos que precisam de uma sapata lisa sob medida.",
    asideTitle: "Pronta para trabalhar nos modelos",
    asideDescription:
      "Esta é uma das famílias com modelo paramétrico disponível para evoluir primeiro.",
    faqs: [
      { question: "Qual cor está disponível agora?", answer: "Apenas preta." },
      { question: "Existe quantidade mínima?", answer: "Não. A linha atual não aplica quantidade mínima." },
      { question: "Qual o limite de medida?", answer: "Medidas até 150 x 150 mm são tratadas como vendáveis." }
    ],
    variants: [variantFromFormat("sapata-base-lisa", "quadrada", { leadTimeDays: 5 })]
  },
  {
    slug: "sapata-com-parafuso-redonda",
    name: "Sapata com parafuso redonda",
    eyebrow: "Fixação mecânica central",
    seoTitle: "Sapata redonda com parafuso sob medida | Baseforma",
    seoDescription:
      "Sapata redonda em TPU, sob medida, com furo central técnico para fixação por parafuso.",
    keyword: "sapata redonda com parafuso",
    tagline: "Apoio redondo sob medida com fixação mecânica central e parafuso oculto do piso.",
    heroTitle: "Sapata redonda com parafuso, configurável de 12 a 150 mm.",
    heroDescription:
      "Configure diâmetro, altura e cor. O furo passante de 3 mm e o escareamento inferior de 6 mm são fixos; o parafuso não está incluso.",
    url: "/familias/sapata-com-parafuso-redonda",
    priceFromBrl: 0.3,
    leadTimeDays: 4,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preta", "Areia", "Terracota", "Verde mineral"],
    applications: ["cadeiras", "mesas", "poltronas", "pés redondos de madeira"],
    fixation: "parafuso central",
    compatibilitySummary: "Diâmetro de 12 a 150 mm e altura de 1 a 10 mm.",
    parameterSummary: ["redonda", "furo Ø3 mm", "quatro cores"],
    highlights: ["fixação mecânica", "modelo paramétrico", "sem quantidade mínima"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Pés redondos e bases circulares que precisam de fixação mais firme do que um apoio apenas colado.",
    asideTitle: "Geometria técnica validada",
    asideDescription:
      "A peça tem furo passante central de 3 mm e escareamento inferior de 6 mm para alojar a cabeça do parafuso.",
    faqs: [
      { question: "O parafuso acompanha a sapata?", answer: "Não. Escolha o parafuso adequado ao material e à profundidade do pé." },
      { question: "Posso alterar o diâmetro do furo?", answer: "Não. O furo técnico é fixo em 3 mm." },
      { question: "Qual é a menor medida?", answer: "O diâmetro mínimo é 12 mm para preservar material ao redor do escareamento." }
    ],
    variants: [variantFromFormat("sapata-com-parafuso", "redonda", { leadTimeDays: 4 })]
  },
  {
    slug: "sapata-com-parafuso-quadrada",
    name: "Sapata com parafuso quadrada",
    eyebrow: "Fixação mecânica central",
    seoTitle: "Sapata quadrada com parafuso sob medida | Baseforma",
    seoDescription:
      "Sapata quadrada em TPU, sob medida, com furo central técnico para fixação por parafuso.",
    keyword: "sapata quadrada com parafuso",
    tagline: "Apoio quadrado sob medida com fixação mecânica central e parafuso oculto do piso.",
    heroTitle: "Sapata quadrada com parafuso, configurável de 12 a 150 mm.",
    heroDescription:
      "Configure os dois lados, a altura e a cor. O furo passante de 3 mm e o escareamento inferior de 6 mm são fixos; o parafuso não está incluso.",
    url: "/familias/sapata-com-parafuso-quadrada",
    priceFromBrl: 0.3,
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preta", "Areia", "Terracota", "Verde mineral"],
    applications: ["cadeiras", "mesas", "banquinhos", "pés quadrados de madeira"],
    fixation: "parafuso central",
    compatibilitySummary: "Lados de 12 a 150 mm e altura de 1 a 10 mm.",
    parameterSummary: ["quadrada", "furo Ø3 mm", "quatro cores"],
    highlights: ["fixação mecânica", "modelo paramétrico", "sem quantidade mínima"],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Pés quadrados e bases planas que precisam de fixação mais firme do que um apoio apenas colado.",
    asideTitle: "Geometria técnica validada",
    asideDescription:
      "A peça tem furo passante central de 3 mm e escareamento inferior de 6 mm para alojar a cabeça do parafuso.",
    faqs: [
      { question: "O parafuso acompanha a sapata?", answer: "Não. Escolha o parafuso adequado ao material e à profundidade do pé." },
      { question: "Posso alterar o diâmetro do furo?", answer: "Não. O furo técnico é fixo em 3 mm." },
      { question: "Qual é a menor medida?", answer: "Cada lado deve ter pelo menos 12 mm para preservar material ao redor do escareamento." }
    ],
    variants: [variantFromFormat("sapata-com-parafuso", "quadrada", { leadTimeDays: 5 })]
  }
].map(withFamilyImages);

export function getFamilyBySlug(slug) {
  return families.find((family) => family.slug === slug);
}

export function getRelatedFamilies(slug) {
  return families.filter((family) => family.slug !== slug);
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
