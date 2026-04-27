import { OrderConfirmation } from "@/components/order-confirmation";

export const metadata = {
  title: "Pedido confirmado",
  description: "Status do pedido de sapatas configuradas."
};

export default async function OrderConfirmedPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return <OrderConfirmation initialOrderId={resolvedSearchParams?.orderId || ""} />;
}
