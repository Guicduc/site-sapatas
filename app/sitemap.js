import { productCategories } from "@/lib/configurator-data";
import { families, siteUrl } from "@/lib/site-data";

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
    priority: 0.9
  }));

  const configuratorPages = productCategories.map((category) => ({
    url: `${siteUrl}/configurar/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  return [...staticPages, ...familyPages, ...configuratorPages];
}
