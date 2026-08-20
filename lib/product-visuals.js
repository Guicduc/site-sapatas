import {
  buildRegistryProductCategories,
  getProductManifestById,
  getProductManifestByRoute,
  productManifests,
  resolveManifestVariant
} from "./product-registry.js";

export const homeHeroImages = [
  {
    src: "/brand/traco-base-hero-2.png",
    alt: "Sapatas Baseforma aplicadas em tubos redondos, quadrados e oblongos",
    objectPosition: "68% center"
  },
  {
    src: "/brand/traco-base-hero-1.png",
    alt: "Famílias de sapatas Baseforma em variações de formato e cor",
    objectPosition: "center center"
  }
];

const registryCategories = buildRegistryProductCategories();

export function getCategoryCardImage(categorySlug, fallbackImage) {
  const category = registryCategories.find((item) => item.slug === categorySlug);
  const product = getProductManifestById(category?.cardVisualProductId);
  const familyVisual = product?.visuals?.find((visual) => visual.role === "family");

  return familyVisual ? toGalleryImage(familyVisual) : fallbackImage || category?.image || null;
}

export function getCategoryCardGallery(categorySlug, fallbackImage) {
  const category = registryCategories.find((item) => item.slug === categorySlug);
  const categoryImage = getCategoryCardImage(categorySlug, fallbackImage);
  const familyImages = (category?.formats || [])
    .map((format) => {
      const product = getProductManifestById(format.productId);
      return product?.visuals?.find((visual) => visual.role === "product") ||
        product?.visuals?.find((visual) => visual.role === "family");
    })
    .filter(Boolean)
    .map(toGalleryImage);

  return uniqueImages([categoryImage, ...familyImages]);
}

export function getFamilySlugForFormat(categorySlug, formatSlug) {
  return getProductManifestByRoute(categorySlug, formatSlug)?.seo?.familySlug || "";
}

export function getFamilyGallery(familySlug) {
  const product = productManifests.find((item) => item.seo.familySlug === familySlug);

  return uniqueImages(
    [...(product?.visuals || [])]
      .sort((left, right) => visualRoleOrder(left.role) - visualRoleOrder(right.role))
      .map(toGalleryImage)
  );
}

export function getConfiguratorVisuals(categorySlug, formatSlug, values) {
  const product = getProductManifestByRoute(categorySlug, formatSlug);
  const variant = resolveManifestVariant(product, values);
  const applicable = (product?.visuals || []).filter((visual) => {
    return conditionMatches(visual.condition, values) &&
      (!visual.variantId || visual.variantId === variant?.id);
  });
  const productImage = applicable.find((visual) => visual.role === "product");
  const supplemental = applicable
    .filter((visual) => visual !== productImage)
    .sort((left, right) => visualRoleOrder(left.role) - visualRoleOrder(right.role));

  return uniqueImages([productImage, ...supplemental].filter(Boolean).map(toGalleryImage));
}

function conditionMatches(condition, values) {
  return !condition || Object.entries(condition).every(([key, expected]) => values?.[key] === expected);
}

function visualRoleOrder(role) {
  return ["family", "variations", "product", "usage", "manual"].indexOf(role);
}

function toGalleryImage(visual) {
  const labels = {
    family: "Família",
    product: "Produto",
    variations: "Variações",
    manual: "Instalação",
    usage: "Uso"
  };

  return {
    type: visual.role,
    label: labels[visual.role] || visual.role,
    src: visual.src,
    alt: visual.alt
  };
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
