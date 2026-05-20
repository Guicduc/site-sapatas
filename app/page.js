import { ProductCatalog } from "@/components/product-catalog";
import { productCategories } from "@/lib/configurator-data";

export const metadata = {
  title: "Configurador de sapatas sob medida",
  description:
    "Configure ponteiras internas para tubo e sapatas para base lisa com medidas cotadas, preço estimado e pedido próprio."
};

export default function HomePage() {
  return <ProductCatalog categories={productCategories} />;
}

