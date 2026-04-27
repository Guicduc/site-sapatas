import { CartPage } from "@/components/cart-page";

export const metadata = {
  title: "Carrinho",
  description: "Revise as configuracoes de sapatas antes de criar o pedido e seguir para pagamento."
};

export default function CartRoute() {
  return <CartPage />;
}

