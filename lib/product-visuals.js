export const homeHeroImages = [
  {
    src: "/brand/traco-base-hero-2.png",
    alt: "Sapatas Baseforma aplicadas em tubos redondos, quadrados e oblongos"
  },
  {
    src: "/brand/traco-base-hero-1.png",
    alt: "Famílias de sapatas Baseforma em variações de formato e cor"
  }
];

const finalBasePath = "/products/final";

export const familyVisuals = {
  "sapata-tubo-redondo": {
    family: image(
      "family",
      "Família",
      `${finalBasePath}/sapata-tubo-redondo-family.png`,
      "Família de sapatas para tubo redondo em diferentes medidas e cores"
    ),
    product: image(
      "product",
      "Produto",
      `${finalBasePath}/sapata-tubo-redondo-product.png`,
      "Sapata para tubo redondo em vista de produto final"
    ),
    manual: image(
      "manual",
      "Instalação",
      `${finalBasePath}/manual-sapata-tubo-redondo.png`,
      "Sequência de instalação da sapata para tubo redondo"
    ),
    usage: image(
      "usage",
      "Uso",
      `${finalBasePath}/uso-sapata-tubo-redondo.png`,
      "Sapata para tubo redondo aplicada em pé tubular"
    )
  },
  "sapata-tubo-quadrado": {
    family: image(
      "family",
      "Família",
      `${finalBasePath}/sapata-tubo-quadrado-family.png`,
      "Família de sapatas para tubo quadrado em diferentes medidas e cores"
    ),
    product: image(
      "product",
      "Produto",
      `${finalBasePath}/sapata-tubo-quadrado-product.png`,
      "Sapata para tubo quadrado em vista de produto final"
    ),
    manual: image(
      "manual",
      "Instalação",
      `${finalBasePath}/manual-sapata-tubo-quadrado.png`,
      "Sequência de instalação da sapata para tubo quadrado"
    ),
    usage: image(
      "usage",
      "Uso",
      `${finalBasePath}/uso-sapata-tubo-quadrado.png`,
      "Sapata para tubo quadrado aplicada em pé tubular"
    )
  },
  "sapata-tubo-oblongo": {
    family: image(
      "family",
      "Família",
      `${finalBasePath}/sapata-tubo-oblongo-family.png`,
      "Família de sapatas para tubo oblongo em diferentes medidas e cores"
    ),
    product: image(
      "product",
      "Produto",
      `${finalBasePath}/sapata-tubo-oblongo-product.png`,
      "Sapata para tubo oblongo em vista de produto final"
    ),
    manual: image(
      "manual",
      "Instalação",
      `${finalBasePath}/manual-sapata-tubo-oblongo.png`,
      "Sequência de instalação da sapata para tubo oblongo"
    )
  },
  "sapata-lisa-redonda": {
    family: image(
      "family",
      "Família",
      `${finalBasePath}/sapata-lisa-redonda-family.png`,
      "Família de sapatas lisas redondas em diferentes medidas e cores"
    ),
    variacoes: image(
      "variacoes",
      "Variações",
      `${finalBasePath}/sapata-lisa-redonda-variados.png`,
      "Variações de sapata lisa redonda com e sem haste"
    ),
    productVariants: {
      "sem-haste": image(
        "product",
        "Produto",
        `${finalBasePath}/sapata-lisa-redonda-sem-haste.png`,
        "Sapata lisa redonda sem haste em vista de produto final"
      ),
      "com-haste": image(
        "product",
        "Produto",
        `${finalBasePath}/sapata-lisa-redonda-com-haste.png`,
        "Sapata lisa redonda com haste em vista de produto final"
      )
    },
    manual: image(
      "manual",
      "Instalação",
      `${finalBasePath}/manual-sapata-lisa-redonda-com-haste.png`,
      "Sequência de instalação da sapata lisa redonda com haste"
    ),
    usage: image(
      "usage",
      "Uso",
      `${finalBasePath}/uso-sapata-lisa-redonda-com-haste.png`,
      "Sapata lisa redonda com haste aplicada em mobiliário"
    ),
    showSupplementalOnlyWithNeck: true
  },
  "sapata-lisa-quadrada": {
    family: image(
      "family",
      "Família",
      `${finalBasePath}/sapata-lisa-quadrada-family.png`,
      "Família de sapatas lisas quadradas em diferentes medidas e cores"
    ),
    variacoes: image(
      "variacoes",
      "Variações",
      `${finalBasePath}/sapata-lisa-quadrada-variados.png`,
      "Variações de sapata lisa quadrada com e sem haste"
    ),
    productVariants: {
      "sem-haste": image(
        "product",
        "Produto",
        `${finalBasePath}/sapata-lisa-quadrada-sem-haste.png`,
        "Sapata lisa quadrada sem haste em vista de produto final"
      ),
      "com-haste": image(
        "product",
        "Produto",
        `${finalBasePath}/sapata-lisa-quadrada-com-haste.png`,
        "Sapata lisa quadrada com haste em vista de produto final"
      )
    },
    manual: image(
      "manual",
      "Instalação",
      `${finalBasePath}/manual-sapata-lisa-quadrada-com-haste.png`,
      "Sequência de instalação da sapata lisa quadrada com haste"
    ),
    usage: image(
      "usage",
      "Uso",
      `${finalBasePath}/uso-sapata-lisa-quadrada-com-haste.png`,
      "Sapata lisa quadrada com haste aplicada em mobiliário"
    ),
    showSupplementalOnlyWithNeck: true
  }
};

