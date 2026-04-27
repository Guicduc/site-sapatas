export const productCategories = [
  {
    slug: "ponteira-interna-tubo",
    name: "Ponteira interna para tubo",
    eyebrow: "Encaixe por medida real",
    description:
      "Ponteiras sob medida para tubos redondos, retangulares e oblongos, com press-fit e ajuste de interferencia.",
    baseType: "tubo",
    primaryFixation: "press-fit interno",
    image: {
      src: "/brand/categoria-ponteira-interna-tubo.png",
      alt: "Ponteiras internas Traço Base para tubos redondos, retangulares e oblongos"
    },
    applications: ["cadeiras", "mesas", "serralheria", "mobiliario autoral"],
    colors: ["Grafite", "Areia", "Terracota", "Cinza nevoa"],
    finishes: ["fosco tecnico", "base silenciosa", "trava reforcada"],
    formats: [
      {
        slug: "redondo",
        name: "Tubo redondo",
        skuPrefix: "TB-RD-PI",
        description: "Para tubo redondo medido pelo diametro interno real.",
        fixation: "press-fit interno",
        applications: ["cadeiras", "mesas tubulares", "reposicao"],
        status: "active",
        drawingType: "tube-round",
        priceBaseBrl: 34,
        priceFactor: 0.42,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("diametroInterno", "Diametro interno", 12, 36, 22, "mm"),
          dimension("diametroBase", "Diametro da base", 16, 46, 28, "mm"),
          dimension("profundidadeInsercao", "Profundidade de insercao", 8, 32, 18, "mm"),
          dimension("alturaApoio", "Altura de apoio", 4, 18, 8, "mm")
        ],
        notes: ["Meça o tubo por dentro, depois da pintura ou cromagem."]
      },
      {
        slug: "retangular",
        name: "Tubo retangular",
        skuPrefix: "TB-RT-PI",
        description: "Para metalon e tubos retangulares com parede fora do padrao comum.",
        fixation: "press-fit interno",
        applications: ["serralheria", "bancos", "aparadores", "linhas autorais"],
        status: "active",
        drawingType: "tube-rect",
        priceBaseBrl: 42,
        priceFactor: 0.34,
        leadTimeBaseDays: 6,
        parameters: [
          dimension("larguraInterna", "Largura interna", 14, 58, 30, "mm"),
          dimension("alturaInterna", "Altura interna", 10, 36, 20, "mm"),
          dimension("parede", "Espessura da parede", 0.8, 4, 1.5, "mm", 0.1),
          dimension("profundidadeInsercao", "Profundidade de insercao", 8, 35, 20, "mm"),
          dimension("alturaBase", "Altura da base", 4, 18, 8, "mm")
        ],
        notes: ["Boa familia para medidas 30 x 20, 40 x 20 e outras variações."]
      },
      {
        slug: "oblongo",
        name: "Tubo oblongo",
        skuPrefix: "TB-OB-PI",
        description: "Para perfis ovais ou oblongos que nao fecham em medida nominal.",
        fixation: "press-fit interno",
        applications: ["cadeiras", "moveis importados", "reposicao especial"],
        status: "review",
        drawingType: "tube-oblong",
        priceBaseBrl: 48,
        priceFactor: 0.36,
        leadTimeBaseDays: 8,
        parameters: [
          dimension("larguraInterna", "Largura interna", 18, 58, 36, "mm"),
          dimension("alturaInterna", "Altura interna", 10, 34, 18, "mm"),
          dimension("raioCanto", "Raio aproximado", 3, 18, 9, "mm"),
          dimension("profundidadeInsercao", "Profundidade de insercao", 8, 35, 18, "mm")
        ],
        notes: ["Formato em validacao: pedidos entram como sob avaliacao tecnica."]
      }
    ]
  },
  {
    slug: "sapata-base-lisa",
    name: "Sapata para base lisa",
    eyebrow: "Apoio para chapa, madeira e base plana",
    description:
      "Sapatas para bases lisas em formatos redondo, oblongo, retangular e encaixe U para chapa.",
    baseType: "base lisa",
    primaryFixation: "adesivo, parafuso ou encaixe U",
    image: {
      src: "/brand/categoria-sapata-base-lisa.png",
      alt: "Sapatas Traço Base para bases lisas, redondas, retangulares e encaixe U"
    },
    applications: ["poltronas", "banquinhos", "bases metalicas", "moveis autorais"],
    colors: ["Grafite", "Areia", "Terracota", "Verde mineral"],
    finishes: ["fosco tecnico", "deslizante", "antiderrapante", "piso sensivel"],
    formats: [
      {
        slug: "redonda",
        name: "Base redonda",
        skuPrefix: "TB-BL-RD",
        description: "Para pes e bases com area circular de contato.",
        fixation: "adesivo ou parafuso",
        applications: ["poltronas", "sofas", "bases circulares"],
        status: "active",
        drawingType: "base-round",
        priceBaseBrl: 29,
        priceFactor: 0.34,
        leadTimeBaseDays: 4,
        parameters: [
          dimension("diametro", "Diametro", 14, 60, 28, "mm"),
          dimension("altura", "Altura", 3, 16, 6, "mm")
        ],
        notes: ["Escolha adesivo para instalacao sem furo ou parafuso para uso recorrente."]
      },
      {
        slug: "oblonga",
        name: "Base oblonga",
        skuPrefix: "TB-BL-OB",
        description: "Para chapa estreita, base retangular curta e area de contato alongada.",
        fixation: "adesivo protegido ou parafuso",
        applications: ["chapa metalica", "banquinhos", "bases estreitas"],
        status: "active",
        drawingType: "base-oblong",
        priceBaseBrl: 36,
        priceFactor: 0.28,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("comprimento", "Comprimento", 24, 110, 50, "mm"),
          dimension("largura", "Largura", 12, 42, 20, "mm"),
          dimension("altura", "Altura", 3, 16, 7, "mm"),
          dimension("distanciaFuros", "Distancia entre furos", 0, 90, 0, "mm")
        ],
        notes: ["Use distancia entre furos 0 quando a fixacao for apenas adesiva."]
      },
      {
        slug: "retangular",
        name: "Base retangular",
        skuPrefix: "TB-BL-RT",
        description: "Para bases planas longas ou pes lamina com area retangular.",
        fixation: "adesivo, parafuso ou fita tecnica",
        applications: ["bases lamina", "aparadores", "buffets"],
        status: "active",
        drawingType: "base-rect",
        priceBaseBrl: 39,
        priceFactor: 0.24,
        leadTimeBaseDays: 5,
        parameters: [
          dimension("comprimento", "Comprimento", 24, 130, 75, "mm"),
          dimension("largura", "Largura", 12, 55, 25, "mm"),
          dimension("altura", "Altura", 3, 16, 6, "mm"),
          dimension("raioCanto", "Raio dos cantos", 1, 12, 4, "mm")
        ],
        notes: ["Cantos arredondados reduzem risco de descolamento e leitura improvisada."]
      },
      {
        slug: "u-chapa",
        name: "Encaixe U para chapa",
        skuPrefix: "TB-CH-U",
        description: "Para chapa ou pe lamina quando a sapata pode envolver a borda.",
        fixation: "encaixe U por pressao",
        applications: ["chapa dobrada", "pes lamina", "banquinhos"],
        status: "active",
        drawingType: "base-u",
        priceBaseBrl: 44,
        priceFactor: 0.32,
        leadTimeBaseDays: 6,
        parameters: [
          dimension("espessuraChapa", "Espessura da chapa", 1.5, 8, 3, "mm", 0.1),
          dimension("profundidadeCanal", "Profundidade do canal", 8, 28, 16, "mm"),
          dimension("comprimento", "Comprimento", 24, 100, 48, "mm"),
          dimension("alturaAparente", "Altura aparente", 4, 18, 8, "mm")
        ],
        notes: ["Indicado quando adesivo sofreria cisalhamento ao arrastar o movel."]
      }
    ]
  }
];

