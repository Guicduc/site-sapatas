import { ProductCatalog } from "@/components/product-catalog";
import { productCategories } from "@/lib/configurator-data";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "Catálogo configurável",
  description:
    "Escolha uma categoria de sapata, selecione o formato e configure medidas funcionais para pedido direto.",
  path: "/catalogo"
});

export default function CatalogPage() {
  return <ProductCatalog categories={productCategories} catalogOnly />;
}

