import { productCategories } from "../lib/configurator-data.js";
import { families, siteUrl } from "../lib/site-data.js";

// Sem lastModified: nao ha fonte confiavel de data de alteracao por pagina
// (mtime de arquivo no Vercel reflete o checkout do build).
export default function sitemap() {
  const staticPages = [
    "",
    "/catalogo",
    "/como-funciona",
    "/processo",
    "/projeto-especial",
    "/faq",
    "/termos",
    "/trocas",
    "/privacidade"
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8
  }));

  const familyPages = families.map((family) => ({
    url: `${siteUrl}${family.url}`,
    changeFrequency: "weekly",
    priority: 0.9,
    images: toAbsoluteImageUrls(family.images)
  }));

  const configuratorPages = productCategories.map((category) => ({
    url: `${siteUrl}/configurar/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
    images: toAbsoluteImageUrls(
      families
        .filter((family) => family.categorySlug === category.slug)
        .flatMap((family) => family.images)
    )
  }));

  return [...staticPages, ...familyPages, ...configuratorPages];
}

function toAbsoluteImageUrls(images = []) {
  return [...new Set(images.filter((image) => image?.src).map((image) => `${siteUrl}${encodeURI(image.src)}`))];
}
