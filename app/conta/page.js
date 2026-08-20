import { AccountAccess, AccountDashboard } from "@/components/account-dashboard";
import { getAccountSession } from "@/lib/account-session";
import { toAccountOrder } from "@/lib/account-view";
import { listOrdersByEmail } from "@/lib/order-store";
import { isDemoSession } from "@/lib/demo-session";
import { DemoAccount } from "@/components/demo-account";

export const metadata = {
  title: "Minha conta",
  description: "Pedidos, pagamentos e dados da sua relação com a Baseforma."
};

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }) {
  if (await isDemoSession()) {
    return <DemoAccount />;
  }
  const session = await getAccountSession();

  if (!session) {
    const query = await searchParams;
    const initialOrderNumber = typeof query?.pedido === "string" ? query.pedido : "";
    return <AccountAccess initialOrderNumber={initialOrderNumber} />;
  }

  const orders = await listOrdersByEmail(session.email);
  return <AccountDashboard email={session.email} orders={orders.map(toAccountOrder)} />;
}
