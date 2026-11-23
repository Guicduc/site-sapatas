import { ProductCatalog } from "@/components/product-catalog";
import { productCategories } from "@/lib/configurator-data";
import { buildPageMetadata } from "@/lib/page-metadata";
import { pageSeo } from "@/lib/seo-copy";
import { getCategoryPriceFromMap } from "@/lib/site-data";

export const metadata = buildPageMetadata(pageSeo.catalogo);

export default function CatalogPage() {
  return <ProductCatalog categories={productCategories} priceFromByCategory={getCategoryPriceFromMap()} catalogOnly />;
}

