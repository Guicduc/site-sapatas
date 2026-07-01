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
import { ORDER_STATUS, PAYMENT_STATUS, getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

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
  const overview = buildOrdersOverview(orders);

  return (
    <section className="admin-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Admin | {getStoreMode()}</p>
          <h1>Pedidos</h1>
          <p className="lead">Fila operacional com status, pagamento e proxima acao de cada pedido.</p>
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

      <div className="admin-overview-strip" aria-label="Resumo dos pedidos">
        <article>
          <span>Pedidos listados</span>
          <strong>{overview.total}</strong>
        </article>
        <article>
          <span>Aguardam pagamento</span>
          <strong>{overview.waitingPayment}</strong>
        </article>
        <article>
          <span>Precisam de revisao</span>
          <strong>{overview.needsReview}</strong>
        </article>
        <article>
          <span>Receita aprovada</span>
          <strong>{formatCurrency(overview.approvedRevenueBrl)}</strong>
        </article>
      </div>

      {orders.length === 0 ? (
        <article className="empty-cart">
          <h2>Nenhum pedido encontrado.</h2>
          <p>Crie um pedido pelo configurador ou salve um briefing especial.</p>
        </article>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => (
            <AdminOrderCard order={order} access={access} key={order.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function AdminOrderCard({ order, access }) {
  const requiresCad = shouldRequireCad(order);
  const nextAction = getNextOrderAction(order, requiresCad);
  const payment = order.payments?.[0];
  const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const productSummary = formatOrderProducts(order);

  return (
    <details className={`surface-card admin-order-card admin-order-row admin-order-row--${nextAction.tone}`} id={`order-${order.id}`}>
      <summary className="admin-order-summary">
        <span className={`admin-status-dot admin-status-dot--${nextAction.tone}`} aria-hidden="true" />
        <span className="admin-order-summary__main">
          <span className="eyebrow">{formatSource(order.source)}</span>
          <strong>{order.orderNumber}</strong>
          <small>{productSummary}</small>
        </span>
        <span className="admin-order-summary__customer">
          <span>{order.customer.name || "Sem nome"}</span>
          <small>{formatDateTime(order.createdAt)}</small>
        </span>
        <span className="admin-order-summary__status">
          <span className={`admin-status-badge admin-status-badge--${nextAction.tone}`}>
            {getOrderStatusLabel(order.status)}
          </span>
          <small>{getPaymentStatusLabel(order.paymentStatus)}</small>
        </span>
        <span className="admin-order-summary__action">
          <span>{nextAction.title}</span>
          <small>{itemCount || order.items.length} un.</small>
        </span>
        <span className="admin-order-summary__total">
          <strong>{formatCurrency(order.totalBrl)}</strong>
          <small>Ver detalhes</small>
        </span>
      </summary>

      <div className="admin-order-expanded">
        <section className={`admin-next-action admin-next-action--${nextAction.tone}`}>
          <span aria-hidden="true" />
          <div>
            <p>Proxima acao</p>
            <strong>{nextAction.title}</strong>
            <small>{nextAction.detail}</small>
          </div>
        </section>

        <dl className="admin-order-snapshot">
          <div>
            <dt>Cliente</dt>
            <dd>{order.customer.name || "Sem nome"}</dd>
          </div>
          <div>
            <dt>Contato</dt>
            <dd>{order.customer.contact || "Sem contato"}</dd>
          </div>
          <div>
            <dt>Status do pedido</dt>
            <dd>{getOrderStatusLabel(order.status)}</dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>{getPaymentStatusLabel(order.paymentStatus)}</dd>
          </div>
        </dl>

        <div className="admin-order-detail-grid">
          <section className="admin-order-section">
            <h3>Itens e medidas</h3>
          {order.items.length > 0 ? (
            <div className="table-wrap">
              <table className="admin-items-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Produto</th>
                    <th>Medidas</th>
                    <th>Qtd.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sku}</td>
                      <td>{formatProductName(item)}</td>
                      <td>{formatValues(item.values)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.totalPriceBrl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-note">Pedido especial sem item precificado.</p>
          )}
          </section>

          {order.metadata?.commerce && (
            <section className="admin-commerce-summary" aria-labelledby={`commerce-${order.id}`}>
              <h3 id={`commerce-${order.id}`}>Valores</h3>
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
            </section>
          )}
        </div>

        {order.technicalReviews?.length > 0 && (
          <details className="admin-order-section">
            <summary>Revisao tecnica</summary>
            <pre className="brief-preview">{order.technicalReviews[0].notes}</pre>
          </details>
        )}

        {requiresCad && (
          <section className="admin-workflow-panels" aria-label="CAD e precificacao">
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
          </section>
        )}

        {payment && (
          <details className="admin-order-section">
            <summary>Pagamento Mercado Pago</summary>
            <dl className="admin-payment-grid">
              <div>
                <dt>Preferencia</dt>
                <dd>{payment.providerPreferenceId || "N/A"}</dd>
              </div>
              <div>
                <dt>Pagamento</dt>
                <dd>{payment.providerPaymentId || "N/A"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{getPaymentStatusLabel(payment.status)}</dd>
              </div>
            </dl>
          </details>
        )}
      </div>
    </details>
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
        message: error.message || "Nao foi possivel calcular com Orca.",
        happenedAt: new Date().toISOString()
      }
    });
  }

  revalidatePath("/admin/pedidos");
}

function buildOrdersOverview(orders) {
  return orders.reduce(
    (summary, order) => {
      summary.total += 1;

      if (order.paymentStatus !== PAYMENT_STATUS.APPROVED) {
        summary.waitingPayment += 1;
      }

      if ([ORDER_STATUS.NEEDS_TECHNICAL_REVIEW, ORDER_STATUS.PAID_PENDING_REVIEW, ORDER_STATUS.CAD_PENDING].includes(order.status)) {
        summary.needsReview += 1;
      }

      if (order.paymentStatus === PAYMENT_STATUS.APPROVED) {
        summary.approvedRevenueBrl += Number(order.totalBrl || 0);
      }

      return summary;
    },
    { total: 0, waitingPayment: 0, needsReview: 0, approvedRevenueBrl: 0 }
  );
}

function getNextOrderAction(order, requiresCad) {
  if (order.status === ORDER_STATUS.CANCELLED || order.paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return {
      tone: "danger",
      title: "Pedido cancelado",
      detail: "Nao envie para producao. Consulte o historico antes de qualquer nova acao."
    };
  }

  if (order.status === ORDER_STATUS.SHIPPED) {
    return {
      tone: "success",
      title: "Pedido expedido",
      detail: "Use a area de operacao para conferir rastreio e fechamento."
    };
  }

  if ([PAYMENT_STATUS.REJECTED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.REFUNDED].includes(order.paymentStatus)) {
    return {
      tone: "danger",
      title: "Retomar cobranca",
      detail: "Pagamento nao aprovado. Oriente o cliente a refazer o pagamento antes da producao."
    };
  }

  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED) {
    return {
      tone: "warning",
      title: "Aguardar pagamento",
      detail: "O pedido esta registrado, mas ainda nao deve entrar na fila produtiva."
    };
  }

  if ([ORDER_STATUS.NEEDS_TECHNICAL_REVIEW, ORDER_STATUS.PAID_PENDING_REVIEW].includes(order.status)) {
    return {
      tone: "warning",
      title: "Concluir revisao tecnica",
      detail: "Valide medidas, observacoes e viabilidade antes de liberar CAD ou producao."
    };
  }

  if (requiresCad) {
    const cad = order.metadata?.cad || {};
    const pricing = order.metadata?.pricing || {};

    if (!cad.fileName) {
      return {
        tone: "warning",
        title: "Registrar STL do pedido",
        detail: "Copie o payload CAD, gere o arquivo no Rhino/Grasshopper e registre o STL."
      };
    }

    if (pricing.error) {
      return {
        tone: "danger",
        title: "Corrigir precificacao Orca",
        detail: pricing.error.message || "Revise o arquivo e execute o calculo novamente."
      };
    }

    if (!pricing.calculatedAt && !pricing.suggestedPriceBrl) {
      return {
        tone: "info",
        title: "Calcular custo real no Orca",
        detail: "O STL esta registrado. Rode a precificacao antes de confirmar margem e fila."
      };
    }
  }

  if (order.status === ORDER_STATUS.IN_PRODUCTION) {
    return {
      tone: "info",
      title: "Acompanhar producao",
      detail: "Atualize capacidade, nota fiscal e expedicao na area de operacao."
    };
  }

  return {
    tone: "success",
    title: "Acompanhar operacao",
    detail: "Pagamento aprovado. Siga a fila de producao, nota fiscal e expedicao."
  };
}

const PARAMETER_LABELS = {
  altura: "Altura",
  alturaApoio: "Altura de apoio",
  alturaBase: "Altura da base",
  alturaInterna: "Altura interna",
  comprimento: "Comprimento",
  diametro: "Diametro",
  diametroBase: "Diametro da base",
  diametroInterno: "Diametro interno",
  distanciaFuros: "Distancia entre furos",
  largura: "Largura",
  larguraInterna: "Largura interna",
  parede: "Parede",
  profundidadeInsercao: "Profundidade de insercao",
  raioCanto: "Raio do canto"
};

function formatValues(values = {}) {
  return Object.entries(values)
    .map(([key, value]) => `${formatParameterLabel(key)}: ${formatParameterValue(value)}`)
    .join(" | ");
}

function formatOrderProducts(order) {
  if (!order.items.length) return "Pedido especial";

  const [firstItem, ...remainingItems] = order.items;
  const firstName = formatProductName(firstItem);

  if (!remainingItems.length) return firstName;

  return `${firstName} + ${remainingItems.length} item${remainingItems.length > 1 ? "s" : ""}`;
}

function formatProductName(item) {
  const hasStem = Boolean(
    item.values?.haste ||
    item.values?.pescoco ||
    Number(item.values?.alturaHaste || 0) > 0 ||
    Number(item.values?.alturaPescoco || 0) > 0
  );

  const productNames = {
    "ponteira-interna-tubo:redondo": "Sapata interna tubo redondo",
    "ponteira-interna-tubo:quadrado": "Sapata interna tubo quadrado",
    "ponteira-interna-tubo:retangular": "Sapata interna tubo retangular",
    "ponteira-interna-tubo:oblongo": "Sapata interna tubo oblongo",
    "sapata-base-lisa:redonda": `Sapata lisa redonda${hasStem ? " com haste" : ""}`,
    "sapata-base-lisa:quadrada": `Sapata lisa quadrada${hasStem ? " com haste" : ""}`,
    "sapata-base-lisa:oblonga": `Sapata lisa oblonga${hasStem ? " com haste" : ""}`,
    "sapata-base-lisa:retangular": `Sapata lisa retangular${hasStem ? " com haste" : ""}`
  };

  const key = `${item.categorySlug}:${item.formatSlug}`;
  if (productNames[key]) return productNames[key];

  return [item.categoryName, item.formatName].filter(Boolean).join(" | ") || item.sku || "Produto sem nome";
}

function formatParameterLabel(key) {
  return PARAMETER_LABELS[key] || String(key).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function formatParameterValue(value) {
  if (typeof value === "boolean") return value ? "sim" : "nao";
  if (value === null || value === undefined || value === "") return "N/A";

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `${value} mm`;

  return String(value);
}

function formatSource(source) {
  const labels = {
    checkout: "Checkout",
    special_request: "Pedido especial"
  };

  return labels[source] || source || "Origem nao informada";
}

function formatDateTime(value) {
  if (!value) return "data nao informada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data nao informada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
