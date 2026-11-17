import { siteUrl } from "./site-data.js";

// Trilha padrao das paginas de produto: Inicio > Catalogo > pagina atual.
export function buildCatalogTrail(name, path) {
  return [
    { name: "Início", path: "/" },
    { name: "Catálogo", path: "/catalogo" },
    { name, path }
  ];
}

// BreadcrumbList do schema.org exige URLs absolutas em cada item.
export function buildBreadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path)
    }))
  };
}

function toAbsoluteUrl(path) {
  return path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
}
