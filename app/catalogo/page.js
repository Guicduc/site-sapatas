import { ProductCatalog } from "@/components/product-catalog";
import { productCategories } from "@/lib/configurator-data";

export const metadata = {
  title: "Catálogo configurável",
  description:
    "Escolha uma categoria de sapata, selecione o formato e configure medidas funcionais para pedido direto."
};

export default function CatalogPage() {
  return <ProductCatalog categories={productCategories} catalogOnly />;
}

