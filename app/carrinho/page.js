import { CartPage } from "@/components/cart-page";

export const metadata = {
  title: "Carrinho",
  description: "Revise as configurações de sapatas antes de criar o pedido e seguir para pagamento.",
  robots: {
    index: false,
    follow: true
  }
};

export default function CartRoute() {
  return <CartPage />;
}

