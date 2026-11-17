import {
  getInitialValues,
  productCategories,
  validateConfiguration
} from "./client-configurator-data.js";
import { calculateClientPricePreview, getClientPricingModel } from "./client-pricing-preview.js";
import { getFamilyGallery } from "./product-visuals.js";
import { productManifests } from "./product-registry.js";
import { manifestFamilyCopy } from "./family-content.js";

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
    "Ponteiras internas para tubo e sapatas para pés de móveis, feitas sob medida em TPU, sem pedido mínimo, com produção sob demanda e projetos especiais.",
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
  { href: "/guias", label: "Guias" },
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
  const compatible = first
    ? `${formatMeasure(first.min)} a ${formatMeasure(first.max)} ${first.unit}`
    : "sob consulta";

  const defaultPrice = format
    ? calculateClientPricePreview(format, getInitialValues(format), 1).totalPriceBrl
    : 29;

  return {
    sku: `${format?.skuPrefix || "BF-CUSTOM"}-CUSTOM-PRE`,
    label: overrides.label || `${format?.summaryName || format?.name || "Peça"}, cor padrão preta`,
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

function formatMeasure(value) {
  return String(value).replace(".", ",");
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
    name: "Ponteira interna para tubo redondo",
    eyebrow: "Ponteira para tubo redondo",
    seoTitle: "Ponteira interna para tubo redondo sob medida",
    seoDescription:
      "Ponteira interna para pé de cadeira e mesa tubular: 5/8\", 3/4\", 7/8\", 1\" ou qualquer diâmetro, ajustada à parede do tubo. TPU, sem pedido mínimo.",
    keyword: "ponteira para tubo redondo",
    productCategory: "Ponteira para tubo",
    tagline:
      "Ponteira interna (sapata) para pé de cadeira, mesa e banqueta tubular, feita pelo diâmetro externo e pela parede do tubo.",
    heroTitle: "Ponteira interna para tubo redondo",
    heroDescription:
      "Ponteira interna (também chamada de sapata para tubo) feita pelo diâmetro externo e pela parede do seu tubo, até 150 mm. Em TPU preto, branco, cinza ou marrom, a partir de 1 unidade.",
    url: "/familias/sapata-tubo-redondo",
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["cadeiras tubulares", "mesas", "banquetas", "reposição"],
    fixation: "encaixe interno por pressão",
    compatibilitySummary: "Diâmetro externo até 150 mm; parede de 0,8 a 8 mm.",
    parameterSummary: ["tubo redondo", "diâmetro até 150 mm", "parede de 0,8 a 8 mm"],
    highlights: ["feita pela medida externa e pela parede", "sem pedido mínimo", "4 cores"],
    fitTitle: "Onde usar",
    fitDescription:
      "Pés de cadeira de ferro e de cadeira tubular, mesas, banquetas e estruturas de tubo redondo com a ponta aberta, inclusive reposição de ponteiras que soltaram ou quebraram.",
    asideTitle: "Configure pela medida do seu tubo",
    asideDescription:
      "Informe o diâmetro externo e a parede do tubo, escolha a cor e veja preço e prazo na hora.",
    faqs: [
      {
        question: "Qual ponteira serve em tubo 7/8 ou 3/4?",
        answer:
          "Tubo 7/8\" tem cerca de 22,2 mm de diâmetro externo e tubo 3/4\", cerca de 19,05 mm. Como a parede varia de um tubo para outro, meça o seu com paquímetro e informe o diâmetro externo e a parede no configurador: a ponteira sai para essas medidas."
      },
      {
        question: "Meço o diâmetro interno ou externo do tubo?",
        answer:
          "O externo, mais a espessura da parede. O configurador calcula o vão interno a partir dessas duas medidas e exige pelo menos 5 mm de vão."
      },
      {
        question: "Por que a ponteira comprada pronta fica solta ou não entra?",
        answer:
          "A ponteira de prateleira é feita para uma parede padrão. Com parede mais fina, o vão interno fica maior e ela folga; com parede mais grossa ou rebarba de solda, ela não entra. Aqui a parede faz parte da medida."
      },
      {
        question: "Serve para cadeira de ferro antiga ou cadeira de bar?",
        answer:
          "Serve em qualquer pé de tubo redondo com a ponta aberta. Em cadeiras antigas, a medida real costuma fugir da nominal, então meça o tubo do seu móvel."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer:
          "Preto, branco, cinza e marrom. A cor padrão é preta e não há quantidade mínima: você pode pedir a partir de 1 unidade."
      }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "redondo", { leadTimeDays: 5 })]
  },
  {
    slug: "sapata-tubo-quadrado",
    name: "Ponteira interna para metalon",
    eyebrow: "Ponteira para tubo quadrado e retangular",
    seoTitle: "Ponteira para metalon e tubo quadrado sob medida",
    seoDescription:
      "Ponteira interna para metalon 20x20, 30x30, 50x30, 40x40 ou qualquer medida até 150 mm, quadrado ou retangular, ajustada à parede. TPU, a partir de 1 un.",
    keyword: "ponteira para metalon",
    productCategory: "Ponteira para tubo",
    tagline:
      "Ponteira interna (sapata ou tampa para metalon) para tubo quadrado e retangular, feita pelas medidas externas e pela parede.",
    heroTitle: "Ponteira interna para metalon quadrado e retangular",
    heroDescription:
      "Ponteira interna (também chamada de tampa ou sapata para metalon) feita pela largura, pela altura e pela parede do seu tubo, até 150 mm por lado. Em TPU preto, branco, cinza ou marrom, a partir de 1 unidade.",
    url: "/familias/sapata-tubo-quadrado",
    leadTimeDays: 6,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["mesas de metalon", "bancadas", "estantes", "serralheria"],
    fixation: "encaixe interno por pressão",
    compatibilitySummary: "Largura e altura até 150 mm; parede de 0,8 a 8 mm.",
    parameterSummary: ["metalon quadrado ou retangular", "até 150 mm por lado", "parede de 0,8 a 8 mm"],
    highlights: ["feita pela medida externa e pela parede", "sem pedido mínimo", "4 cores"],
    fitTitle: "Onde usar",
    fitDescription:
      "Pés de mesa e de bancada de metalon, banquetas, aparadores, racks, estantes e estruturas de serralheria com tubo quadrado ou retangular de ponta aberta.",
    asideTitle: "Configure pela medida do seu metalon",
    asideDescription:
      "Informe largura, altura e parede do tubo, escolha a cor e veja preço e prazo na hora.",
    faqs: [
      {
        question: "A ponteira para metalon 20x20 serve em chapa 18 e chapa 20?",
        answer:
          "Uma ponteira pronta é feita para uma parede só. Aqui você informa a parede do seu tubo e a peça sai para ela: chapa 20 (cerca de 0,90 mm) e chapa 18 (cerca de 1,20 mm) geram ponteiras diferentes para o mesmo 20x20."
      },
      {
        question: "Vocês fazem ponteira para metalon retangular, como 50x30 ou 100x50?",
        answer:
          "Sim. Largura e altura são informadas separadamente, até 150 mm cada, desde que sobrem pelo menos 5 mm de vão interno depois de descontar a parede."
      },
      {
        question: "Qual a diferença entre ponteira, tampa e sapata para metalon?",
        answer:
          "No mercado os três nomes costumam indicar a mesma peça: um fechamento que entra na ponta do tubo e apoia no piso. Aqui ela se chama ponteira interna."
      },
      {
        question: "A ponteira aguenta mesa pesada ou bancada?",
        answer:
          "Ela é pensada para móveis de uso comum, como mesas, bancos e estantes. Para bancadas muito pesadas, cargas concentradas ou uso industrial, descreva a aplicação em um projeto especial antes de comprar."
      },
      {
        question: "Existe quantidade mínima?",
        answer:
          "Não. Você pode pedir a partir de 1 unidade. Pedidos com mais de 24 peças do mesmo item somam 2 dias úteis ao prazo de produção."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer:
          "Preto, branco, cinza e marrom. A cor padrão é preta."
      }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "quadrado", { leadTimeDays: 6 })]
  },
  {
    slug: "sapata-tubo-oblongo",
    name: "Ponteira interna para tubo oblongo",
    eyebrow: "Ponteira para tubo oblongo (oval)",
    seoTitle: "Ponteira para tubo oblongo e oval sob medida",
    seoDescription:
      "Ponteira oblonga para tubo 16x30, 20x47, 29x58 ou a medida exata do seu perfil oval. Ideal para reposição em cadeira importada. TPU, sem pedido mínimo.",
    keyword: "ponteira para tubo oblongo",
    productCategory: "Ponteira para tubo",
    tagline:
      "Ponteira interna para perfis oblongos e ovais, feita pela largura, pela altura e pela parede do tubo.",
    heroTitle: "Ponteira interna para tubo oblongo (oval)",
    heroDescription:
      "Ponteira interna (sapata) para perfis oblongos e ovais que não se acham em medida pronta. Feita pela largura, pela altura e pela parede do seu tubo, até 150 mm em cada sentido, em TPU e a partir de 1 unidade.",
    url: "/familias/sapata-tubo-oblongo",
    leadTimeDays: 8,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["cadeiras", "móveis importados", "reposição", "serralheria"],
    fixation: "encaixe interno por pressão",
    compatibilitySummary: "Largura e altura até 150 mm; parede de 0,8 a 8 mm.",
    parameterSummary: ["tubo oblongo ou oval", "até 150 mm em cada sentido", "parede de 0,8 a 8 mm"],
    highlights: ["medidas fora do padrão", "sem pedido mínimo", "4 cores"],
    fitTitle: "Onde usar",
    fitDescription:
      "Cadeiras e mesas com pés de tubo oblongo ou oval, móveis importados e reposição de ponteiras que saíram de linha.",
    asideTitle: "Configure pela medida do seu perfil",
    asideDescription:
      "Informe largura, altura e parede do tubo, escolha a cor e veja preço e prazo na hora.",
    faqs: [
      {
        question: "Como medir tubo oblongo ou oval?",
        answer:
          "Com paquímetro, meça a largura (a maior medida), a altura (a menor) e a espessura da parede na ponta aberta do tubo."
      },
      {
        question: "Vocês fazem ponteira oblonga 16x30? E outras medidas?",
        answer:
          "Sim. 16x30 é a mais comum, mas qualquer combinação até 150 mm em cada sentido pode ser configurada, desde que sobrem pelo menos 5 mm de vão interno."
      },
      {
        question: "Serve para cadeira de escritório fixa ou cadeira importada?",
        answer:
          "Serve em qualquer pé de tubo oblongo com a ponta aberta. Cadeiras importadas costumam usar medidas fora do padrão nacional, por isso meça o tubo em vez de se guiar pelo modelo da cadeira."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer:
          "Preto, branco, cinza e marrom. A cor padrão é preta e não há quantidade mínima: você pode pedir a partir de 1 unidade."
      }
    ],
    variants: [variantFromFormat("ponteira-interna-tubo", "oblongo", { leadTimeDays: 8 })]
  },
  {
    slug: "sapata-lisa-redonda",
    name: "Sapata lisa redonda",
    eyebrow: "Sapata para pé de móvel",
    seoTitle: "Sapata redonda para pé de móvel sob medida",
    seoDescription:
      "Sapata lisa redonda para pé de sofá, poltrona, mesa e banqueta, de 3 a 150 mm de diâmetro, com ou sem pino de encaixe. TPU em 4 cores.",
    keyword: "sapata redonda para móveis",
    productCategory: "Sapata para móveis",
    tagline:
      "Apoio plano redondo para pés de móveis, com ou sem pino de encaixe.",
    heroTitle: "Sapata lisa redonda para pé de móvel",
    heroDescription:
      "Apoio plano que fica embaixo do pé e evita o contato direto com o piso. De 3 a 150 mm de diâmetro, com ou sem pino de encaixe, em TPU preto, branco, cinza ou marrom e sem quantidade mínima.",
    url: "/familias/sapata-lisa-redonda",
    leadTimeDays: 4,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["sofás", "poltronas", "mesas", "bases circulares"],
    fixation: "apoio plano (colada ou com pino)",
    compatibilitySummary: "Diâmetro de 3 a 150 mm; altura de 1 a 10 mm.",
    parameterSummary: ["redonda", "de 3 a 150 mm", "com ou sem pino"],
    highlights: ["com ou sem pino de encaixe", "sem pedido mínimo", "4 cores"],
    fitTitle: "Onde usar",
    fitDescription:
      "Pés redondos de sofá, poltrona, mesa, banqueta e rack, e bases circulares de madeira ou metal com face plana de apoio.",
    asideTitle: "Configure pela medida do pé",
    asideDescription:
      "Informe o diâmetro da face de apoio, a altura e, se quiser, o pino. Preço e prazo aparecem na hora.",
    faqs: [
      {
        question: "Qual a diferença entre sapata com e sem pino?",
        answer:
          "Sem pino, a sapata é uma base plana para ser colada sob o pé. Com pino, ela tem uma haste central de 3 a 15 mm de diâmetro que entra num furo do pé e ajuda a mantê-la no lugar."
      },
      {
        question: "Como fixar a sapata lisa?",
        answer:
          "Sem pino, cole a sapata no pé com um adesivo indicado para TPU e para o material do pé. Com pino, encaixe a haste no furo do pé. Se o pé aceitar parafuso, veja também a sapata com parafuso."
      },
      {
        question: "Serve em pé de sofá, poltrona ou estante?",
        answer:
          "Sim, desde que o pé tenha uma face plana de apoio. Informe o diâmetro dessa face no configurador."
      },
      {
        question: "A sapata nivela o móvel?",
        answer:
          "Não. A altura da base é fixa, de 1 a 10 mm. Para compensar piso irregular, o indicado é um pé nivelador com rosca, que não faz parte do catálogo."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer:
          "Preto, branco, cinza e marrom. A cor padrão é preta e não há quantidade mínima: você pode pedir a partir de 1 unidade."
      }
    ],
    variants: [variantFromFormat("sapata-base-lisa", "redonda", { leadTimeDays: 4 })]
  },
  {
    slug: "sapata-lisa-quadrada",
    name: "Sapata lisa quadrada",
    eyebrow: "Sapata para pé de móvel",
    seoTitle: "Sapata quadrada para pé de móvel sob medida",
    seoDescription:
      "Sapata lisa quadrada ou retangular para pé de mesa, banqueta, estante e base metálica, de 3 a 150 mm por lado, com ou sem pino. TPU em 4 cores.",
    keyword: "sapata quadrada para móveis",
    productCategory: "Sapata para móveis",
    tagline:
      "Apoio plano quadrado ou retangular para pés de móveis, com ou sem pino de encaixe.",
    heroTitle: "Sapata lisa quadrada ou retangular para pé de móvel",
    heroDescription:
      "Apoio plano que fica embaixo do pé e evita o contato direto com o piso. De 3 a 150 mm por lado, quadrada ou retangular, com ou sem pino de encaixe, em TPU preto, branco, cinza ou marrom.",
    url: "/familias/sapata-lisa-quadrada",
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["mesas", "banquetas", "estantes", "bases metálicas"],
    fixation: "apoio plano (colada ou com pino)",
    compatibilitySummary: "Lados de 3 a 150 mm; altura de 1 a 10 mm.",
    parameterSummary: ["quadrada ou retangular", "de 3 a 150 mm por lado", "com ou sem pino"],
    highlights: ["com ou sem pino de encaixe", "sem pedido mínimo", "4 cores"],
    fitTitle: "Onde usar",
    fitDescription:
      "Pés quadrados ou retangulares de mesa, banqueta, estante e rack, chapas metálicas e bases de madeira com face plana de apoio.",
    asideTitle: "Configure pela medida do pé",
    asideDescription:
      "Informe os dois lados da face de apoio, a altura e, se quiser, o pino. Preço e prazo aparecem na hora.",
    faqs: [
      {
        question: "Qual a diferença entre sapata com e sem pino?",
        answer:
          "Sem pino, a sapata é uma base plana para ser colada sob o pé. Com pino, ela tem uma haste central de 3 a 15 mm de diâmetro que entra num furo do pé e ajuda a mantê-la no lugar."
      },
      {
        question: "A sapata pode ser retangular?",
        answer:
          "Sim. Os dois lados são configurados separadamente, de 3 a 150 mm cada."
      },
      {
        question: "Serve em pé de mesa, estante ou base de chapa?",
        answer:
          "Sim, desde que o pé tenha uma face plana de apoio. Se o pé for um metalon de ponta aberta, prefira a ponteira interna para metalon."
      },
      {
        question: "A sapata nivela o móvel?",
        answer:
          "Não. A altura da base é fixa, de 1 a 10 mm. Para compensar piso irregular, o indicado é um pé nivelador com rosca, que não faz parte do catálogo."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer:
          "Preto, branco, cinza e marrom. A cor padrão é preta e não há quantidade mínima: você pode pedir a partir de 1 unidade."
      }
    ],
    variants: [variantFromFormat("sapata-base-lisa", "quadrada", { leadTimeDays: 5 })]
  },
  {
    slug: "sapata-com-parafuso-redonda",
    name: "Sapata redonda com parafuso",
    eyebrow: "Sapata com furo escareado",
    seoTitle: "Sapata redonda com parafuso para pé de móvel",
    seoDescription:
      "Sapata redonda com furo escareado para parafuso, para pé de cadeira, mesa e poltrona de madeira ou metal. Diâmetro de 12 a 150 mm. Parafuso não incluso.",
    keyword: "sapata redonda com parafuso",
    productCategory: "Sapata para móveis",
    tagline:
      "Sapata redonda presa por parafuso central, com a cabeça embutida longe do piso.",
    heroTitle: "Sapata redonda com parafuso para pé de madeira",
    heroDescription:
      "Configure diâmetro, altura, cor e parafuso de 2 a 10 mm. O escareamento na face de baixo tem o dobro do diâmetro do parafuso, para a cabeça ficar embutida. O parafuso não está incluso.",
    url: "/familias/sapata-com-parafuso-redonda",
    leadTimeDays: 4,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["cadeiras", "mesas", "poltronas", "pés redondos de madeira"],
    fixation: "parafuso central",
    compatibilitySummary: "Diâmetro de 12 a 150 mm e altura de 1 a 10 mm.",
    parameterSummary: ["redonda", "de 12 a 150 mm", "parafuso de 2 a 10 mm"],
    highlights: ["fixação por parafuso", "cabeça embutida no escareamento", "sem pedido mínimo"],
    fitTitle: "Onde usar",
    fitDescription:
      "Pés redondos de madeira de cadeira, mesa, banco e poltrona, e pés de metal que aceitem parafuso no centro da face de apoio.",
    asideTitle: "Configure pela medida do pé",
    asideDescription:
      "Informe o diâmetro do pé, a altura e o diâmetro do parafuso. Preço e prazo aparecem na hora.",
    faqs: [
      {
        question: "O parafuso vem junto com a sapata?",
        answer:
          "Não. Escolha um parafuso adequado ao material e à profundidade do pé, com a cabeça cabendo no escareamento, que tem o dobro do diâmetro do parafuso."
      },
      {
        question: "Qual parafuso usar?",
        answer:
          "Em pé de madeira, parafuso para madeira; em pé de metal, um parafuso compatível com o furo do pé. O diâmetro configurável vai de 2 a 10 mm, e o configurador confere se sobra parede suficiente na sapata."
      },
      {
        question: "Serve em pé de madeira e de metal?",
        answer:
          "Sim, desde que o pé aceite um parafuso no centro da face de apoio."
      },
      {
        question: "Qual é a menor medida?",
        answer:
          "O diâmetro mínimo é 12 mm, para preservar material ao redor do escareamento."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer:
          "Preto, branco, cinza e marrom. A cor padrão é preta e não há quantidade mínima: você pode pedir a partir de 1 unidade."
      }
    ],
    variants: [variantFromFormat("sapata-com-parafuso", "redonda", { leadTimeDays: 4 })]
  },
  {
    slug: "sapata-com-parafuso-quadrada",
    name: "Sapata quadrada com parafuso",
    eyebrow: "Sapata com furo escareado",
    seoTitle: "Sapata quadrada com parafuso para pé de móvel",
    seoDescription:
      "Sapata quadrada ou retangular com furo central para parafuso, para pés de madeira ou metal de mesa, cadeira e poltrona. 12 a 150 mm. Parafuso não incluso.",
    keyword: "sapata quadrada com parafuso",
    productCategory: "Sapata para móveis",
    tagline:
      "Sapata quadrada ou retangular presa por parafuso central, com a cabeça embutida longe do piso.",
    heroTitle: "Sapata quadrada com parafuso para pé de madeira",
    heroDescription:
      "Configure os dois lados, a altura, a cor e o parafuso de 2 a 10 mm. O escareamento na face de baixo tem o dobro do diâmetro do parafuso, para a cabeça ficar embutida. O parafuso não está incluso.",
    url: "/familias/sapata-com-parafuso-quadrada",
    leadTimeDays: 5,
    salesUnit: "unidade",
    defaultMaterial: "TPU",
    availableColors: ["Preto", "Branco", "Cinza", "Marrom"],
    applications: ["cadeiras", "mesas", "banquetas", "pés quadrados de madeira"],
    fixation: "parafuso central",
    compatibilitySummary: "Lados de 12 a 150 mm e altura de 1 a 10 mm.",
    parameterSummary: ["quadrada ou retangular", "de 12 a 150 mm por lado", "parafuso de 2 a 10 mm"],
    highlights: ["fixação por parafuso", "cabeça embutida no escareamento", "sem pedido mínimo"],
    fitTitle: "Onde usar",
    fitDescription:
      "Pés quadrados ou retangulares de madeira em mesas, cadeiras, bancos e poltronas, e pés de metal que aceitem parafuso no centro da face de apoio.",
    asideTitle: "Configure pela medida do pé",
    asideDescription:
      "Informe os dois lados do pé, a altura e o diâmetro do parafuso. Preço e prazo aparecem na hora.",
    faqs: [
      {
        question: "O parafuso vem junto com a sapata?",
        answer:
          "Não. Escolha um parafuso adequado ao material e à profundidade do pé, com a cabeça cabendo no escareamento, que tem o dobro do diâmetro do parafuso."
      },
      {
        question: "Qual parafuso usar?",
        answer:
          "Em pé de madeira, parafuso para madeira; em pé de metal, um parafuso compatível com o furo do pé. O diâmetro configurável vai de 2 a 10 mm, e o configurador confere se sobra parede suficiente na sapata."
      },
      {
        question: "A sapata pode ser retangular?",
        answer:
          "Sim. Os dois lados são configurados separadamente, de 12 a 150 mm cada."
      },
      {
        question: "Qual é a menor medida?",
        answer:
          "Cada lado deve ter pelo menos 12 mm, para preservar material ao redor do escareamento."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer:
          "Preto, branco, cinza e marrom. A cor padrão é preta e não há quantidade mínima: você pode pedir a partir de 1 unidade."
      }
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
    asideTitle: "Configure pela sua medida",
    asideDescription: "Informe as medidas e veja preço e prazo na hora.",
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
    variants: [variantFromFormat(product.category.slug, product.category.formatSlug)],
    ...manifestFamilyCopy[product.seo.familySlug]
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
