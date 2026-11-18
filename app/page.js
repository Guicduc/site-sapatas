import { ProductCatalog } from "@/components/product-catalog";
import { StructuredData } from "@/components/structured-data";
import { productCategories } from "@/lib/configurator-data";
import { getInvoiceConfig } from "@/lib/invoice-config";
import { buildPageMetadata } from "@/lib/page-metadata";
import { brand, company, siteUrl } from "@/lib/site-data";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/structured-data";

export const metadata = buildPageMetadata({
  title: "Configurador de sapatas sob medida",
  description:
    "Configure ponteiras internas para tubo e sapatas para base lisa com medidas cotadas, preço estimado e pedido próprio.",
  path: "/"
});

export default function HomePage() {
  const organization = buildOrganizationJsonLd({
    siteUrl,
    brand,
    company,
    cnpj: getInvoiceConfig().issuerCnpj,
    logoPath: "/brand/baseforma-mark.png"
  });

  return (
    <>
      <StructuredData data={organization} />
      <StructuredData data={buildWebSiteJsonLd({ siteUrl, brand })} />
      <ProductCatalog categories={productCategories} />
    </>
  );
}
