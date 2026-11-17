import { ProductCatalog } from "@/components/product-catalog";
import { productCategories } from "@/lib/configurator-data";
import { pageSeo } from "@/lib/seo-copy";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata(pageSeo.home);

export default function HomePage() {
  return <ProductCatalog categories={productCategories} />;
}

