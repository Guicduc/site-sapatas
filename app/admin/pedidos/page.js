import Link from "next/link";
import { revalidatePath } from "next/cache";

import { AdminCadPanel } from "@/components/admin-cad-panel";
import { CAD_STATUS, getGrasshopperPayload, shouldRequireCad } from "@/lib/cad-contract";
import { formatCurrency } from "@/lib/format";
import { getStoreMode, listOrders, updateOrderCadState } from "@/lib/order-store";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin pedidos",
  description: "Painel operacional de pedidos Traço Base."
};

export default async function AdminOrdersPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token || "";

  if (!canViewAdmin(token)) {
    return (
      <section className="page-panel narrow-panel">
        <p className="eyebrow">Admin</p>
        <h1>Acesso restrito.</h1>
        <p className="lead">
          Configure `ADMIN_ACCESS_TOKEN` e acesse `/admin/pedidos?token=...` para ver os pedidos.
        </p>
      </section>
    );
  }

  const orders = await listOrders({ limit: 100 });

  return (
    <section className="admin-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Admin | {getStoreMode()}</p>
          <h1>Pedidos, pagamentos e revisoes tecnicas.</h1>
        </div>
        <Link className="button button-secondary" href="/">
          Voltar ao site
        </Link>
      </div>

      {orders.length === 0 ? (
        <article className="empty-cart">
          <h2>Nenhum pedido encontrado.</h2>
          <p>Crie um pedido pelo configurador ou salve um briefing especial.</p>
        </article>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => (
            <article className="surface-card admin-order-card" key={order.id}>
              <div className="admin-order-header">
                <div>
                  <p className="eyebrow">{order.source}</p>
                  <h2>{order.orderNumber}</h2>
                  <p>{order.customer.name} | {order.customer.contact}</p>
                </div>
                <div className="status-stack">
                  <span className="chip">{getOrderStatusLabel(order.status)}</span>
                  <span className="chip">{getPaymentStatusLabel(order.paymentStatus)}</span>
                  <strong>{formatCurrency(order.totalBrl)}</strong>
                </div>
              </div>

              {order.items.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Formato</th>
                        <th>Medidas</th>
                        <th>Qtd.</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.sku}</td>
                          <td>{item.formatName}</td>
                          <td>{formatValues(item.values)}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.totalPriceBrl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Pedido especial sem item precificado.</p>
              )}

              {order.technicalReviews?.length > 0 && (
                <details>
                  <summary>Revisao tecnica</summary>
                  <pre className="brief-preview">{order.technicalReviews[0].notes}</pre>
                </details>
              )}

              {shouldRequireCad(order) && (
                <AdminCadPanel
                  order={{
                    id: order.id,
                    orderNumber: order.orderNumber,
                    cad: order.metadata?.cad || {}
                  }}
                  payload={getGrasshopperPayload(order)}
                  action={registerCadFile}
                />
              )}

              {order.payments?.length > 0 && (
                <details>
                  <summary>Pagamento Mercado Pago</summary>
                  <dl className="admin-payment-grid">
                    <div>
                      <dt>Preferencia</dt>
                      <dd>{order.payments[0].providerPreferenceId || "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Pagamento</dt>
                      <dd>{order.payments[0].providerPaymentId || "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{getPaymentStatusLabel(order.payments[0].status)}</dd>
                    </div>
                  </dl>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function registerCadFile(formData) {
  "use server";

  const orderId = String(formData.get("orderId") || "");
  const cadFileName = String(formData.get("cadFileName") || "").trim();
  const cadModelVersion = String(formData.get("cadModelVersion") || "").trim();

  if (!orderId || !cadFileName || !cadModelVersion) {
    return;
  }

  await updateOrderCadState(orderId, {
    cadStatus: CAD_STATUS.READY_FOR_PRINT,
    cadFileName,
    cadModelVersion
  });
  revalidatePath("/admin/pedidos");
}

function canViewAdmin(token) {
  if (process.env.ADMIN_ACCESS_TOKEN) {
    return token && token === process.env.ADMIN_ACCESS_TOKEN;
  }

  return process.env.NODE_ENV !== "production";
}

function formatValues(values = {}) {
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${value} mm`)
    .join(" | ");
}

