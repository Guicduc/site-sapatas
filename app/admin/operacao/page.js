import { AdminOrdersWorkspace } from "@/app/admin/orders-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin operacao",
  description: "Compatibilidade para a fila de impressao integrada aos pedidos Baseforma."
};

export default async function AdminOperationPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  return (
    <AdminOrdersWorkspace
      searchParams={resolvedSearchParams}
      defaultFilter="operacao"
      nextPath="/admin/operacao"
    />
  );
}