const categoryCardImages = {
  "ponteira-interna-tubo": image(
    "category",
    "Sapata interna tubos",
    `${finalBasePath}/sapata-tubo-quadrado-family.png`,
    "Sapatas internas para tubos quadrados em diferentes medidas e cores"
  ),
  "sapata-base-lisa": image(
    "category",
    "Sapata lisa",
    `${finalBasePath}/sapata-lisa-quadrada-family.png`,
    "Sapatas lisas quadradas em diferentes medidas, com e sem haste"
  )
};

const formatFamilyMap = {
  "ponteira-interna-tubo": {
    redondo: "sapata-tubo-redondo",
    quadrado: "sapata-tubo-quadrado",
    oblongo: "sapata-tubo-oblongo"
  },
  "sapata-base-lisa": {
    redonda: "sapata-lisa-redonda",
    quadrada: "sapata-lisa-quadrada"
  }
};

function image(type, label, src, alt) {
  return { type, label, src, alt };
}

export function getCategoryCardImage(categorySlug, fallbackImage) {
  return categoryCardImages[categorySlug] || fallbackImage || null;
}

export function getFamilySlugForFormat(categorySlug, formatSlug) {
  return formatFamilyMap[categorySlug]?.[formatSlug] || "";
}

export function getFamilyImage(familySlug) {
  return familyVisuals[familySlug]?.family || null;
}

export function getFamilyGallery(familySlug) {
  const visuals = familyVisuals[familySlug];

  if (!visuals) {
    return [];
  }

  return uniqueImages([
    visuals.family,
    visuals.variacoes,
    visuals.product,
    visuals.productVariants?.["sem-haste"],
    visuals.productVariants?.["com-haste"],
    visuals.usage,
    visuals.manual
  ]);
}

export function getConfiguratorVisuals(categorySlug, formatSlug, values) {
  const familySlug = getFamilySlugForFormat(categorySlug, formatSlug);
  const visuals = familyVisuals[familySlug];

  if (!visuals) {
    return [];
  }

  const hasNeck = values?.pescoco === true || values?.pescoco === "true";
  const variantKey = hasNeck ? "com-haste" : "sem-haste";
  const productImage = visuals.productVariants?.[variantKey] || visuals.product;
  const supplemental = visuals.showSupplementalOnlyWithNeck && !hasNeck
    ? [visuals.family, visuals.variacoes]
    : [visuals.family, visuals.variacoes, visuals.usage, visuals.manual];

  return uniqueImages([productImage, ...supplemental]);
}

function uniqueImages(images) {
  const seen = new Set();

  return images.filter((item) => {
    if (!item?.src || seen.has(item.src)) {
      return false;
    }

    seen.add(item.src);
    return true;
  });
}
