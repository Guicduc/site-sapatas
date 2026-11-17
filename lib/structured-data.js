// Builders puros de dados estruturados (schema.org JSON-LD). A serializacao segura para
// <script type="application/ld+json"> fica em components/structured-data.jsx.
//
// Referencias seguidas (Google Search Central): Organization, Product snippets e Merchant
// listings. Decisoes registradas no PR que criou este modulo:
// - Organization usa o subtipo OnlineStore e carrega a politica de devolucao global, como o
//   Google recomenda, em vez de repeti-la em cada oferta.
// - Product usa AggregateOffer (faixa de medidas configuraveis). AggregateOffer serve para
//   product snippets; merchant listings exigiriam um Offer com preco unico por variante.
// - Frete e cotado dinamicamente por CEP, entao shippingDetails e omitido.

import { productManifests } from "./product-registry.js";

const SCHEMA_CONTEXT = "https://schema.org";

// Google lista os valores aceitos de availability; MadeToOrder (schema.org) nao esta entre
// eles. InStock indica que o produto pode ser comprado agora; o prazo de producao aparece na
// pagina.
export const FAMILY_OFFER_AVAILABILITY = "https://schema.org/InStock";

const countryCodes = { Brasil: "BR", Brazil: "BR" };

export function absoluteUrl(path, siteUrl) {
  return new URL(String(path || "/"), `${String(siteUrl).replace(/\/+$/, "")}/`).toString();
}

export function organizationId(siteUrl) {
  return `${absoluteUrl("/", siteUrl)}#organization`;
}

export function websiteId(siteUrl) {
  return `${absoluteUrl("/", siteUrl)}#website`;
}

function countryCode(country) {
  return countryCodes[country] || country;
}

function roundPrice(value) {
  return Math.round(Number(value) * 100) / 100;
}

/** Separa "Rua X, 123 - Bairro - CEP 00000-000" em logradouro e CEP. */
export function parseCompanyAddress(address) {
  const value = String(address || "").trim();
  const postalCode = value.match(/CEP\s*(\d{5}-?\d{3})/i)?.[1] || "";
  const streetAddress = value.replace(/\s*-?\s*CEP\s*\d{5}-?\d{3}\s*$/i, "").trim();

  return {
    streetAddress,
    postalCode: postalCode && !postalCode.includes("-")
      ? `${postalCode.slice(0, 5)}-${postalCode.slice(5)}`
      : postalCode
  };
}

export function formatCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 14) {
    return "";
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Politica de devolucao publicada em /trocas: arrependimento em ate 7 dias do recebimento,
 * envio de retorno pago pela Baseforma (por correio/transportadora) e reembolso integral.
 */
export function buildMerchantReturnPolicy({ siteUrl, country }) {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: countryCode(country),
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
    merchantReturnLink: absoluteUrl("/trocas", siteUrl)
  };
}

export function buildOrganizationJsonLd({ siteUrl, brand, company, cnpj, logoPath }) {
  const { streetAddress, postalCode } = parseCompanyAddress(company.address);
  const taxID = formatCnpj(cnpj);
  const address = {
    "@type": "PostalAddress",
    ...(streetAddress ? { streetAddress } : {}),
    addressLocality: company.city,
    addressRegion: company.state,
    ...(postalCode ? { postalCode } : {}),
    addressCountry: countryCode(company.country)
  };

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "OnlineStore",
    "@id": organizationId(siteUrl),
    name: brand.name,
    ...(company.legalName ? { legalName: company.legalName } : {}),
    description: brand.description,
    url: absoluteUrl("/", siteUrl),
    logo: absoluteUrl(logoPath, siteUrl),
    email: brand.email,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: company.supportEmail,
        areaServed: countryCode(company.country),
        availableLanguage: "pt-BR"
      }
    ],
    address,
    ...(taxID ? { taxID } : {}),
    hasMerchantReturnPolicy: buildMerchantReturnPolicy({ siteUrl, country: company.country })
  };
}

export function buildWebSiteJsonLd({ siteUrl, brand }) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": websiteId(siteUrl),
    name: brand.name,
    url: absoluteUrl("/", siteUrl),
    inLanguage: "pt-BR",
    publisher: { "@id": organizationId(siteUrl) }
  };
}

function familySkuPrefix(family) {
  return productManifests.find((product) => product.seo.familySlug === family.slug)?.skuPrefix || "";
}

/**
 * Product da pagina de familia (/familias/[slug]), a landing canonica de cada formato.
 * lowPrice/highPrice sao exatamente family.priceFromBrl/priceToBrl, os mesmos valores do
 * "A partir de" exibido na pagina e no card da familia.
 */
export function buildFamilyProductJsonLd(family, { siteUrl, brand }) {
  const url = absoluteUrl(family.url, siteUrl);
  const sku = familySkuPrefix(family);
  const images = (family.images || []).map((image) => absoluteUrl(image.src, siteUrl));
  const lowPrice = roundPrice(family.priceFromBrl);
  const highPrice = roundPrice(Math.max(family.priceToBrl || 0, family.priceFromBrl));

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    "@id": `${url}#product`,
    name: family.name,
    description: family.seoDescription,
    url,
    ...(images.length > 0 ? { image: images } : {}),
    ...(sku ? { sku } : {}),
    brand: {
      "@type": "Brand",
      name: brand.name
    },
    category: family.productCategory || "Sapata para móveis",
    ...(family.defaultMaterial ? { material: family.defaultMaterial } : {}),
    ...(family.availableColors?.length ? { color: family.availableColors } : {}),
    offers: {
      "@type": "AggregateOffer",
      url,
      priceCurrency: "BRL",
      lowPrice,
      highPrice,
      availability: FAMILY_OFFER_AVAILABILITY,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "OnlineStore",
        "@id": organizationId(siteUrl),
        name: brand.name
      }
    }
  };
}
