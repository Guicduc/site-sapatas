import { brand } from "./site-data.js";

export const defaultSiteTitle = `${brand.name} | ${brand.tagline}`;

export const defaultOgImage = {
  url: "/brand/baseforma-og.png",
  width: 1200,
  height: 630,
  alt: "Sapatas 3D sob demanda Baseforma"
};

// Padroes do site para Open Graph. O Next.js substitui o objeto openGraph inteiro quando a
// pagina declara o seu, entao cada pagina precisa repetir siteName/locale/images.
export const siteOpenGraph = {
  type: "website",
  locale: "pt_BR",
  siteName: brand.name,
  images: [defaultOgImage]
};

const brandSuffix = ` | ${brand.name}`;

export function withBrandSuffix(title) {
  const value = String(title || "").trim();

  if (!value) {
    return defaultSiteTitle;
  }

  return value.endsWith(brandSuffix) ? value : `${value}${brandSuffix}`;
}

/**
 * Metadata de uma pagina indexavel: canonical, Open Graph e Twitter proprios.
 * `title` vai sem a marca; o sufixo " | Baseforma" entra uma unica vez. Usa title.absolute
 * porque o template do layout raiz nao se aplica a app/page.js (mesmo segmento).
 */
export function buildPageMetadata({ title, description, path }) {
  const fullTitle = withBrandSuffix(title);

  return {
    title: { absolute: fullTitle },
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      ...siteOpenGraph,
      title: fullTitle,
      description,
      url: path
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [defaultOgImage.url]
    }
  };
}
