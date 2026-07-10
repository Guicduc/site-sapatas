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

export const homeStats = [
  {
    value: "3 famílias iniciais",
    label: "para validar busca, especificação e recompra"
  },
  {
    value: "100% sob demanda",
    label: "sem estoque pesado de produto acabado"
  },
  {
    value: "SKU por variante",
    label: "para recompra previsível em séries curtas"
  },
  {
    value: "Fluxo premium",
    label: "quando o projeto sai da matriz pública"
  }
];

export const marketPainPoints = [
  {
    index: "01",
    title: "Medidas raramente fecham",
    description:
      "Fabricantes e especificadores perdem tempo procurando sapatas que encaixem no pé certo sem recorrer a gambiarra."
  },
  {
    index: "02",
    title: "O componente parece genérico",
    description:
      "Mesmo quando a função é resolvida, a peça costuma destoar do desenho do móvel e empobrecer a leitura final."
  },
  {
    index: "03",
    title: "Acabamento ainda é tratado como detalhe",
    description:
      "Cor, textura e proporção quase nunca entram como parte real da decisão, apesar de definirem a percepção do conjunto."
  }
];

export const capabilityHighlights = [
  "ajuste rápido de envelope dimensional",
  "publicação controlada de presets validados",
  "entrada natural para projeto especial sem quebrar o funil"
];

export const workflowSteps = [
  {
    number: "1",
    title: "Família paramétrica",
    description:
      "A geometria-base nasce com regras comerciais, limites dimensionais e presets defensáveis."
  },
  {
    number: "2",
    title: "Variantes públicas",
    description:
      "As combinações aprovadas recebem SKU, preço, lead time e faixa de compatibilidade."
  },
  {
    number: "3",
    title: "Projeto especial",
    description:
      "Qualquer demanda fora da matriz segue para briefing, avaliação e desenvolvimento com contexto técnico."
  }
];

export const testimonials = [
  {
    quote:
      "A maior dor era achar ponteira com a medida certa sem matar a leitura do pé metálico. O modelo paramétrico mudou a conversa.",
    author: "Especificador de mobiliário corporativo"
  },
  {
    quote:
      "Para séries pequenas, desenvolver uma sapata bonita no processo tradicional raramente fecha. Aqui passa a fechar.",
    author: "Designer de produto"
  },
  {
    quote:
      "Recompra por SKU e tabela pública reduzem atrito com fábrica, compras e cliente final.",
    author: "Marcenaria com linha sob encomenda"
  }
];

export const faqSections = [
  {
    title: "Compatibilidade",
    items: [
      {
        question: "Como escolho a família certa?",
        answer:
          "Comece pela aplicação e pelo tipo de pé ou tubo. Cada família publica a regra de compatibilidade e o tipo de fixação aprovado."
      },
      {
        question: "Posso usar uma variante fora da faixa indicada?",
        answer:
          "Não é o recomendado. Situações fora da faixa validada devem seguir para projeto especial."
      },
      {
        question: "Vocês desenvolvem medidas não catalogadas?",
        answer:
          "Sim. O modelo foi desenhado para isso, mas o fluxo acontece como projeto especial."
      }
    ]
  },
  {
    title: "Preço e prazo",
    items: [
      {
        question: "As variantes padrão têm preço público?",
        answer:
          "Sim. O catálogo mostra preço público para combinações aprovadas e o respectivo lead time."
      },
      {
        question: "Existe lote mínimo?",
        answer:
          "Não. A linha atual não aplica quantidade mínima; quantidades maiores podem melhorar preço unitário e prazo operacional."
      },
      {
        question: "Projeto especial leva mais tempo?",
        answer:
          "Sim. Além do prazo produtivo, ele absorve desenvolvimento, prototipagem e validação."
      }
    ]
  },
  {
    title: "Material e acabamento",
    items: [
      {
        question: "TPU serve para qualquer aplicação?",
        answer:
          "Não. TPU é o ponto de partida do catálogo, mas cada família precisa ser validada pelo tipo de uso, carga e contato com o piso."
      },
      {
        question: "Posso pedir outra cor?",
        answer:
          "Sim. A linha padrão declara as cores disponíveis e cores fora do giro podem seguir como pedido especial."
      },
      {
        question: "Como funciona a recompra?",
        answer:
          "Cada variante ativa recebe SKU. Isso facilita repetição de pedido, manutenção e séries futuras."
      }
    ]
  }
];