function dimension(key, label, min, max, defaultValue, unit = "mm", step = 1) {
  return {
    key,
    label,
    min,
    max,
    defaultValue,
    unit,
    step,
    required: true,
    type: "number"
  };
}

export function getCategoryBySlug(slug) {
  return productCategories.find((category) => category.slug === slug);
}

export function getFormat(category, formatSlug) {
  return category?.formats.find((format) => format.slug === formatSlug);
}

export function getInitialValues(format) {
  return Object.fromEntries(format.parameters.map((parameter) => [parameter.key, parameter.defaultValue]));
}

export function validateConfiguration(format, values) {
  const issues = [];

  for (const parameter of format.parameters) {
    const rawValue = values[parameter.key];
    const value = Number(rawValue);

    if (parameter.required && (rawValue === "" || rawValue === null || Number.isNaN(value))) {
      issues.push(`${parameter.label} precisa ser informado.`);
      continue;
    }

    if (value < parameter.min || value > parameter.max) {
      issues.push(
        `${parameter.label} deve ficar entre ${parameter.min} e ${parameter.max} ${parameter.unit}.`
      );
    }
  }

  if (format.status === "review") {
    issues.push("Formato em avaliacao tecnica: o pedido nao entra como compra direta.");
  }

  return issues;
}

export const pricingAssumptions = {
  tpuFilamentBrlPerKg: 180,
  tpuDensityGPerCm3: 1.22,
  printWasteRate: 0.12,
  volumetricRateMm3PerSecond: 3.2,
  printTimeOverheadFactor: 1.65,
  machineCostBrlPerHour: 2.8,
  energyCostBrlPerHour: 0.25,
  packagingBrlPerOrder: 2,
  markup: 2.3,
  minOrderPriceBrl: 19.9
};

