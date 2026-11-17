import { ogImageManifest } from "./og-image-manifest.js";
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

// Imagens sociais por rota (1200 x 630, JPEG leve) geradas por scripts/build-og-images.mjs.
// Sem entrada no manifesto, a pagina usa a imagem padrao do site.
function ogImageFromManifest(key) {
  const image = ogImageManifest[key];

  return image
    ? { url: image.url, width: image.width, height: image.height, alt: image.alt }
    : undefined;
}

export function getFamilyOgImage(familySlug) {
  return ogImageFromManifest(`familias/${familySlug}`);
}

export function getConfiguratorOgImage(categorySlug) {
  return ogImageFromManifest(`configurar/${categorySlug}`);
}

/**
 * Metadata de uma pagina indexavel: canonical, Open Graph e Twitter proprios.
 * `title` vai sem a marca; o sufixo " | Baseforma" entra uma unica vez. Usa title.absolute
 * porque o template do layout raiz nao se aplica a app/page.js (mesmo segmento).
 * `image` ({ url, width, height, alt }) e opcional; sem ela vale a imagem padrao do site.
 */
export function buildPageMetadata({ title, description, path, image }) {
  const fullTitle = withBrandSuffix(title);
  const socialImage = image?.url ? image : defaultOgImage;

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
      url: path,
      images: [socialImage]
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [{ url: socialImage.url, alt: socialImage.alt }]
    }
  };
}