const legacyFamilies = [
  {
    slug: "sapata-tubo-redondo",
    name: "Sapata para tubo redondo",
    eyebrow: "Mais procurada para mobiliário metálico",
    seoTitle: "Sapata para tubo redondo impressa em 3D",
    seoDescription:
      "Linha para tubo redondo com encaixe press-fit, variantes padrão, cores selecionadas e produção sob demanda.",
    keyword: "sapata para tubo redondo",
    tagline:
      "Linha para pés tubulares com leitura limpa e contato mais gentil com o piso.",
    heroTitle:
      "Sapata para tubo redondo com leitura mais limpa para mobiliário metálico.",
    heroDescription:
      "Esta família atende pés tubulares com encaixe press-fit e foco em compatibilidade, acabamento e recompra simples por SKU.",
    url: "/familias/sapata-tubo-redondo",
    priceFromBrl: 115.04,
    leadTimeDays: 5,
    salesUnit: "kit-4",
    defaultMaterial: "TPU",
    availableColors: ["Grafite", "Areia", "Terracota", "Cinza névoa"],
    applications: ["mesas metálicas", "cadeiras", "banquetas", "aparadores"],
    fixation: "press-fit interno",
    compatibilitySummary:
      "Faixas internas validadas para tubos redondos leves e médios.",
    parameterSummary: [
      "diâmetro 20 a 30 mm",
      "altura 8 a 16 mm",
      "compatibilidade 18 a 27 mm"
    ],
    highlights: [
      "evita a leitura genérica de ponteiras comuns",
      "permite compor cor com o móvel",
      "recompra simples por SKU"
    ],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Mesas metálicas, cadeiras, banquetas e aparadores com pé tubular em séries pequenas ou recorrentes. A proposta aqui é substituir a ponteira genérica por uma base visualmente mais coerente com o móvel.",
    asideTitle: "Quando seguir por aqui",
    asideDescription:
      "Se o pé tubular já cai em uma faixa validada, esta família tende a ser o caminho mais rápido.",
    faqs: [
      {
        question: "Posso usar em qualquer tubo redondo?",
        answer:
          "Não. A família publica apenas as faixas internas validadas. Fora disso, siga para projeto especial."
      },
      {
        question: "Funciona bem em linhas autorais?",
        answer:
          "Sim. Esta família nasceu justamente para reduzir a leitura de ponteira genérica em pé metálico aparente."
      },
      {
        question: "Se eu mudar só a cor, preciso de novo desenvolvimento?",
        answer:
          "Nem sempre. Cores de linha podem seguir direto para produção. Cores especiais dependem de giro e disponibilidade."
      }
    ],
    variants: [
      {
        sku: "BF-RD-PF-2008-GRA",
        label: "20 x 8 mm grafite",
        dimensions: {
          baseMm: 20,
          heightMm: 8,
          compatibleRangeMm: "18-19"
        },
        color: "Grafite",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 115.04,
        leadTimeDays: 5,
        technicalFile: "stl/aprovados/BF-RD-PF-2008-GRA.stl"
      },
      {
        sku: "BF-RD-PF-2512-ARE",
        label: "25 x 12 mm areia",
        dimensions: {
          baseMm: 25,
          heightMm: 12,
          compatibleRangeMm: "22-23"
        },
        color: "Areia",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 160.24,
        leadTimeDays: 6,
        technicalFile: "stl/aprovados/BF-RD-PF-2512-ARE.stl"
      },
      {
        sku: "BF-RD-PF-2512-GRA",
        label: "25 x 12 mm grafite",
        dimensions: {
          baseMm: 25,
          heightMm: 12,
          compatibleRangeMm: "22-23"
        },
        color: "Grafite",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 160.24,
        leadTimeDays: 6,
        technicalFile: "stl/aprovados/BF-RD-PF-2512-GRA.stl"
      },
      {
        sku: "BF-RD-PF-3016-TER",
        label: "30 x 16 mm terracota",
        dimensions: {
          baseMm: 30,
          heightMm: 16,
          compatibleRangeMm: "26-27"
        },
        color: "Terracota",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 234.92,
        leadTimeDays: 7,
        technicalFile: "stl/aprovados/BF-RD-PF-3016-TER.stl"
      }
    ]
  },
  {
    slug: "sapata-tubo-quadrado",
    name: "Sapata para tubo quadrado",
    eyebrow: "Indicada para serralherias e linhas autorais",
    seoTitle: "Sapata para tubo quadrado sob medida",
    seoDescription:
      "Linha parametrizada para mobiliário metálico com encaixe validado, matriz pública de variantes e visual mais limpo.",
    keyword: "sapata para tubo quadrado",
    tagline:
      "Encaixe limpo para estruturas retas com maior previsibilidade de assentamento.",
    heroTitle:
      "Sapata para tubo quadrado pensada para serralheria, mobiliário reto e séries pequenas.",
    heroDescription:
      "Essa linha resolve o caso em que o pé quadrado pede leitura mais precisa, encaixe previsível e mais liberdade cromática do que ponteiras convencionais.",
    url: "/familias/sapata-tubo-quadrado",
    priceFromBrl: 177.56,
    leadTimeDays: 6,
    salesUnit: "kit-4",
    defaultMaterial: "TPU",
    availableColors: ["Grafite", "Areia", "Verde mineral", "Cinza névoa"],
    applications: [
      "mesas metálicas",
      "buffets",
      "aparadores",
      "móveis autorais"
    ],
    fixation: "press-fit interno",
    compatibilitySummary:
      "Faixas validadas para tubos quadrados leves e médios com canto controlado.",
    parameterSummary: [
      "base 22 a 32 mm",
      "altura 10 a 18 mm",
      "compatibilidade 20 x 20 a 30 x 30 mm"
    ],
    highlights: [
      "encaixe visualmente mais elegante do que ponteiras padrão",
      "bom para séries curtas",
      "permite alinhar cor ao desenho da estrutura"
    ],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Buffets, aparadores, mesas e peças autorais com estruturas metálicas retas. Também faz sentido quando a geometria do pé pede um componente menos doméstico e mais integrado ao desenho.",
    asideTitle: "Boa família para série curta premium",
    asideDescription:
      "Quando o móvel depende da pureza da linha do tubo quadrado, vale evitar a ponteira genérica e migrar para uma matriz própria de variantes.",
    faqs: [
      {
        question: "Resolve qualquer tubo quadrado?",
        answer:
          "Não. A página existe justamente para limitar o uso a faixas que já foram aprovadas tecnicamente."
      },
      {
        question: "Serve para linha sob encomenda?",
        answer:
          "Sim. Esta família foi pensada para séries pequenas e recompra controlada por SKU."
      },
      {
        question: "Quando vira projeto especial?",
        answer:
          "Quando a seção do tubo, a altura, a linguagem visual ou a regra de fixação escapam da matriz pública."
      }
    ],
    variants: [
      {
        sku: "BF-QD-PF-2210-GRA",
        label: "22 x 22 x 10 mm grafite",
        dimensions: {
          baseMm: 22,
          heightMm: 10,
          compatibleRangeMm: "20 x 20"
        },
        color: "Grafite",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 177.56,
        leadTimeDays: 6,
        technicalFile: "stl/aprovados/BF-QD-PF-2210-GRA.stl"
      },
      {
        sku: "BF-QD-PF-2612-ARE",
        label: "26 x 26 x 12 mm areia",
        dimensions: {
          baseMm: 26,
          heightMm: 12,
          compatibleRangeMm: "24 x 24"
        },
        color: "Areia",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 239.04,
        leadTimeDays: 6,
        technicalFile: "stl/aprovados/BF-QD-PF-2612-ARE.stl"
      },
      {
        sku: "BF-QD-PF-2612-GRA",
        label: "26 x 26 x 12 mm grafite",
        dimensions: {
          baseMm: 26,
          heightMm: 12,
          compatibleRangeMm: "24 x 24"
        },
        color: "Grafite",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 239.04,
        leadTimeDays: 6,
        technicalFile: "stl/aprovados/BF-QD-PF-2612-GRA.stl"
      },
      {
        sku: "BF-QD-PF-3218-VMN",
        label: "32 x 32 x 18 mm verde mineral",
        dimensions: {
          baseMm: 32,
          heightMm: 18,
          compatibleRangeMm: "30 x 30"
        },
        color: "Verde mineral",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 423.32,
        leadTimeDays: 7,
        technicalFile: "stl/aprovados/BF-QD-PF-3218-VMN.stl"
      }
    ]
  },
  {
    slug: "sapata-plana-deslizante",
    name: "Sapata plana deslizante",
    eyebrow: "Boa para retrofit e pequenas séries",
    seoTitle: "Sapata deslizante para móveis",
    seoDescription:
      "Apoio plano em TPU com fixação adesiva técnica para bases retas, retrofit e pequenas séries de mobiliário.",
    keyword: "sapata deslizante para móveis",
    tagline:
      "Base adesiva para pés retos, tampos e suportes que pedem contato discreto com o piso.",
    heroTitle:
      "Sapata plana deslizante para bases retas, retrofit e detalhes discretos.",
    heroDescription:
      "Essa família usa fixação adesiva técnica e atende casos em que a base do móvel pede baixo perfil, instalação simples e leitura visual mais silenciosa.",
    url: "/familias/sapata-plana-deslizante",
    priceFromBrl: 76.76,
    leadTimeDays: 4,
    salesUnit: "kit-4",
    defaultMaterial: "TPU",
    availableColors: ["Grafite", "Areia", "Terracota", "Azul petróleo"],
    applications: [
      "aparadores",
      "buffets",
      "mesas metálicas",
      "móveis autorais"
    ],
    fixation: "adesivo técnico",
    compatibilitySummary:
      "Indicada para bases planas e superfícies de apoio com boa área de contato.",
    parameterSummary: [
      "base 18 a 30 mm",
      "altura 3 a 10 mm",
      "adesivo técnico para retrofit"
    ],
    highlights: [
      "instalação rápida",
      "boa para prototipagem e séries curtas",
      "permite linguagem mais discreta"
    ],
    fitTitle: "Onde faz mais sentido",
    fitDescription:
      "Retrofit de móveis, aparadores, buffets e suportes com área de base plana. É especialmente útil quando o cliente quer preservar a leveza do desenho sem um volume de encaixe aparente.",
    asideTitle: "Boa para retrofit e pequenas séries",
    asideDescription:
      "Quando o caso pede instalação rápida ou baixo relevo visual, a família adesiva costuma ser um bom ponto de partida.",
    faqs: [
      {
        question: "Substitui feltros e soluções adesivas comuns?",
        answer:
          "Em muitos casos, sim. A família existe justamente para oferecer uma alternativa mais controlada visualmente e mais catalogável."
      },
      {
        question: "Dá para publicar novas medidas sem refazer tudo?",
        answer:
          "Esse é o objetivo da família paramétrica: adicionar presets aprovados sem reinventar a base do modelo."
      },
      {
        question: "Quando usar outro material?",
        answer:
          "Se o uso exigir outra dureza, outra resistência ou outra resposta ao piso, o material deve ser reavaliado na etapa técnica."
      }
    ],
    variants: [
      {
        sku: "BF-SL-AD-1803-GRA",
        label: "18 x 3 mm grafite",
        dimensions: {
          baseMm: 18,
          heightMm: 3,
          compatibleRangeMm: "base plana"
        },
        color: "Grafite",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 76.76,
        leadTimeDays: 4,
        technicalFile: "stl/aprovados/BF-SL-AD-1803-GRA.stl"
      },
      {
        sku: "BF-SL-AD-2210-ARE",
        label: "22 x 10 mm areia",
        dimensions: {
          baseMm: 22,
          heightMm: 10,
          compatibleRangeMm: "base plana"
        },
        color: "Areia",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 104.88,
        leadTimeDays: 4,
        technicalFile: "stl/aprovados/BF-SL-AD-2210-ARE.stl"
      },
      {
        sku: "BF-SL-AD-2210-GRA",
        label: "22 x 10 mm grafite",
        dimensions: {
          baseMm: 22,
          heightMm: 10,
          compatibleRangeMm: "base plana"
        },
        color: "Grafite",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 104.88,
        leadTimeDays: 4,
        technicalFile: "stl/aprovados/BF-SL-AD-2210-GRA.stl"
      },
      {
        sku: "BF-SL-AD-3008-AZP",
        label: "30 x 8 mm azul petróleo",
        dimensions: {
          baseMm: 30,
          heightMm: 8,
          compatibleRangeMm: "base plana"
        },
        color: "Azul petróleo",
        material: "TPU",
        finish: "fosco técnico",
        salesUnit: "kit-4",
        priceBrl: 122.08,
        leadTimeDays: 5,
        technicalFile: "stl/aprovados/BF-SL-AD-3008-AZP.stl"
      }
    ]
  }
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

function finalProductImages(slug, name) {
  const gallery = getFamilyGallery(slug);

  if (gallery.length > 0) {
    return gallery.map((item) => ({
      type: item.type,
      title: item.label,
      src: item.src,
      alt: item.alt
    }));
  }

  return [
    {
      type: "hero",
      title: "Produto solo",
      src: `/products/${slug}-hero.png`,
      alt: `${name} preta em imagem de produto solo`
    },
    {
      type: "variacoes",
      title: "Variações",
      src: `/products/${slug}-variacoes.png`,
      alt: `${name} em variações de tamanho, forma e configuração`
    },
    {
      type: "montagem",
      title: "Montagem",
      src: `/products/${slug}-montagem.png`,
      alt: `Ilustração de montagem da ${name}`
    },
    {
      type: "aplicacao",
      title: "Aplicação",
      src: `/products/${slug}-aplicacao.png`,
      alt: `${name} aplicada em mobiliário`
    }
  ];
}

function withFamilyImages(family) {
  return {
    ...family,
    images: finalProductImages(family.slug, family.name),
    image: finalProductImages(family.slug, family.name)[0]
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
    tagline: "Sapata preta customizável para tubos redondos medidos por dentro.",
    heroTitle: "Sapata para tubo redondo customizável até 150 x 150 mm.",
    heroDescription:
      "Linha sob medida para tubos redondos. A cor padrão é preta, sem acabamento adicional e sem quantidade mínima.",
    url: "/familias/sapata-tubo-redondo",
    priceFromBrl: 3,
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
    priceFromBrl: 3.25,
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
    priceFromBrl: 2.75,
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
    priceFromBrl: 2,
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
    priceFromBrl: 7.5,
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
  
].map(withFamilyImages);

export const applications = [...new Set(families.flatMap((family) => family.applications))];

export const fixations = [...new Set(families.map((family) => family.fixation))];

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