export function calculatePrice(format, values, quantity = 1) {
  return calculatePriceBreakdown(format, values, quantity).totalPriceBrl;
}

export function calculatePriceBreakdown(format, values, quantity = 1) {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const volumeMm3 = estimatePrintedVolumeMm3(format, values);
  const grossVolumeMm3 = volumeMm3 * (1 + pricingAssumptions.printWasteRate);
  const materialGrams =
    (grossVolumeMm3 / 1000) * pricingAssumptions.tpuDensityGPerCm3;
  const materialCostBrl =
    materialGrams * (pricingAssumptions.tpuFilamentBrlPerKg / 1000);
  const printHours =
    (grossVolumeMm3 / pricingAssumptions.volumetricRateMm3PerSecond / 3600) *
    pricingAssumptions.printTimeOverheadFactor;
  const machineCostBrl =
    printHours *
    (pricingAssumptions.machineCostBrlPerHour + pricingAssumptions.energyCostBrlPerHour);
  const directUnitCostBrl = materialCostBrl + machineCostBrl;
  const directOrderCostBrl =
    directUnitCostBrl * safeQuantity + pricingAssumptions.packagingBrlPerOrder;
  const totalPriceBrl = Math.max(
    pricingAssumptions.minOrderPriceBrl,
    roundMoney(directOrderCostBrl * pricingAssumptions.markup)
  );
  const unitPriceBrl = roundMoney(totalPriceBrl / safeQuantity);

  return {
    volumeMm3: roundMetric(volumeMm3),
    materialGrams: roundMetric(materialGrams),
    materialCostBrl: roundMoney(materialCostBrl),
    printHours: roundMetric(printHours),
    machineCostBrl: roundMoney(machineCostBrl),
    packagingCostBrl: roundMoney(pricingAssumptions.packagingBrlPerOrder),
    directUnitCostBrl: roundMoney(directUnitCostBrl),
    directOrderCostBrl: roundMoney(directOrderCostBrl),
    unitPriceBrl,
    totalPriceBrl,
    quantity: safeQuantity,
    assumptions: pricingAssumptions
  };
}

export function calculateLeadTime(format, quantity = 1) {
  const extra = Number(quantity || 1) > 24 ? 2 : 0;
  return format.leadTimeBaseDays + extra + (format.status === "review" ? 3 : 0);
}

