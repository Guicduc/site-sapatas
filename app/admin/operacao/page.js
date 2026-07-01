import Link from "next/link";
import { revalidatePath } from "next/cache";

import { AdminAccessRequired } from "@/components/admin-access-required";
import { AdminLogoutForm } from "@/components/admin-logout-form";
import { adminHref, assertAdminAccess, getAdminAccess } from "@/lib/admin-session";
import {
  buildProductionQueue,
  getInvoiceStatusLabel,
  getProductionStatusLabel,
  getShipmentStatusLabel,
  INVOICE_STATUS,
  invoiceStatusOptions,
  normalizeFulfillment,
  PRODUCTION_STATUS,
  productionStatusOptions,
  SHIPMENT_STATUS,
  shipmentStatusOptions,
  summarizeProductionQueue
} from "@/lib/fulfillment";
import { formatCurrency } from "@/lib/format";
import { getStoreMode, listOrders, updateOrderFulfillmentState } from "@/lib/order-store";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin operacao",
  description: "Fila de producao, expedicao e nota fiscal manual Baseforma."
};

export default async function AdminOperationPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token || "";
  const access = await getAdminAccess(token);

  if (!access.allowed) {
    return <AdminAccessRequired nextPath="/admin/operacao" scope="a operacao" />;
  }

  const orders = await listOrders({ limit: 200 });
  const queue = buildProductionQueue(orders);
  const summary = summarizeProductionQueue(queue);
  const operationOrders = mergeQueueWithRecentOrders(queue, orders);

  return (
    <section className="admin-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Admin | {getStoreMode()} | operacao sob demanda</p>
          <h1>Operacao</h1>
          <p className="lead">Fila compacta para producao, nota fiscal manual e expedicao.</p>
        </div>
        <div className="admin-heading-actions">
          <Link className="button button-secondary" href={adminHref("/admin/pedidos", access)}>
            Ver pedidos
          </Link>
          <Link className="button button-secondary" href={adminHref("/admin/relatorios", access)}>
            Ver relatorios
          </Link>
          <Link className="button button-secondary" href="/">
            Voltar ao site
          </Link>
          <AdminLogoutForm />
        </div>
      </div>

      <div className="admin-overview-strip" aria-label="Resumo operacional">
        <article>
          <span>Pedidos em fila</span>
          <strong>{summary.orders}</strong>
        </article>
        <article>
          <span>Un. de trabalho</span>
          <strong>{summary.demandUnits}</strong>
        </article>
        <article>
          <span>Capacidade diaria</span>
          <strong>{summary.dailyCapacityUnits}</strong>
        </article>
        <article>
          <span>Dias estimados</span>
          <strong>{summary.estimatedProductionDays}</strong>
        </article>
      </div>

      {operationOrders.length === 0 ? (
        <article className="empty-cart">
          <h2>Nenhum pedido operacional encontrado.</h2>
          <p>Pedidos pagos e liberados para producao aparecerao nesta fila.</p>
        </article>
      ) : (
        <div className="admin-order-list">
          {operationOrders.map((item) => (
            <AdminOperationRow item={item} access={access} key={item.order.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function AdminOperationRow({ item, access }) {
  const { order, fulfillment, queuePosition, capacity } = item;
  const tone = getOperationTone(fulfillment);
  const action = getOperationAction(fulfillment, queuePosition);
  const productSummary = formatOrderProducts(order);

  return (
    <details className={`surface-card admin-order-card admin-order-row admin-order-row--${tone}`} id={`operation-${order.id}`}>
      <summary className="admin-order-summary admin-operation-summary">
        <span className={`admin-status-dot admin-status-dot--${tone}`} aria-hidden="true" />
        <span className="admin-order-summary__main">
          <span className="eyebrow">{queuePosition ? `Fila #${queuePosition}` : "Historico operacional"}</span>
          <strong>{order.orderNumber}</strong>
          <small>{productSummary}</small>
        </span>
        <span className="admin-order-summary__customer">
          <span>{order.customer?.name || "Cliente"}</span>
          <small>{order.customer?.contact || "Sem contato"}</small>
        </span>
        <span className="admin-order-summary__status">
          <span className={`admin-status-badge admin-status-badge--${tone}`}>
            {getProductionStatusLabel(fulfillment.production.status)}
          </span>
          <small>{getShipmentStatusLabel(fulfillment.shipment.status)}</small>
        </span>
        <span className="admin-order-summary__action">
          <span>{action}</span>
          <small>{getInvoiceStatusLabel(fulfillment.invoice.status)}</small>
        </span>
        <span className="admin-order-summary__total">
          <strong>{formatCurrency(order.totalBrl)}</strong>
          <small>{capacity ? `${capacity.demandUnits} un. trab. | D+${capacity.estimatedDayOffset}` : `${fulfillment.capacity.workUnits} un. trab.`}</small>
        </span>
      </summary>

      <div className="admin-order-expanded">
        <dl className="admin-order-snapshot">
          <div>
            <dt>Pedido</dt>
            <dd>{getOrderStatusLabel(order.status)}</dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>{getPaymentStatusLabel(order.paymentStatus)}</dd>
          </div>
          <div>
            <dt>Impressao estimada</dt>
            <dd>{formatMinutes(fulfillment.capacity.printMinutes)}</dd>
          </div>
          <div>
            <dt>Itens</dt>
            <dd>{fulfillment.capacity.units || order.items?.length || 0}</dd>
          </div>
        </dl>

        {order.items?.length > 0 && (
          <section className="admin-order-section">
            <h3>Itens em producao</h3>
            <div className="table-wrap">
              <table className="admin-items-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Produto</th>
                    <th>Qtd.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((orderItem) => (
                    <tr key={orderItem.id}>
                      <td>{orderItem.sku}</td>
                      <td>{formatProductName(orderItem)}</td>
                      <td>{orderItem.quantity}</td>
                      <td>{formatCurrency(orderItem.totalPriceBrl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <form className="cad-form operation-form" action={updateOperation}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="token" value={access.token} />

          <fieldset className="operation-form__group">
            <legend>Producao</legend>
            <label className="field">
              <span>Status producao</span>
              <select name="productionStatus" defaultValue={fulfillment.production.status}>
                {productionStatusOptions.map((status) => (
                  <option key={status} value={status}>{getProductionStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Prioridade</span>
              <select name="productionPriority" defaultValue={fulfillment.production.priority}>
                {["normal", "high", "urgent", "low"].map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Data programada</span>
              <input name="scheduledDate" type="date" defaultValue={fulfillment.production.scheduledDate} />
            </label>
            <label className="field">
              <span>Maquina</span>
              <input name="machine" defaultValue={fulfillment.production.machine} placeholder="P2S-04" />
            </label>
            <label className="field">
              <span>Operador</span>
              <input name="operator" defaultValue={fulfillment.production.operator} placeholder="Responsavel" />
            </label>
            <label className="field field-wide">
              <span>Notas de producao</span>
              <textarea name="productionNotes" defaultValue={fulfillment.production.notes} rows={3} />
            </label>
          </fieldset>

          <fieldset className="operation-form__group">
            <legend>Nota fiscal manual</legend>
            <label className="field">
              <span>NF manual</span>
              <select name="invoiceStatus" defaultValue={fulfillment.invoice.status}>
                {invoiceStatusOptions.map((status) => (
                  <option key={status} value={status}>{getInvoiceStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Numero NF</span>
              <input name="invoiceNumber" defaultValue={fulfillment.invoice.number} placeholder="000123" />
            </label>
            <label className="field">
              <span>Serie NF</span>
              <input name="invoiceSeries" defaultValue={fulfillment.invoice.series} placeholder="1" />
            </label>
            <label className="field">
              <span>Chave de acesso</span>
              <input name="invoiceAccessKey" defaultValue={fulfillment.invoice.accessKey} placeholder="44 digitos" />
            </label>
            <label className="field">
              <span>Emissao NF</span>
              <input name="invoiceIssuedAt" type="datetime-local" defaultValue={toDateTimeLocal(fulfillment.invoice.issuedAt)} />
            </label>
          </fieldset>

          <fieldset className="operation-form__group">
            <legend>Expedicao</legend>
            <label className="field">
              <span>Status expedicao</span>
              <select name="shipmentStatus" defaultValue={fulfillment.shipment.status}>
                {shipmentStatusOptions.map((status) => (
                  <option key={status} value={status}>{getShipmentStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Transportadora</span>
              <input name="carrier" defaultValue={fulfillment.shipment.carrier} placeholder="Manual / Correios / Retirada" />
            </label>
            <label className="field">
              <span>Rastreio</span>
              <input name="trackingCode" defaultValue={fulfillment.shipment.trackingCode} placeholder="Codigo de rastreio" />
            </label>
            <label className="field">
              <span>Saida</span>
              <input name="shippedAt" type="datetime-local" defaultValue={toDateTimeLocal(fulfillment.shipment.shippedAt)} />
            </label>
            <label className="field field-wide">
              <span>Notas fiscais/expedicao</span>
              <textarea
                name="operationNotes"
                defaultValue={[fulfillment.invoice.notes, fulfillment.shipment.notes].filter(Boolean).join("\n")}
                rows={3}
              />
            </label>
          </fieldset>

          <button className="button button-primary" type="submit">
            Salvar operacao
          </button>
        </form>
      </div>
    </details>
  );
}

async function updateOperation(formData) {
  "use server";

  try {
    await assertAdminAccess(cleanFormValue(formData.get("token")));
  } catch {
    return;
  }

  const orderId = cleanFormValue(formData.get("orderId"));
  if (!orderId) return;

  const operationNotes = cleanFormValue(formData.get("operationNotes"));
  await updateOrderFulfillmentState(orderId, {
    production: {
      status: cleanFormValue(formData.get("productionStatus")) || PRODUCTION_STATUS.QUEUED,
      priority: cleanFormValue(formData.get("productionPriority")) || "normal",
      scheduledDate: cleanFormValue(formData.get("scheduledDate")),
      machine: cleanFormValue(formData.get("machine")),
      operator: cleanFormValue(formData.get("operator")),
      notes: cleanFormValue(formData.get("productionNotes"))
    },
    invoice: {
      status: cleanFormValue(formData.get("invoiceStatus")) || INVOICE_STATUS.PENDING,
      number: cleanFormValue(formData.get("invoiceNumber")),
      series: cleanFormValue(formData.get("invoiceSeries")),
      accessKey: cleanFormValue(formData.get("invoiceAccessKey")),
      issuedAt: cleanFormValue(formData.get("invoiceIssuedAt")),
      notes: operationNotes
    },
    shipment: {
      status: cleanFormValue(formData.get("shipmentStatus")) || SHIPMENT_STATUS.PENDING,
      carrier: cleanFormValue(formData.get("carrier")),
      trackingCode: cleanFormValue(formData.get("trackingCode")),
      shippedAt: cleanFormValue(formData.get("shippedAt")),
      notes: operationNotes
    }
  });

  revalidatePath("/admin/operacao");
  revalidatePath("/admin/pedidos");
}

function mergeQueueWithRecentOrders(queue, orders) {
  const queuedIds = new Set(queue.map((item) => item.order.id));
  const recentOperational = orders
    .filter((order) => !queuedIds.has(order.id))
    .map((order) => ({ order, fulfillment: normalizeFulfillment(order), queuePosition: null, capacity: null }))
    .filter(({ fulfillment }) => {
      return [
        PRODUCTION_STATUS.SHIPPED,
        PRODUCTION_STATUS.WAITING_CAD,
        PRODUCTION_STATUS.WAITING_PAYMENT
      ].includes(fulfillment.production.status)
        || fulfillment.invoice.status !== INVOICE_STATUS.PENDING
        || fulfillment.shipment.status !== SHIPMENT_STATUS.PENDING;
    })
    .slice(0, 25);

  return [...queue, ...recentOperational];
}

function getOperationTone(fulfillment) {
  if (
    fulfillment.production.status === PRODUCTION_STATUS.CANCELLED ||
    fulfillment.shipment.status === SHIPMENT_STATUS.CANCELLED
  ) {
    return "danger";
  }

  if (fulfillment.production.status === PRODUCTION_STATUS.BLOCKED) return "danger";

  if (
    fulfillment.production.status === PRODUCTION_STATUS.WAITING_PAYMENT ||
    fulfillment.production.status === PRODUCTION_STATUS.WAITING_CAD ||
    fulfillment.invoice.status === INVOICE_STATUS.MANUAL_PENDING
  ) {
    return "warning";
  }

  if (
    fulfillment.production.status === PRODUCTION_STATUS.SHIPPED ||
    fulfillment.shipment.status === SHIPMENT_STATUS.SHIPPED ||
    fulfillment.shipment.status === SHIPMENT_STATUS.DELIVERED
  ) {
    return "success";
  }

  return "info";
}

function getOperationAction(fulfillment, queuePosition) {
  if (fulfillment.production.status === PRODUCTION_STATUS.WAITING_PAYMENT) return "Aguardar pagamento";
  if (fulfillment.production.status === PRODUCTION_STATUS.WAITING_CAD) return "Aguardar CAD";
  if (fulfillment.production.status === PRODUCTION_STATUS.BLOCKED) return "Resolver bloqueio";
  if (fulfillment.production.status === PRODUCTION_STATUS.QUEUED) return queuePosition ? `Produzir fila #${queuePosition}` : "Colocar em producao";
  if (fulfillment.production.status === PRODUCTION_STATUS.SCHEDULED) return "Conferir agenda";
  if (fulfillment.production.status === PRODUCTION_STATUS.IN_PRODUCTION) return "Acompanhar impressao";
  if (fulfillment.production.status === PRODUCTION_STATUS.QUALITY_CHECK) return "Fazer inspecao";
  if (fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP) return "Expedir pedido";
  if (fulfillment.shipment.status === SHIPMENT_STATUS.SHIPPED) return "Acompanhar entrega";
  return "Atualizar operacao";
}

function formatOrderProducts(order) {
  if (!order.items?.length) return "Pedido especial";

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

function cleanFormValue(value) {
  return String(value || "").trim();
}

function formatMinutes(minutes) {
  const safeMinutes = Math.round(Number(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (!hours) return `${remainder} min`;
  return `${hours} h ${String(remainder).padStart(2, "0")} min`;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toISOString().slice(0, 16);
}
