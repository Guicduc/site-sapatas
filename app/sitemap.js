import { productCategories } from "@/lib/configurator-data";
import { families, siteUrl } from "@/lib/site-data";

const lastModified = new Date();

export default function sitemap() {
  const staticPages = [
    "",
    "/catalogo",
    "/como-funciona",
    "/processo",
    "/projeto-especial",
    "/faq",
    "/privacidade"
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8
  }));

  const familyPages = families.map((family) => ({
    url: `${siteUrl}${family.url}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.9
  }));

  const configuratorPages = productCategories.map((category) => ({
    url: `${siteUrl}/configurar/${category.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  return [...staticPages, ...familyPages, ...configuratorPages];
}
