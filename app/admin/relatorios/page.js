import Link from "next/link";

import { AdminAccessRequired } from "@/components/admin-access-required";
import { AdminLogoutForm } from "@/components/admin-logout-form";
import { adminHref, getAdminAccess } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format";
import { buildOrderAnalytics } from "@/lib/order-analytics";
import { getStoreMode, listOrders } from "@/lib/order-store";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin relatorios",
  description: "Relatorios comerciais basicos da operacao Baseforma."
};

export default async function AdminReportsPage() {
  const access = await getAdminAccess();

  if (!access.allowed) {
    return <AdminAccessRequired nextPath="/admin/relatorios" scope="os relatorios" />;
  }

  const orders = await listOrders({ limit: 500 });
  const analytics = buildOrderAnalytics(orders);
  const maxDailyRevenue = Math.max(...analytics.daily.map((day) => day.totalBrl), 1);

  return (
    <section className="admin-shell admin-reports">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Admin | {getStoreMode()} | {analytics.period.label}</p>
          <h1>Relatorios comerciais.</h1>
          <p className="lead">
            Pedidos, receita, pagamentos, descontos e frete a partir dos ultimos pedidos registrados.
          </p>
        </div>
        <div className="admin-heading-actions">
          <Link className="button button-secondary" href={adminHref("/admin/pedidos")}>
            Ver pedidos
          </Link>
          <Link className="button button-secondary" href={adminHref("/admin/operacao")}>
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
          <p>Os indicadores aparecem quando houver pedidos criados pelo configurador ou briefing especial.</p>
        </article>
      ) : (
        <>
          <section className="report-metric-grid" aria-label="Resumo comercial">
            <MetricCard label="Receita aprovada" value={formatCurrency(analytics.summary.approvedRevenueBrl)} detail={`${analytics.summary.approvedOrdersCount} pedidos pagos`} />
            <MetricCard label="Total cobrado" value={formatCurrency(analytics.summary.totalBrl)} detail={`${analytics.summary.ordersCount} pedidos capturados`} />
            <MetricCard label="Ticket medio" value={formatCurrency(analytics.summary.averageTicketBrl)} detail={`${analytics.summary.itemsCount} unidades vendidas`} />
            <MetricCard label="Ajustes comerciais" value={formatCurrency(analytics.summary.shippingBrl - analytics.summary.discountBrl)} detail={`${formatCurrency(analytics.summary.shippingBrl)} frete, ${formatCurrency(analytics.summary.discountBrl)} desconto`} />
          </section>

          <section className="report-split">
            <article className="surface-card report-panel">
              <div className="report-panel__heading">
                <div>
                  <p className="eyebrow">Pagamentos</p>
                  <h2>Status de cobranca</h2>
                </div>
                <span className="chip">{analytics.summary.pendingPaymentCount} pendentes</span>
              </div>
              <CountList
                items={analytics.paymentCounts}
                labelForKey={getPaymentStatusLabel}
                total={analytics.summary.ordersCount}
              />
            </article>

            <article className="surface-card report-panel">
              <div className="report-panel__heading">
                <div>
                  <p className="eyebrow">Operacao</p>
                  <h2>Status de pedidos</h2>
                </div>
                <span className="chip">{analytics.summary.failedPaymentCount} falhas</span>
              </div>
              <CountList
                items={analytics.statusCounts}
                labelForKey={getOrderStatusLabel}
                total={analytics.summary.ordersCount}
              />
            </article>
          </section>

          <section className="report-split report-split--wide">
            <article className="surface-card report-panel">
              <div className="report-panel__heading">
                <div>
                  <p className="eyebrow">Ultimos 30 dias</p>
                  <h2>Movimento diario</h2>
                </div>
                <strong>{formatCurrency(analytics.last30Days.totalBrl)}</strong>
              </div>
              <div className="daily-report-list">
                {analytics.daily.length > 0 ? (
                  analytics.daily.map((day) => (
                    <div className="daily-report-row" key={day.date}>
                      <span>{formatShortDate(day.date)}</span>
                      <div aria-hidden="true">
                        <span style={{ "--bar-size": `${Math.max(4, (day.totalBrl / maxDailyRevenue) * 100)}%` }} />
                      </div>
                      <strong>{formatCurrency(day.totalBrl)}</strong>
                      <small>{day.ordersCount} ped.</small>
                    </div>
                  ))
                ) : (
                  <p className="admin-note">Sem pedidos no periodo.</p>
                )}
              </div>
            </article>

            <article className="surface-card report-panel">
              <div className="report-panel__heading">
                <div>
                  <p className="eyebrow">Origem</p>
                  <h2>Canais registrados</h2>
                </div>
              </div>
              <CountList
                items={analytics.sourceCounts}
                labelForKey={formatSource}
                total={analytics.summary.ordersCount}
              />
            </article>
          </section>

          <article className="surface-card report-panel">
            <div className="report-panel__heading">
              <div>
                <p className="eyebrow">Lista compacta</p>
                <h2>Pedidos recentes</h2>
              </div>
              <span className="chip">Top {analytics.recentOrders.length}</span>
            </div>
            <div className="table-wrap">
              <table className="compact-report-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Pagamento</th>
                    <th>Produtos</th>
                    <th>Desconto</th>
                    <th>Frete</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`${adminHref("/admin/pedidos")}#order-${encodeURIComponent(order.id)}`}>
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td>{order.customerName}</td>
                      <td>{formatShortDate(order.createdAt)}</td>
                      <td>{getOrderStatusLabel(order.status)}</td>
                      <td>{getPaymentStatusLabel(order.paymentStatus)}</td>
                      <td>{formatCurrency(order.productsBrl)}</td>
                      <td>{order.discountBrl > 0 ? `-${formatCurrency(order.discountBrl)}` : formatCurrency(0)}</td>
                      <td>{formatCurrency(order.shippingBrl)}</td>
                      <td><strong>{formatCurrency(order.totalBrl)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function CountList({ items, labelForKey, total }) {
  return (
    <div className="report-count-list">
      {items.map((item) => {
        const percentage = total ? Math.round((item.count / total) * 100) : 0;
        return (
          <div className="report-count-row" key={item.key}>
            <span>{labelForKey(item.key)}</span>
            <div aria-hidden="true">
              <span style={{ "--bar-size": `${Math.max(4, percentage)}%` }} />
            </div>
            <strong>{item.count}</strong>
            <small>{percentage}%</small>
          </div>
        );
      })}
    </div>
  );
}

function formatShortDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

function formatSource(source) {
  const labels = {
    configurator: "Configurador",
    special_request: "Briefing especial"
  };

  return labels[source] || source || "Sem origem";
}