export function buildConfigurationSku(format, values) {
  const parts = format.parameters.slice(0, 3).map((parameter) => {
    return String(values[parameter.key] ?? parameter.defaultValue).replace(".", "P");
  });

  return `${format.skuPrefix}-${parts.join("X")}`;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundMetric(value) {
  return Math.round(value * 10) / 10;
}

function readValue(values, key, fallback = 0) {
  return Math.max(0, Number(values[key] ?? fallback ?? 0));
}

function parameterDefault(format, key) {
  return format.parameters.find((parameter) => parameter.key === key)?.defaultValue || 0;
}

function value(values, format, key) {
  return readValue(values, key, parameterDefault(format, key));
}

function circleArea(diameter) {
  return Math.PI * Math.pow(diameter / 2, 2);
}

function capsuleArea(length, width) {
  const straight = Math.max(0, length - width) * width;
  return straight + circleArea(width);
}

function estimatePrintedVolumeMm3(format, values) {
  switch (format.drawingType) {
    case "tube-round": {
      const innerDiameter = value(values, format, "diametroInterno");
      const baseDiameter = value(values, format, "diametroBase");
      const insertionDepth = value(values, format, "profundidadeInsercao");
      const supportHeight = value(values, format, "alturaApoio");
      const baseVolume = circleArea(baseDiameter) * supportHeight * 0.45;
      const plugVolume = circleArea(innerDiameter) * insertionDepth * 0.27;
      return baseVolume + plugVolume;
    }
    case "tube-rect": {
      const width = value(values, format, "larguraInterna");
      const height = value(values, format, "alturaInterna");
      const wall = value(values, format, "parede");
      const insertionDepth = value(values, format, "profundidadeInsercao");
      const baseHeight = value(values, format, "alturaBase");
      const baseWidth = width + wall * 2 + 6;
      const baseDepth = height + wall * 2 + 6;
      const baseVolume = baseWidth * baseDepth * baseHeight * 0.78;
      const plugVolume = width * height * insertionDepth * 0.48;
      return baseVolume + plugVolume;
    }
    case "tube-oblong": {
      const width = value(values, format, "larguraInterna");
      const height = value(values, format, "alturaInterna");
      const insertionDepth = value(values, format, "profundidadeInsercao");
      const baseVolume = capsuleArea(width + 8, height + 8) * 8 * 0.78;
      const plugVolume = capsuleArea(width, height) * insertionDepth * 0.48;
      return baseVolume + plugVolume;
    }
    case "base-round": {
      const diameter = value(values, format, "diametro");
      const height = value(values, format, "altura");
      return circleArea(diameter) * height * 0.86;
    }
    case "base-oblong": {
      const length = value(values, format, "comprimento");
      const width = value(values, format, "largura");
      const height = value(values, format, "altura");
      return capsuleArea(length, width) * height * 0.84;
    }
    case "base-rect": {
      const length = value(values, format, "comprimento");
      const width = value(values, format, "largura");
      const height = value(values, format, "altura");
      return length * width * height * 0.84;
    }
    case "base-u": {
      const plateThickness = value(values, format, "espessuraChapa");
      const channelDepth = value(values, format, "profundidadeCanal");
      const length = value(values, format, "comprimento");
      const visibleHeight = value(values, format, "alturaAparente");
      const sideWall = Math.max(2.2, plateThickness * 0.7);
      const outerWidth = plateThickness + sideWall * 2;
      const outerHeight = channelDepth + visibleHeight;
      const solidVolume = length * outerWidth * outerHeight;
      const channelVoid = length * plateThickness * channelDepth;
      return Math.max(length * outerWidth * visibleHeight, (solidVolume - channelVoid) * 0.82);
    }
    default: {
      const dimensionSum = format.parameters.reduce((sum, parameter) => {
        return sum + Number(values[parameter.key] || parameter.defaultValue || 0);
      }, 0);
      return Math.max(1000, dimensionSum * 120);
    }
  }
}
