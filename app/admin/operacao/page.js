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
  description: "Fila de producao, expedicao e nota fiscal manual Traco Base."
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
          <h1>Producao, expedicao e nota fiscal.</h1>
          <p>
            A capacidade e tratada como fila de producao por pedido, sem baixa de estoque tradicional.
          </p>
        </div>
        <div className="status-stack">
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

      <article className="surface-card admin-order-card">
        <div className="admin-order-header">
          <div>
            <p className="eyebrow">Fila operacional</p>
            <h2>{summary.orders} pedido(s) em capacidade</h2>
            <p>
              {summary.demandUnits} unidades de trabalho | capacidade diaria {summary.dailyCapacityUnits} |{" "}
              {summary.estimatedProductionDays} dia(s) estimados.
            </p>
          </div>
          <span className="chip">{summary.model}</span>
        </div>
      </article>

      {operationOrders.length === 0 ? (
        <article className="empty-cart">
          <h2>Nenhum pedido operacional encontrado.</h2>
          <p>Pedidos pagos e liberados para producao aparecerao nesta fila.</p>
        </article>
      ) : (
        <div className="admin-order-list">
          {operationOrders.map(({ order, fulfillment, queuePosition, capacity }) => (
            <article className="surface-card admin-order-card" key={order.id}>
              <div className="admin-order-header">
                <div>
                  <p className="eyebrow">
                    {queuePosition ? `Fila #${queuePosition}` : "Historico operacional"}
                  </p>
                  <h2>{order.orderNumber}</h2>
                  <p>{order.customer?.name || "Cliente"} | {order.customer?.contact || "sem contato"}</p>
                </div>
                <div className="status-stack">
                  <span className="chip">{getOrderStatusLabel(order.status)}</span>
                  <span className="chip">{getPaymentStatusLabel(order.paymentStatus)}</span>
                  <strong>{formatCurrency(order.totalBrl)}</strong>
                </div>
              </div>

              <dl className="admin-payment-grid">
                <div>
                  <dt>Producao</dt>
                  <dd>{getProductionStatusLabel(fulfillment.production.status)}</dd>
                </div>
                <div>
                  <dt>Nota fiscal</dt>
                  <dd>{getInvoiceStatusLabel(fulfillment.invoice.status)}</dd>
                </div>
                <div>
                  <dt>Expedicao</dt>
                  <dd>{getShipmentStatusLabel(fulfillment.shipment.status)}</dd>
                </div>
                <div>
                  <dt>Capacidade</dt>
                  <dd>
                    {capacity
                      ? `${capacity.demandUnits} un. trabalho | D+${capacity.estimatedDayOffset}`
                      : `${fulfillment.capacity.workUnits} un. trabalho`}
                  </dd>
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
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Formato</th>
                        <th>Qtd.</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.sku}</td>
                          <td>{item.formatName}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.totalPriceBrl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form className="cad-form" action={updateOperation}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="token" value={access.token} />
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
                <label className="field">
                  <span>Notas de producao</span>
                  <textarea name="productionNotes" defaultValue={fulfillment.production.notes} rows={3} />
                </label>
                <label className="field">
                  <span>Notas fiscais/expedicao</span>
                  <textarea
                    name="operationNotes"
                    defaultValue={[fulfillment.invoice.notes, fulfillment.shipment.notes].filter(Boolean).join("\n")}
                    rows={3}
                  />
                </label>
                <button className="button button-primary" type="submit">
                  Salvar operacao
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
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
