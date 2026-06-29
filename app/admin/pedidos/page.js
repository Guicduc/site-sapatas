import Link from "next/link";
import { revalidatePath } from "next/cache";

import { AdminAccessRequired } from "@/components/admin-access-required";
import { AdminCadPanel } from "@/components/admin-cad-panel";
import { AdminLogoutForm } from "@/components/admin-logout-form";
import { AdminPricingPanel } from "@/components/admin-pricing-panel";
import { adminHref, assertAdminAccess, getAdminAccess } from "@/lib/admin-session";
import { CAD_STATUS, getGrasshopperPayload, shouldRequireCad } from "@/lib/cad-contract";
import { formatCurrency } from "@/lib/format";
import { getOrderById, getStoreMode, listOrders, updateOrderCadState, updateOrderPricingState } from "@/lib/order-store";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin pedidos",
  description: "Painel operacional de pedidos Baseforma."
};

export default async function AdminOrdersPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token || "";
  const access = await getAdminAccess(token);

  if (!access.allowed) {
    return <AdminAccessRequired nextPath="/admin/pedidos" scope="os pedidos" />;
  }

  const orders = await listOrders({ limit: 100 });

  return (
    <section className="admin-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Admin | {getStoreMode()}</p>
          <h1>Pedidos, pagamentos e revisões técnicas.</h1>
        </div>
        <div className="admin-heading-actions">
          <Link className="button button-secondary" href={adminHref("/admin/relatorios", access)}>
            Ver relatorios
          </Link>
          <Link className="button button-secondary" href={adminHref("/admin/operacao", access)}>
            Ver operacao
          </Link>
          <Link className="button button-secondary" href="/">
            Voltar ao site
          </Link>
          <AdminLogoutForm />
        </div>
      </div>

      {orders.length === 0 ? (
        <article className="empty-cart">
          <h2>Nenhum pedido encontrado.</h2>
          <p>Crie um pedido pelo configurador ou salve um briefing especial.</p>
        </article>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => (
            <article className="surface-card admin-order-card" id={`order-${order.id}`} key={order.id}>
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

              {order.metadata?.commerce && (
                <dl className="checkout-totals admin-commerce-totals">
                  <div>
                    <dt>Produtos</dt>
                    <dd>{formatCurrency(order.metadata.commerce.itemsSubtotalBrl)}</dd>
                  </div>
                  <div>
                    <dt>Desconto</dt>
                    <dd>
                      {order.metadata.commerce.discount?.applied
                        ? `-${formatCurrency(order.metadata.commerce.discount.amountBrl)}`
                        : formatCurrency(0)}
                    </dd>
                  </div>
                  <div>
                    <dt>Frete</dt>
                    <dd>{formatCurrency(order.metadata.commerce.shipping?.amountBrl || 0)}</dd>
                  </div>
                  <div className="checkout-totals__total">
                    <dt>Total</dt>
                    <dd>{formatCurrency(order.metadata.commerce.totalBrl)}</dd>
                  </div>
                </dl>
              )}

              {order.technicalReviews?.length > 0 && (
                <details>
                  <summary>Revisão técnica</summary>
                  <pre className="brief-preview">{order.technicalReviews[0].notes}</pre>
                </details>
              )}

              {shouldRequireCad(order) && (
                <>
                  <AdminCadPanel
                    order={{
                      id: order.id,
                      orderNumber: order.orderNumber,
                      cad: order.metadata?.cad || {}
                    }}
                    payload={getGrasshopperPayload(order)}
                    action={registerCadFile}
                    token={access.token}
                  />
                  <AdminPricingPanel order={order} action={calculateOrcaPricing} token={access.token} />
                </>
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

  try {
    await assertAdminAccess(String(formData.get("token") || ""));
  } catch {
    return;
  }

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

async function calculateOrcaPricing(formData) {
  "use server";

  try {
    await assertAdminAccess(String(formData.get("token") || ""));
  } catch {
    return;
  }

  const orderId = String(formData.get("orderId") || "");

  if (!orderId) {
    return;
  }

  const order = await getOrderById(orderId);

  if (!order) {
    return;
  }

  try {
    const { priceOrderWithOrca } = await import("@/lib/orca-slicer");
    const pricing = await priceOrderWithOrca(order);
    await updateOrderPricingState(orderId, {
      ...pricing,
      error: null
    });
  } catch (error) {
    await updateOrderPricingState(orderId, {
      error: {
        code: error.code || "orca_pricing_failed",
        message: error.message || "Não foi possível calcular com Orca.",
        happenedAt: new Date().toISOString()
      }
    });
  }

  revalidatePath("/admin/pedidos");
}

function formatValues(values = {}) {
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${value} mm`)
    .join(" | ");
}

