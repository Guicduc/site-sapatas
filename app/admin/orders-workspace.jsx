import Link from "next/link";
import { revalidatePath } from "next/cache";

import { AdminAccessRequired } from "@/components/admin-access-required";
import { AdminCadPanel } from "@/components/admin-cad-panel";
import { AdminLogoutForm } from "@/components/admin-logout-form";
import { AdminPricingPanel } from "@/components/admin-pricing-panel";
import { adminHref, assertAdminAccess, getAdminAccess } from "@/lib/admin-session";
import { CAD_STATUS, getGrasshopperPayload, shouldRequireCad } from "@/lib/cad-contract";
import {
  buildProductionQueue,
  getInvoiceStatusLabel,
  getShipmentStatusLabel,
  INVOICE_STATUS,
  normalizeFulfillment,
  PRODUCTION_STATUS,
  SHIPMENT_STATUS,
} from "@/lib/fulfillment";
import { formatCurrency } from "@/lib/format";
import {
  getOrderById,
  getStoreMode,
  listOrders,
  updateOrderCadState,
  updateOrderFulfillmentState,
  updateOrderPricingState
} from "@/lib/order-store";
import { ORDER_STATUS, PAYMENT_STATUS, getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "pagamento", label: "Pagamento" },
  { id: "impressao", label: "Fila de impressao" },
  { id: "expedicao", label: "Expedicao" },
  { id: "concluidos", label: "Concluidos" }
];

const SIMPLE_PRODUCTION_OPTIONS = [
  {
    value: PRODUCTION_STATUS.QUEUED,
    label: "Aguardando",
    description: "Pedido aguardando inicio de impressao.",
    tone: "info"
  },
  {
    value: PRODUCTION_STATUS.IN_PRODUCTION,
    label: "Imprimindo",
    description: "Producao em andamento na mesa/impressora.",
    tone: "warning"
  },
  {
    value: PRODUCTION_STATUS.READY_TO_SHIP,
    label: "Pronto para expedir",
    description: "Impressao concluida.",
    tone: "success"
  }
];

const SIMPLE_INVOICE_OPTIONS = [
  { value: INVOICE_STATUS.PENDING, label: "NF pendente" },
  { value: INVOICE_STATUS.MANUAL_PENDING, label: "NF manual pendente" },
  { value: INVOICE_STATUS.MANUAL_ISSUED, label: "NF manual emitida" }
];

const SIMPLE_SHIPMENT_OPTIONS = [
  { value: SHIPMENT_STATUS.PENDING, label: "Aguardando expedicao" },
  { value: SHIPMENT_STATUS.READY_FOR_PICKUP, label: "Pronto para expedir" },
  { value: SHIPMENT_STATUS.SHIPPED, label: "Expedido" }
];

