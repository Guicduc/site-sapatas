import { AccountAccess, AccountDashboard } from "@/components/account-dashboard";
import { getAccountSession } from "@/lib/account-session";
import { toAccountOrder } from "@/lib/account-view";
import { listOrdersByEmail } from "@/lib/order-store";

export const metadata = {
  title: "Minha conta",
  description: "Pedidos, pagamentos e dados da sua relação com a Baseforma."
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getAccountSession();

  if (!session) {
    return <AccountAccess />;
  }

  const orders = await listOrdersByEmail(session.email);
  return <AccountDashboard email={session.email} orders={orders.map(toAccountOrder)} />;
}
