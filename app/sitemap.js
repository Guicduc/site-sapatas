import { families, siteUrl } from "@/lib/site-data";

export default function sitemap() {
  const staticPages = [
    "",
    "/catalogo",
    "/como-funciona",
    "/processo",
    "/projeto-especial",
    "/faq"
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

  return [...staticPages, ...familyPages];
}