export async function AdminOrdersWorkspace({ searchParams, defaultFilter = "todos", nextPath = "/admin/pedidos" }) {
  const token = searchParams?.token || "";
  const access = await getAdminAccess(token);

  if (!access.allowed) {
    return <AdminAccessRequired nextPath={nextPath} scope="os pedidos" />;
  }

  const activeFilter = normalizeFilter(searchParams?.fila || searchParams?.tab || defaultFilter);
  const orders = await listOrders({ limit: 200 });
  const queue = buildProductionQueue(orders);
  const rows = buildOrderRows(orders, queue);
  const printQueueRows = buildPrintQueueRows(rows);
  const printQueueSummary = summarizePrintQueueRows(printQueueRows);
  const counts = countFilters(rows);
  const filteredRows = rows.filter((row) => row.filters.includes(activeFilter));
  const overview = buildOrdersOverview(orders, rows, printQueueRows);

  return (
    <section className="admin-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Admin | {getStoreMode()} | pedidos e operacao</p>
          <h1>Pedidos</h1>
          <p className="lead">
            Pedidos, pagamentos, fila de impressao e expedicao em uma ficha unica.
          </p>
        </div>
        <div className="admin-heading-actions">
          <Link className="button button-secondary" href={adminHref("/admin/relatorios", access)}>
            Ver relatorios
          </Link>
          <Link className="button button-secondary" href="/">
            Voltar ao site
          </Link>
          <AdminLogoutForm />
        </div>
      </div>

      <div className="admin-overview-strip" aria-label="Resumo integrado dos pedidos">
        <article>
          <span>Pedidos listados</span>
          <strong>{overview.total}</strong>
        </article>
        <article>
          <span>Sem pagamento</span>
          <strong>{overview.waitingPayment}</strong>
        </article>
        <article>
          <span>Fila de impressao</span>
          <strong>{overview.printQueue}</strong>
        </article>
        <article>
          <span>Prontos para expedir</span>
          <strong>{overview.readyToShip}</strong>
        </article>
        <article>
          <span>Concluidos</span>
          <strong>{overview.completed}</strong>
        </article>
      </div>

      <nav className="admin-workspace-tabs" aria-label="Filtrar pedidos por etapa">
        {FILTERS.map((filter) => (
          <Link
            className={`admin-workspace-tab${activeFilter === filter.id ? " is-active" : ""}`}
            href={adminHref(`/admin/pedidos?fila=${filter.id}`, access)}
            aria-current={activeFilter === filter.id ? "page" : undefined}
            key={filter.id}
          >
            <span>{filter.label}</span>
            <strong>{counts[filter.id] || 0}</strong>
          </Link>
        ))}
      </nav>

      {activeFilter === "impressao" && (
        <PrintQueuePanel rows={printQueueRows} queueSummary={printQueueSummary} access={access} />
      )}

      {activeFilter === "impressao" ? null : filteredRows.length === 0 ? (
        <article className="empty-cart">
          <h2>Nenhum pedido nesta etapa.</h2>
          <p>Quando um pedido entrar em {getFilterEmptyLabel(activeFilter)}, ele aparecera nesta lista.</p>
        </article>
      ) : (
        <div className="admin-order-list">
          {filteredRows.map((row) => (
            <AdminOrderCard row={row} access={access} activeFilter={activeFilter} key={row.order.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function PrintQueuePanel({ rows, queueSummary, access }) {
  return (
    <section className="admin-print-queue" aria-labelledby="print-queue-heading">
      <div className="admin-section-heading">
        <div>
          <h2 id="print-queue-heading">Fila de impressao</h2>
          <p>Pedidos pagos e liberados para impressao entram aqui. A posicao segue prioridade e data programada.</p>
        </div>
        <span title="Unidades de trabalho estimadas e dias de capacidade da fila">
          {queueSummary.demandUnits} un. trab. | {queueSummary.estimatedProductionDays} dia(s)
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="admin-note">Nenhum pedido pago esta aguardando impressao.</p>
      ) : (
        <ol className="admin-print-queue__list">
          {rows.map((row) => (
            <li className="admin-print-queue__item" key={row.order.id}>
              <details className="admin-print-queue__details">
                <summary className="admin-print-queue__summary">
                  <strong>{row.queuePosition ? `#${row.queuePosition}` : "Sem posicao"}</strong>
                  <span>
                    {row.order.orderNumber}
                    <small>{row.order.customer.name || "Cliente"} | {formatOrderProducts(row.order)}</small>
                  </span>
                  <em>{formatProductionStage(row.fulfillment.production.status)}</em>
                  <small title="Unidades de trabalho e estimativa de dia na fila">
                    {formatCapacitySummary(row.capacity, row.fulfillment, row.order.items.length)}
                  </small>
                </summary>

                <div className="admin-print-queue__expanded">
                  <PrintModelInputs order={row.order} />
                  <section className="admin-order-section">
                    <div className="admin-section-heading">
                      <div>
                        <h3>Controle de impressao</h3>
                        <p>Status, prioridade e mesa/impressora desta fila. Nota fiscal e expedicao ficam fora desta etapa.</p>
                      </div>
                      <span>{formatProductionStage(row.fulfillment.production.status)}</span>
                    </div>
                    <PrintQueueForm order={row.order} fulfillment={row.fulfillment} access={access} />
                  </section>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PrintQueueForm({ order, fulfillment, access }) {
  return (
    <form className="print-queue-form" action={updatePrintQueue}>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="token" value={access.token} />
      <input type="hidden" name="currentProductionStatus" value={fulfillment.production.status} />

      <fieldset className="print-status-group">
        <legend>Status da impressao</legend>
        <div className="print-status-options">
          {SIMPLE_PRODUCTION_OPTIONS.map((status) => (
            <label className={`print-status-option print-status-option--${status.tone}`} key={status.value}>
              <input
                type="radio"
                name="productionStatus"
                value={status.value}
                defaultChecked={toSimpleProductionStatus(fulfillment.production.status) === status.value}
              />
              <span className="print-status-card">
                <strong>{status.label}</strong>
                <small>{status.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Prioridade</span>
        <select name="productionPriority" defaultValue={fulfillment.production.priority}>
          {["normal", "high", "urgent", "low"].map((priority) => (
            <option key={priority} value={priority}>{formatPriorityLabel(priority)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Data</span>
        <input name="scheduledDate" type="date" defaultValue={fulfillment.production.scheduledDate} />
      </label>
      <label className="field">
        <span>Mesa/impressora</span>
        <input name="machine" defaultValue={fulfillment.production.machine} placeholder="Mesa 1 / P2S-04" />
      </label>
      <label className="field">
        <span>Responsavel</span>
        <input name="operator" defaultValue={fulfillment.production.operator} placeholder="Operador" />
      </label>
      <label className="field field-wide">
        <span>Notas da impressao</span>
        <textarea name="productionNotes" defaultValue={fulfillment.production.notes} rows={3} />
      </label>

      <button className="button button-primary" type="submit">
        Salvar fila
      </button>
    </form>
  );
}

function PrintModelInputs({ order }) {
  if (!order.items.length) {
    return (
      <section className="admin-order-section">
        <h3>Inputs do modelo</h3>
        <p className="admin-note">Pedido especial sem item parametrico.</p>
      </section>
    );
  }

  return (
    <section className="admin-order-section">
      <h3>Inputs Grasshopper/modelo</h3>
      <div className="admin-model-inputs">
        {order.items.map((item) => (
          <article className="admin-model-input-card" key={item.id}>
            <div className="admin-model-input-card__header">
              <strong>{formatProductName(item)}</strong>
              <span>{item.quantity} un.</span>
            </div>
            <dl className="cad-input-grid">
              <div>
                <dt>SKU</dt>
                <dd>{item.sku || "N/A"}</dd>
              </div>
              <div>
                <dt>Modelo</dt>
                <dd>{formatModelKey(item)}</dd>
              </div>
              {Object.entries(item.values || {}).map(([key, value]) => (
                <div key={key}>
                  <dt>{formatParameterLabel(key)}</dt>
                  <dd>{formatParameterValue(value)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminOrderCard({ row, access, activeFilter }) {
  const { order, fulfillment, queuePosition, capacity, nextAction } = row;
  const payment = order.payments?.[0];
  const requiresCad = shouldRequireCad(order);
  const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const productSummary = formatOrderProducts(order);
  const productionStage = formatProductionStage(fulfillment.production.status);

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
            {formatOrderStatusForAdmin(order.status)}
          </span>
          <small>{getPaymentStatusLabel(order.paymentStatus)}</small>
        </span>
        <span className="admin-order-summary__action">
          <span>{nextAction.title}</span>
          <small>{nextAction.detail}</small>
        </span>
        <span className="admin-order-summary__status">
          <span className="admin-status-badge admin-status-badge--info">
            {productionStage}
          </span>
          <small>{getShipmentStatusLabel(fulfillment.shipment.status)}</small>
        </span>
        <span className="admin-order-summary__total">
          <strong>{formatCurrency(order.totalBrl)}</strong>
          <small>{formatCapacitySummary(capacity, fulfillment, itemCount || order.items.length)}</small>
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
            <dt>Nota fiscal</dt>
            <dd>{getInvoiceStatusLabel(fulfillment.invoice.status)}</dd>
          </div>
          <div>
            <dt>Fila</dt>
            <dd>{queuePosition ? `#${queuePosition}` : "Fora da fila ativa"}</dd>
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
                  <dd>
                    {formatCurrency(order.metadata.commerce.shipping?.amountBrl || 0)}
                    <small>{formatShippingDetail(order.metadata.commerce.shipping)}</small>
                  </dd>
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

        <section className="admin-order-section">
          <div className="admin-section-heading">
            <div>
              <h3>Operacao</h3>
              <p>{activeFilter === "impressao" ? "Atualize a fila sem sair dos detalhes do pedido." : "Fila, NF manual e expedicao ficam nesta mesma ficha."}</p>
            </div>
            <span>{productionStage}</span>
          </div>
          <OperationForm order={order} fulfillment={fulfillment} access={access} />
        </section>

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

function OperationForm({ order, fulfillment, access }) {
  return (
    <form className="cad-form operation-form" action={updateOperation}>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="token" value={access.token} />
      <input type="hidden" name="currentProductionStatus" value={fulfillment.production.status} />
      <input type="hidden" name="currentInvoiceStatus" value={fulfillment.invoice.status} />
      <input type="hidden" name="currentShipmentStatus" value={fulfillment.shipment.status} />

      <fieldset className="operation-form__group">
        <legend>Fila de impressao</legend>
        <label className="field">
          <span>Status</span>
          <select name="productionStatus" defaultValue={toSimpleProductionStatus(fulfillment.production.status)}>
            {SIMPLE_PRODUCTION_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
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
          <span>Notas de impressao</span>
          <textarea name="productionNotes" defaultValue={fulfillment.production.notes} rows={3} />
        </label>
      </fieldset>

      <fieldset className="operation-form__group">
        <legend>Nota fiscal manual</legend>
        <label className="field">
          <span>NF manual</span>
          <select name="invoiceStatus" defaultValue={toSimpleInvoiceStatus(fulfillment.invoice.status)}>
            {SIMPLE_INVOICE_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
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
          <span>Status</span>
          <select name="shipmentStatus" defaultValue={toSimpleShipmentStatus(fulfillment.shipment.status)}>
            {SIMPLE_SHIPMENT_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
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
  );
}

async function registerCadFile(formData) {
  "use server";

  try {
    await assertAdminAccess(cleanFormValue(formData.get("token")));
  } catch {
    return;
  }

  const orderId = cleanFormValue(formData.get("orderId"));
  const cadFileName = cleanFormValue(formData.get("cadFileName"));
  const cadModelVersion = cleanFormValue(formData.get("cadModelVersion"));

  if (!orderId || !cadFileName || !cadModelVersion) {
    return;
  }

  await updateOrderCadState(orderId, {
    cadStatus: CAD_STATUS.READY_FOR_PRINT,
    cadFileName,
    cadModelVersion
  });
  revalidateAdminOrderPaths();
}

async function calculateOrcaPricing(formData) {
  "use server";

  try {
    await assertAdminAccess(cleanFormValue(formData.get("token")));
  } catch {
    return;
  }

  const orderId = cleanFormValue(formData.get("orderId"));
  if (!orderId) return;

  const order = await getOrderById(orderId);
  if (!order) return;

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

  revalidateAdminOrderPaths();
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
  const currentProductionStatus = cleanFormValue(formData.get("currentProductionStatus"));
  const currentInvoiceStatus = cleanFormValue(formData.get("currentInvoiceStatus"));
  const currentShipmentStatus = cleanFormValue(formData.get("currentShipmentStatus"));
  const submittedProductionStatus = cleanFormValue(formData.get("productionStatus")) || PRODUCTION_STATUS.QUEUED;
  const submittedInvoiceStatus = cleanFormValue(formData.get("invoiceStatus")) || INVOICE_STATUS.PENDING;
  const submittedShipmentStatus = cleanFormValue(formData.get("shipmentStatus")) || SHIPMENT_STATUS.PENDING;

  await updateOrderFulfillmentState(orderId, {
    production: {
      status: resolveSubmittedSimpleStatus({
        currentStatus: currentProductionStatus,
        submittedStatus: submittedProductionStatus,
        simplify: toSimpleProductionStatus
      }),
      priority: cleanFormValue(formData.get("productionPriority")) || "normal",
      scheduledDate: cleanFormValue(formData.get("scheduledDate")),
      machine: cleanFormValue(formData.get("machine")),
      operator: cleanFormValue(formData.get("operator")),
      notes: cleanFormValue(formData.get("productionNotes"))
    },
    invoice: {
      status: resolveSubmittedSimpleStatus({
        currentStatus: currentInvoiceStatus,
        submittedStatus: submittedInvoiceStatus,
        simplify: toSimpleInvoiceStatus
      }),
      number: cleanFormValue(formData.get("invoiceNumber")),
      series: cleanFormValue(formData.get("invoiceSeries")),
      accessKey: cleanFormValue(formData.get("invoiceAccessKey")),
      issuedAt: cleanFormValue(formData.get("invoiceIssuedAt")),
      notes: operationNotes
    },
    shipment: {
      status: resolveSubmittedSimpleStatus({
        currentStatus: currentShipmentStatus,
        submittedStatus: submittedShipmentStatus,
        simplify: toSimpleShipmentStatus
      }),
      carrier: cleanFormValue(formData.get("carrier")),
      trackingCode: cleanFormValue(formData.get("trackingCode")),
      shippedAt: cleanFormValue(formData.get("shippedAt")),
      notes: operationNotes
    }
  });

  revalidateAdminOrderPaths();
}

async function updatePrintQueue(formData) {
  "use server";

  try {
    await assertAdminAccess(cleanFormValue(formData.get("token")));
  } catch {
    return;
  }

  const orderId = cleanFormValue(formData.get("orderId"));
  if (!orderId) return;

  const currentProductionStatus = cleanFormValue(formData.get("currentProductionStatus"));
  const submittedProductionStatus = cleanFormValue(formData.get("productionStatus")) || PRODUCTION_STATUS.QUEUED;

  await updateOrderFulfillmentState(orderId, {
    production: {
      status: resolveSubmittedSimpleStatus({
        currentStatus: currentProductionStatus,
        submittedStatus: submittedProductionStatus,
        simplify: toSimpleProductionStatus
      }),
      priority: cleanFormValue(formData.get("productionPriority")) || "normal",
      scheduledDate: cleanFormValue(formData.get("scheduledDate")),
      machine: cleanFormValue(formData.get("machine")),
      operator: cleanFormValue(formData.get("operator")),
      notes: cleanFormValue(formData.get("productionNotes"))
    }
  });

  revalidateAdminOrderPaths();
}

function buildOrderRows(orders, queue) {
  const queueByOrderId = new Map(queue.map((item) => [item.order.id, item]));

  return orders.map((order) => {
    const queued = queueByOrderId.get(order.id);
    const fulfillment = queued?.fulfillment || normalizeFulfillment(order);
    const row = {
      order,
      fulfillment,
      queuePosition: queued?.queuePosition || null,
      capacity: queued?.capacity || null
    };
    return {
      ...row,
      nextAction: getNextOrderAction(row),
      filters: getRowFilters(row)
    };
  });
}

function buildPrintQueueRows(rows) {
  return rows
    .filter((row) => row.filters.includes("impressao"))
    .sort(comparePrintQueueRows);
}

function summarizePrintQueueRows(rows) {
  const dailyCapacityUnits = Number(process.env.PRODUCTION_DAILY_UNIT_CAPACITY || 120);
  const demandUnits = rows.reduce((sum, row) => {
    return sum + Number(row.capacity?.demandUnits || row.fulfillment.capacity.workUnits || 0);
  }, 0);

  return {
    demandUnits,
    estimatedProductionDays: demandUnits ? Math.ceil(demandUnits / dailyCapacityUnits) : 0
  };
}

function countFilters(rows) {
  return FILTERS.reduce((counts, filter) => {
    counts[filter.id] = rows.filter((row) => row.filters.includes(filter.id)).length;
    return counts;
  }, {});
}

function getRowFilters({ order, fulfillment }) {
  const filters = ["todos"];

  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED) {
    filters.push("pagamento");
  }

  if (isPrintQueueRelevant(order, fulfillment)) {
    filters.push("impressao");
  }

  if (isExpeditionRelevant(fulfillment)) {
    filters.push("expedicao");
  }

  if (isCompleted(order, fulfillment)) {
    filters.push("concluidos");
  }

  return filters;
}

function isPrintQueueRelevant(order, fulfillment) {
  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED || isCompleted(order, fulfillment)) return false;
  return [
    PRODUCTION_STATUS.QUEUED,
    PRODUCTION_STATUS.SCHEDULED,
    PRODUCTION_STATUS.IN_PRODUCTION,
    PRODUCTION_STATUS.QUALITY_CHECK
  ].includes(fulfillment.production.status);
}

function isExpeditionRelevant(fulfillment) {
  return fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP
    || [
      SHIPMENT_STATUS.READY_FOR_PICKUP,
      SHIPMENT_STATUS.SHIPPED,
      SHIPMENT_STATUS.DELIVERED
    ].includes(fulfillment.shipment.status);
}

function isCompleted(order, fulfillment) {
  return order.status === ORDER_STATUS.SHIPPED
    || fulfillment.production.status === PRODUCTION_STATUS.SHIPPED
    || [SHIPMENT_STATUS.SHIPPED, SHIPMENT_STATUS.DELIVERED].includes(fulfillment.shipment.status);
}

function buildOrdersOverview(orders, rows, printQueueRows) {
  return {
    total: orders.length,
    waitingPayment: rows.filter((row) => row.filters.includes("pagamento")).length,
    printQueue: printQueueRows.length,
    readyToShip: rows.filter((row) => row.fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP).length,
    completed: rows.filter((row) => row.filters.includes("concluidos")).length
  };
}

function getNextOrderAction({ order, fulfillment, queuePosition }) {
  if (order.status === ORDER_STATUS.CANCELLED || order.paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return {
      tone: "danger",
      title: "Pedido cancelado",
      detail: "Nao envie para producao."
    };
  }

  if ([PAYMENT_STATUS.REJECTED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.REFUNDED].includes(order.paymentStatus)) {
    return {
      tone: "danger",
      title: "Retomar cobranca",
      detail: "Pagamento nao aprovado."
    };
  }

  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED) {
    return {
      tone: "warning",
      title: "Aguardar pagamento",
      detail: "Pedido registrado, fora da fila."
    };
  }

  if (isCompleted(order, fulfillment)) {
    return {
      tone: "success",
      title: "Pedido expedido",
      detail: "Conferir rastreio e fechamento."
    };
  }

  if (fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP) {
    return {
      tone: "success",
      title: "Pronto para expedir",
      detail: "Emitir NF e despachar."
    };
  }

  if (fulfillment.production.status === PRODUCTION_STATUS.BLOCKED) {
    return {
      tone: "warning",
      title: "Concluir revisao tecnica",
      detail: "Pedido bloqueado ate validacao de CAD/operacao."
    };
  }

  if ([PRODUCTION_STATUS.IN_PRODUCTION, PRODUCTION_STATUS.QUALITY_CHECK].includes(fulfillment.production.status)) {
    return {
      tone: "warning",
      title: "Imprimindo",
      detail: "Acompanhar mesa e marcar como pronto ao concluir."
    };
  }

  return {
    tone: "info",
    title: queuePosition ? `Aguardando #${queuePosition}` : "Aguardando impressao",
    detail: formatProductionStage(fulfillment.production.status)
  };
}

function comparePrintQueueRows(left, right) {
  if (left.queuePosition && right.queuePosition) return left.queuePosition - right.queuePosition;
  if (left.queuePosition) return -1;
  if (right.queuePosition) return 1;
  return String(left.order.createdAt || "").localeCompare(String(right.order.createdAt || ""));
}

function formatProductionStage(status) {
  if (status === PRODUCTION_STATUS.WAITING_PAYMENT) return "Aguardando pagamento";
  if (status === PRODUCTION_STATUS.WAITING_CAD) return "Aguardando CAD";
  if (status === PRODUCTION_STATUS.BLOCKED) return "Bloqueado";
  if ([PRODUCTION_STATUS.IN_PRODUCTION, PRODUCTION_STATUS.QUALITY_CHECK].includes(status)) {
    return "Imprimindo";
  }
  if (status === PRODUCTION_STATUS.READY_TO_SHIP) return "Pronto para expedir";
  if (status === PRODUCTION_STATUS.SHIPPED) return "Expedida";
  return "Aguardando";
}

function formatPriorityLabel(priority) {
  const labels = {
    urgent: "Urgente",
    high: "Alta",
    normal: "Normal",
    low: "Baixa"
  };
  return labels[priority] || priority || "Normal";
}

function resolveSubmittedSimpleStatus({ currentStatus, submittedStatus, simplify }) {
  if (!currentStatus) return submittedStatus;
  return submittedStatus === simplify(currentStatus) ? currentStatus : submittedStatus;
}

function formatOrderStatusForAdmin(status) {
  if (status === ORDER_STATUS.CAD_PENDING) {
    return "Pago, aguardando CAD";
  }
  if ([ORDER_STATUS.CAD_GENERATED, ORDER_STATUS.READY_FOR_PRINT].includes(status)) {
    return "Pago, na fila de impressao";
  }
  if (status === ORDER_STATUS.PAID_PENDING_REVIEW) {
    return "Pago, aguardando operacao";
  }
  return getOrderStatusLabel(status);
}

function toSimpleProductionStatus(status) {
  if ([PRODUCTION_STATUS.READY_TO_SHIP, PRODUCTION_STATUS.SHIPPED].includes(status)) {
    return PRODUCTION_STATUS.READY_TO_SHIP;
  }
  if ([PRODUCTION_STATUS.IN_PRODUCTION, PRODUCTION_STATUS.QUALITY_CHECK].includes(status)) {
    return PRODUCTION_STATUS.IN_PRODUCTION;
  }
  return PRODUCTION_STATUS.QUEUED;
}

function toSimpleInvoiceStatus(status) {
  return SIMPLE_INVOICE_OPTIONS.some((option) => option.value === status) ? status : INVOICE_STATUS.PENDING;
}

function toSimpleShipmentStatus(status) {
  if ([SHIPMENT_STATUS.SHIPPED, SHIPMENT_STATUS.DELIVERED].includes(status)) return SHIPMENT_STATUS.SHIPPED;
  if ([SHIPMENT_STATUS.PACKING, SHIPMENT_STATUS.READY_FOR_PICKUP].includes(status)) return SHIPMENT_STATUS.READY_FOR_PICKUP;
  return SHIPMENT_STATUS.PENDING;
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
  paredeTubo: "Parede do tubo",
  profundidadeInsercao: "Profundidade de insercao",
  raioCanto: "Raio do canto",
  tamanhoBaseX: "Tamanho base X",
  tamanhoBaseY: "Tamanho base Y"
};

function normalizeFilter(value) {
  const filter = String(value || "").trim().toLowerCase();
  if (filter === "operacao" || filter === "cad") return "impressao";
  return FILTERS.some((item) => item.id === filter) ? filter : "todos";
}

function getFilterEmptyLabel(filter) {
  const labels = {
    todos: "pedidos",
    pagamento: "pagamento",
    impressao: "fila de impressao",
    expedicao: "expedicao",
    concluidos: "concluidos"
  };
  return labels[filter] || "pedidos";
}

function formatCapacitySummary(capacity, fulfillment, fallbackUnits) {
  if (capacity) return `${capacity.demandUnits} un. trab. | D+${capacity.estimatedDayOffset}`;
  return `${fulfillment.capacity.workUnits || fallbackUnits || 0} un. trab.`;
}

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

function formatModelKey(item) {
  return [item.categorySlug, item.formatSlug].filter(Boolean).join(" / ") || "modelo-parametrico";
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

function formatShippingDetail(shipping = {}) {
  const service = [shipping.companyName, shipping.serviceName].filter(Boolean).join(" | ");
  const delivery = Number(shipping.deliveryTimeDays || 0) > 0
    ? `${shipping.deliveryTimeDays} dia(s) estimado(s)`
    : "";
  const source = shipping.source ? `origem ${shipping.source}` : "";
  const fulfillment = shipping.fulfillmentLabel || (shipping.fulfillmentMode === "manual_posting" ? "Postagem manual" : "");
  return [service, delivery, fulfillment, source].filter(Boolean).join(" | ") || "Frete sem detalhe operacional";
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

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toISOString().slice(0, 16);
}

function cleanFormValue(value) {
  return String(value || "").trim();
}

function revalidateAdminOrderPaths() {
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/operacao");
}
