import { AdminOrdersWorkspace } from "@/app/admin/orders-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin pedidos",
  description: "Painel integrado de pedidos, pagamentos, fila de impressao e expedicao Baseforma."
};

export default async function AdminOrdersPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  return (
    <AdminOrdersWorkspace
      searchParams={resolvedSearchParams}
      defaultFilter="todos"
      nextPath="/admin/pedidos"
    />
  );
}
