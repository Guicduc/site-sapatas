import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminAccessRequired } from "@/components/admin-access-required";
import { AdminStageTabs } from "@/components/admin-stage-tabs";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { AdminTopBar } from "@/components/admin-top-bar";
import { CopyJsonButton } from "@/components/copy-json-button";
import { adminHref, assertAdminAccess, getAdminAccess } from "@/lib/admin-session";
import {
  ADMIN_PRODUCTION_OPTIONS,
  ADMIN_SHIPMENT_OPTIONS,
  buildAdminOrderSectionPatch,
  canConfirmAdminOrderDelivery,
  canEditAdminOrderSection,
  getAdminSectionStatus,
  getAdminInvoiceOptions,
  isAdminInvoiceCancellationOnly
} from "@/lib/admin-order-workflow";
import { getGrasshopperPayload } from "@/lib/cad-contract";
import {
  buildProductionQueue,
  getInvoiceStatusLabel,
  getProductionStatusLabel,
  getShipmentStatusLabel,
  INVOICE_STATUS,
  isHomologationInvoice,
  normalizeFulfillment,
  PRODUCTION_STATUS,
  SHIPMENT_STATUS,
} from "@/lib/fulfillment";
import { formatBrTaxDocument } from "@/lib/br-tax-document";
import { buildFocusNfePayload } from "@/lib/focus-nfe";
import { formatCurrency } from "@/lib/format";
import { getInvoiceConfig, getProviderLabel, isAutomatedInvoiceProvider } from "@/lib/invoice-config";
import {
  canCancelInvoice,
  cancelInvoice,
  refreshInvoiceStatus,
  requestInvoiceAfterPayment
} from "@/lib/invoice-provider";
import { deliverShipmentNotification } from "@/lib/shipment-notification";
import {
  getOrderById,
  listOrders,
  updateOrderFulfillmentState
} from "@/lib/order-store";
import { ORDER_STATUS, PAYMENT_STATUS, getPaymentStatusLabel } from "@/lib/order-status";
import {
  listPrintJobs,
  summarizePrintJobs,
  syncSiteOrderPrintJobs
} from "@/lib/print-job-store";

import "./admin.css";

// "concluidos" continua sendo o id na URL (?fila=concluidos) por compatibilidade,
// mas significa apenas "expedido": a entrega nao e confirmada automaticamente.
const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "atencao", label: "Atenção" },
  { id: "pagamento", label: "Pagamento" },
  { id: "impressao", label: "Produção" },
  { id: "notafiscal", label: "NF a emitir" },
  { id: "expedicao", label: "Expedição" },
  { id: "concluidos", label: "Expedidos" }
];

const SECTION_LABELS = {
  production: "Produção",
  invoice: "Nota fiscal",
  shipment: "Expedição"
};

export async function AdminOrdersWorkspace({ searchParams, defaultFilter = "todos", nextPath = "/admin/pedidos" }) {
  const access = await getAdminAccess();

  if (!access.allowed) {
    return <AdminAccessRequired nextPath={nextPath} scope="os pedidos" />;
  }

  const activeFilter = normalizeFilter(searchParams?.fila || searchParams?.tab || defaultFilter);
  const query = cleanFormValue(searchParams?.q).slice(0, 80);
  const [orders, printJobs] = await Promise.all([
    listOrders({ limit: 200 }),
    listPrintJobs({ limit: 200 })
  ]);
  const queue = buildProductionQueue(orders.filter((order) => isPrintQueueRelevant(order, normalizeFulfillment(order))));
  const rows = buildOrderRows(orders, queue);
  const printQueueRows = buildPrintQueueRows(rows);
  const printJobSummary = summarizePrintJobs(printJobs);
  const counts = countFilters(rows);
  const stageRows = activeFilter === "impressao" ? printQueueRows : rows.filter((row) => row.filters.includes(activeFilter));
  const filteredRows = query ? stageRows.filter((row) => matchesQuery(row.order, query)) : stageRows;
  const invoiceConfig = getInvoiceConfig();
  const activeLabel = FILTERS.find((filter) => filter.id === activeFilter)?.label || "Todos";
  const selectedOrderId = searchParams?.pedido;
  const selectedVisible = filteredRows.some((row) => row.order.id === selectedOrderId);
  const feedback = { error: searchParams?.erro, saved: searchParams?.salvo };

  return (
    <div className="admin-ws">
      <AdminTopBar current="pedidos" />

      <section className="aw-page" aria-labelledby="aw-title">
        <div className="aw-head">
          <div className="aw-head__title">
            <h1 id="aw-title">Pedidos</h1>
            <p>
              <span>{activeLabel}</span>
              {" · "}
              {filteredRows.length} {filteredRows.length === 1 ? "pedido" : "pedidos"}
              {query && <> para “{query}”</>}
              {counts.atencao > 0 && activeFilter !== "atencao" && (
                <>
                  {" · "}
                  <Link className="aw-head__alert" href={adminHref("/admin/pedidos?fila=atencao")}>
                    {counts.atencao} {counts.atencao === 1 ? "exige" : "exigem"} atenção
                  </Link>
                </>
              )}
            </p>
          </div>
          <form className="aw-search" role="search" action={adminHref("/admin/pedidos")}>
            <input type="hidden" name="fila" value={activeFilter} />
            <label className="aw-visually-hidden" htmlFor="aw-search-input">Buscar pedido</label>
            <input
              id="aw-search-input"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Nº do pedido, cliente, e-mail ou SKU"
              autoComplete="off"
            />
            <button className="aw-button aw-button--quiet" type="submit">Buscar</button>
            {query && (
              <Link className="aw-search__clear" href={adminHref(`/admin/pedidos?fila=${activeFilter}`)}>
                Limpar
              </Link>
            )}
          </form>
        </div>

        <AdminStageTabs label="Etapas dos pedidos" activeStage={activeFilter}>
          {FILTERS.map((filter) => (
            <Link
              className={`aw-tab${activeFilter === filter.id ? " is-active" : ""}${filter.id === "atencao" && counts.atencao > 0 ? " aw-tab--alert" : ""}`}
              href={adminHref(`/admin/pedidos?fila=${filter.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`)}
              aria-current={activeFilter === filter.id ? "page" : undefined}
              key={filter.id}
            >
              <span>{filter.label}</span>
              <strong aria-label={`${counts[filter.id] || 0} pedidos`}>{counts[filter.id] || 0}</strong>
            </Link>
          ))}
        </AdminStageTabs>

        {activeFilter === "concluidos" && (
          <p className="aw-filter-hint">
            Pedidos já despachados. Após conferir a entrega, abra o pedido e use “Confirmar entrega” em Expedição. Confira também as pendências de cada pedido.
          </p>
        )}

        {feedback.error && !selectedVisible && (
          <p className="aw-alert aw-alert--danger" role="alert">{getOperationErrorMessage(feedback.error)}</p>
        )}
        {!feedback.error && !selectedVisible && SECTION_LABELS[feedback.saved] && (
          <p className="aw-alert aw-alert--success" role="status">
            {SECTION_LABELS[feedback.saved]} salva. O pedido foi atualizado e saiu desta lista.{" "}
            <Link href={adminHref(`/admin/pedidos?pedido=${encodeURIComponent(selectedOrderId || "")}`)}>Ver pedido atualizado</Link>
          </p>
        )}

        {activeFilter === "impressao" && (
          <details className="aw-disclosure aw-disclosure--panel">
            <summary>
              <span>Geração de arquivos (legado)</span>
              <small>{printJobSummary.failed} {printJobSummary.failed === 1 ? "falha" : "falhas"}</small>
            </summary>
            <PrintFileJobsPanel jobs={printJobs} summary={printJobSummary} access={access} />
          </details>
        )}

        {filteredRows.length === 0 ? (
          <div className="aw-empty">
            <h2>{query ? "Nenhum pedido encontrado." : "Nenhum pedido nesta etapa."}</h2>
            <p>
              {query
                ? <>Nenhum pedido em {activeLabel.toLowerCase()} corresponde a “{query}”.</>
                : <>Quando um pedido entrar em {getFilterEmptyLabel(activeFilter)}, ele aparecerá nesta lista.</>}
            </p>
          </div>
        ) : (
          <div className="aw-list">
            <div className="aw-list__head" aria-hidden="true">
              <span>Pedido</span>
              <span>Cliente</span>
              <span>Situação</span>
              <span>Andamento</span>
              <span>Total</span>
            </div>
            {filteredRows.map((row) => (
              <AdminOrderCard
                row={row}
                access={access}
                invoiceConfig={invoiceConfig}
                activeFilter={activeFilter}
                selectedOrderId={selectedOrderId}
                feedback={selectedOrderId === row.order.id ? feedback : null}
                key={row.order.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PrintFileJobsPanel({ jobs, summary, access }) {
  return (
    <section className="print-file-jobs" aria-labelledby="print-file-jobs-heading">
      <div className="aw-section-head">
        <div>
          <h3 id="print-file-jobs-heading">Jobs de geração de arquivos</h3>
          <p>
            O site registra contratos e acompanha tentativas. Rhino, Grasshopper e slicers rodam em um worker separado.
          </p>
        </div>
        <form action={syncPrintFileJobs}>
          <input type="hidden" name="token" value={access.token} />
          <AdminSubmitButton className="aw-button aw-button--quiet" pendingLabel="Sincronizando…">Sincronizar pedidos pagos</AdminSubmitButton>
        </form>
      </div>

      <dl className="print-file-jobs__summary">
        <div><dt>Na fila</dt><dd>{summary.queued}</dd></div>
        <div><dt>Processando</dt><dd>{summary.processing}</dd></div>
        <div><dt>Concluídos</dt><dd>{summary.succeeded}</dd></div>
        <div><dt>Falhas</dt><dd>{summary.failed}</dd></div>
        <div><dt>Retries</dt><dd>{summary.retrying}</dd></div>
      </dl>

      {jobs.length === 0 ? (
        <p className="aw-note">
          Nenhum job criado. A sincronização considera pedidos pagos ativos com modelo registrado no contrato CAD.
        </p>
      ) : (
        <div className="print-file-jobs__list">
          {jobs.map((job) => (
            <article className={`print-file-job print-file-job--${job.status}`} key={job.id}>
              <div className="print-file-job__heading">
                <div>
                  <strong>{job.origin.label || job.origin.sourceId}</strong>
                  <small>{job.origin.source} | {job.origin.sourceItemId || "origem sem item"}</small>
                </div>
                <span>{formatPrintJobStatus(job.status)}</span>
              </div>
              <dl>
                <div><dt>Modelo</dt><dd>{job.contract.modelVersion}</dd></div>
                <div><dt>Material</dt><dd>{formatPrintJobMaterial(job.material)}</dd></div>
                <div><dt>Prioridade</dt><dd>{formatPriorityLabel(job.priority)}</dd></div>
                <div><dt>Tentativas</dt><dd>{job.attempts}/{job.maxAttempts}</dd></div>
              </dl>
              {job.artifacts?.length > 0 && (
                <p className="print-file-job__artifacts">
                  Artefatos: {job.artifacts.map((artifact) => `${artifact.type.toUpperCase()} ${artifact.name}`).join(" | ")}
                </p>
              )}
              {job.error && (
                <p className="print-file-job__error">
                  {job.error.code}: {job.error.message}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function GrasshopperSection({ order }) {
  const payloadText = JSON.stringify(getGrasshopperPayload(order), null, 2);

  return (
    <div className="aw-cad">
      <div className="aw-section-head">
        <p>Parâmetros em mm por item, prontos para o modelo paramétrico.</p>
        <CopyJsonButton text={payloadText} label="Copiar JSON do pedido" />
      </div>
      <div className="aw-cad__items">
        {order.items.map((item) => (
          <article className="aw-cad__item" key={item.id}>
            <div className="aw-cad__item-head">
              <strong>{formatProductName(item)}</strong>
              <span>{item.quantity} un.</span>
            </div>
            <dl className="aw-kv">
              <div><dt>SKU</dt><dd className="aw-mono">{item.sku || "N/A"}</dd></div>
              <div><dt>Modelo</dt><dd className="aw-mono">{formatModelKey(item)}</dd></div>
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
    </div>
  );
}

function AdminOrderCard({ row, access, invoiceConfig, activeFilter, selectedOrderId, feedback }) {
  const { order, fulfillment } = row;
  const payment = order.payments?.[0];
  const stage = getOrderStage(row);
  const steps = getFulfillmentSteps(row);
  const productSummary = formatOrderProducts(order);
  const shippingAddress = formatShippingAddress(order);
  const invoiceFocus = activeFilter === "notafiscal" && needsInvoiceIssue(order, fulfillment)
    && canEditAdminOrderSection(order, "invoice");
  const primarySection = invoiceFocus ? "invoice" : getPrimarySection(row);
  const nextAction = invoiceFocus && !isCompleted(order, fulfillment)
    ? {
      tone: "warning",
      title: isAutomatedInvoiceProvider(invoiceConfig.provider) ? "Conferir emissão da NF" : "Emitir e registrar NF",
      detail: "Confira a emissão no emissor e registre número, série e chave neste pedido."
    }
    : row.nextAction;
  const commerce = order.metadata?.commerce;

  return (
    <details
      className={`aw-order aw-order--${stage.tone}`}
      id={`order-${order.id}`}
      open={selectedOrderId === order.id}
    >
      <summary className="aw-row">
        <span className="aw-row__order">
          <strong className="aw-mono">{order.orderNumber}</strong>
          <small>{productSummary}</small>
        </span>
        <span className="aw-row__customer">
          <span>{order.customer.name || "Sem nome"}</span>
          <small>{formatDateTime(order.createdAt)}</small>
        </span>
        <span className="aw-row__stage">
          <StatusBadge tone={stage.tone} label={stage.label} />
        </span>
        <span className="aw-row__track">
          <StepTrack steps={steps} />
        </span>
        <span className="aw-row__total">{formatCurrency(order.totalBrl)}</span>
        <span className="aw-row__chevron" aria-hidden="true" />
      </summary>

      <div className="aw-detail">
        <div className="aw-detail__main">
          <section className={`aw-next aw-next--${nextAction.tone}`} aria-label="Próxima ação">
            <ToneIcon tone={nextAction.tone} />
            <div>
              <p>Próxima ação</p>
              <strong>{nextAction.title}</strong>
              <small>{nextAction.detail}</small>
            </div>
          </section>

          {feedback?.error && (
            <p className="aw-alert aw-alert--danger" role="alert">{getOperationErrorMessage(feedback.error)}</p>
          )}
          {!feedback?.error && SECTION_LABELS[feedback?.saved] && (
            <p className="aw-alert aw-alert--success" role="status">
              {SECTION_LABELS[feedback.saved]} salva. Os dados abaixo já estão atualizados.
            </p>
          )}

          <OperationForms
            order={order}
            fulfillment={fulfillment}
            access={access}
            invoiceConfig={invoiceConfig}
            activeFilter={activeFilter}
            primarySection={primarySection}
          />

          <section className="aw-block" aria-labelledby={`items-${order.id}`}>
            <h3 className="aw-block__title" id={`items-${order.id}`}>
              Itens e medidas <span>{order.items.length} {order.items.length === 1 ? "item" : "itens"}</span>
            </h3>
            {order.items.length > 0 ? (
              <ul className="aw-items">
                {order.items.map((item) => (
                  <li className="aw-item" key={item.id}>
                    <div className="aw-item__head">
                      <div>
                        <strong>{formatProductName(item)}</strong>
                        <small className="aw-mono">{item.sku}</small>
                      </div>
                      <div className="aw-item__qty">
                        <span>{item.quantity} un.</span>
                        <strong>{formatCurrency(item.totalPriceBrl)}</strong>
                      </div>
                    </div>
                    <ul className="aw-measures" aria-label="Medidas">
                      {getVisibleMeasures(item).map(([key, value]) => (
                        <li key={key}><span>{formatParameterLabel(key)}</span> {formatParameterValue(value)}</li>
                      ))}
                      {item.color && <li><span>Cor</span> {item.color}</li>}
                      {item.finish && <li><span>Acabamento</span> {item.finish}</li>}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="aw-note">Pedido especial sem item precificado.</p>
            )}
          </section>

          <div className="aw-disclosures">
            {order.items.length > 0 && (
              <details className="aw-disclosure">
                <summary><span>Dados para fabricação e JSON</span></summary>
                <GrasshopperSection order={order} />
              </details>
            )}

            {order.technicalReviews?.length > 0 && (
              <details className="aw-disclosure">
                <summary><span>Revisão técnica</span></summary>
                <pre className="brief-preview">{order.technicalReviews[0].notes}</pre>
              </details>
            )}

            {(payment || order.metadata?.paymentReview || order.metadata?.paymentAlerts?.length > 0) && (
              <details className="aw-disclosure" open={Boolean(order.metadata?.paymentReview) || undefined}>
                <summary>
                  <span>Pagamento Mercado Pago</span>
                  <small>{pt(getPaymentStatusLabel(payment?.status || order.paymentStatus))}</small>
                </summary>
                {order.metadata?.paymentReview && <p className="aw-alert aw-alert--warning">Revisão de pagamento pendente. Confira este pedido no painel do Mercado Pago antes de produzir ou expedir.</p>}
                {order.metadata?.paymentAlerts?.length > 0 && <p className="aw-note">{order.metadata.paymentAlerts.length} alerta(s) de pagamento registrado(s). Confira duplicidade, disputa ou reembolso no painel do Mercado Pago.</p>}
                <dl className="aw-kv aw-kv--3">
                  <div><dt>Preferência</dt><dd className="aw-mono">{payment?.providerPreferenceId || "N/A"}</dd></div>
                  <div><dt>Pagamento</dt><dd className="aw-mono">{order.metadata?.paymentReview?.providerPaymentId || payment?.providerPaymentId || "N/A"}</dd></div>
                  <div><dt>Status</dt><dd>{pt(getPaymentStatusLabel(payment?.status || order.paymentStatus))}</dd></div>
                </dl>
              </details>
            )}
          </div>
        </div>

        <aside className="aw-detail__side" aria-label={`Resumo do pedido ${order.orderNumber}`}>
          <section className="aw-side-block" aria-labelledby={`progress-${order.id}`}>
            <h3 className="aw-side-block__title" id={`progress-${order.id}`}>Andamento</h3>
            <StepChecklist steps={steps} />
          </section>

          <section className="aw-side-block" aria-labelledby={`customer-${order.id}`}>
            <h3 className="aw-side-block__title" id={`customer-${order.id}`}>Cliente</h3>
            <dl className="aw-facts">
              <div><dt>Nome</dt><dd>{order.customer.name || "Sem nome"}</dd></div>
              <div><dt>E-mail</dt><dd>{order.customer.email || "Sem e-mail"}</dd></div>
              <div><dt>Telefone</dt><dd>{order.customer.contact || "Sem telefone"}</dd></div>
              <div><dt>Entrega</dt><dd>{shippingAddress || "Sem endereço cadastrado"}</dd></div>
            </dl>
          </section>

          {commerce && (
            <section className="aw-side-block" aria-labelledby={`commerce-${order.id}`}>
              <h3 className="aw-side-block__title" id={`commerce-${order.id}`}>Valores</h3>
              <dl className="aw-totals">
                <div><dt>Produtos</dt><dd>{formatCurrency(commerce.itemsSubtotalBrl)}</dd></div>
                <div>
                  <dt>Desconto</dt>
                  <dd>{commerce.discount?.applied ? `-${formatCurrency(commerce.discount.amountBrl)}` : formatCurrency(0)}</dd>
                </div>
                <div>
                  <dt>Frete</dt>
                  <dd>{formatCurrency(commerce.shipping?.amountBrl || 0)}</dd>
                  <small>{formatShippingDetail(commerce.shipping)}</small>
                </div>
                <div className="aw-totals__total"><dt>Total</dt><dd>{formatCurrency(commerce.totalBrl)}</dd></div>
              </dl>
            </section>
          )}

          <section className="aw-side-block" aria-labelledby={`invoice-${order.id}`}>
            <h3 className="aw-side-block__title" id={`invoice-${order.id}`}>Nota fiscal</h3>
            <p className="aw-side-block__text">{formatInvoiceSummary(fulfillment.invoice)}</p>
          </section>
        </aside>
      </div>
    </details>
  );
}

const TONE_TEXT = {
  success: "Concluído",
  info: "Em andamento",
  warning: "Requer ação",
  danger: "Problema",
  neutral: "Encerrado"
};

function ToneIcon({ tone }) {
  // Forma diferente por tom: o estado nunca depende so da cor.
  const paths = {
    success: <path d="M4 8.5l2.6 2.6L12 5.6" />,
    info: <><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" /></>,
    warning: <><path d="M8 2.2l6.2 11H1.8z" /><path d="M8 6.5v3M8 11.4v.1" /></>,
    danger: <><circle cx="8" cy="8" r="5.5" /><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" /></>,
    neutral: <path d="M4 8h8" />
  };
  return (
    <svg className={`aw-icon aw-icon--${tone}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      {paths[tone] || paths.info}
    </svg>
  );
}

function StatusBadge({ tone, label }) {
  return (
    <span className={`aw-badge aw-badge--${tone}`}>
      <ToneIcon tone={tone} />
      <span>{label}</span>
    </span>
  );
}

const STEP_MARK = {
  done: "✓",
  active: "",
  todo: "",
  problem: "!",
  skip: "–"
};

const STEP_STATE_TEXT = {
  done: "concluído",
  active: "em andamento",
  todo: "pendente",
  problem: "requer ação",
  skip: "não se aplica"
};

function StepTrack({ steps }) {
  const description = steps.map((step) => `${step.label}: ${step.value}`).join("; ");
  return (
    <span className="aw-track" role="img" aria-label={`Andamento — ${description}`}>
      {steps.map((step) => (
        <span className={`aw-track__step aw-step--${step.state}`} key={step.id}>
          <span className="aw-track__mark" aria-hidden="true">{STEP_MARK[step.state]}</span>
          <span className="aw-track__label">{step.short}</span>
        </span>
      ))}
    </span>
  );
}

function StepChecklist({ steps }) {
  return (
    <ol className="aw-checklist">
      {steps.map((step) => (
        <li className={`aw-checklist__step aw-step--${step.state}`} key={step.id}>
          <span className="aw-track__mark" aria-hidden="true">{STEP_MARK[step.state]}</span>
          <div>
            <span className="aw-checklist__label">{step.label}</span>
            <strong>{step.value}</strong>
            {step.detail && <small>{step.detail}</small>}
          </div>
          <span className="aw-visually-hidden">({STEP_STATE_TEXT[step.state]})</span>
        </li>
      ))}
    </ol>
  );
}

function OperationForms({ order, fulfillment, access, invoiceConfig, activeFilter, primarySection }) {
  const canProduce = canEditAdminOrderSection(order, "production");
  const canInvoice = canEditAdminOrderSection(order, "invoice");
  const canShip = canEditAdminOrderSection(order, "shipment");
  const cancellationOnly = isAdminInvoiceCancellationOnly(order);
  const canCancel = canCancelInvoice(order);
  const shipmentStatus = getAdminSectionStatus("shipment", fulfillment.shipment.status);

  if (!canProduce && !canInvoice && !canShip && !canCancel) {
    return (
      <p className="aw-note aw-note--box">
        Nenhuma etapa operacional pode ser alterada no estado atual deste pedido.
      </p>
    );
  }

  return (
    <div className="aw-ops">
      {canProduce && (
        <OperationSection
          title="Produção"
          status={formatProductionStage(fulfillment.production.status)}
          primary={primarySection === "production"}
          open={activeFilter === "impressao" || primarySection === "production"}
        >
          <SectionForm order={order} fulfillment={fulfillment} access={access} section="production" activeFilter={activeFilter}>
            <div className="aw-fields">
              <StatusField section="production" status={fulfillment.production.status} options={ADMIN_PRODUCTION_OPTIONS} />
            </div>
            <details className="aw-more">
              <summary>Prioridade e programação</summary>
              <div className="aw-fields">
                <label className="field">
                  <span>Prioridade</span>
                  <select name="productionPriority" defaultValue={fulfillment.production.priority}>
                    {["normal", "high", "urgent", "low"].map((priority) => (
                      <option key={priority} value={priority}>{formatPriorityLabel(priority)}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Data programada</span>
                  <input name="scheduledDate" type="date" defaultValue={fulfillment.production.scheduledDate} />
                </label>
              </div>
              {[fulfillment.production.machine, fulfillment.production.operator, fulfillment.production.notes].some(Boolean) && (
                <p className="aw-note">Registro anterior: {[fulfillment.production.machine, fulfillment.production.operator, fulfillment.production.notes].filter(Boolean).join(" | ")}</p>
              )}
            </details>
            <FormActions>Salvar produção</FormActions>
          </SectionForm>
        </OperationSection>
      )}

      {canInvoice && (
        <OperationSection
          title="Nota fiscal"
          status={formatInvoiceShort(fulfillment.invoice)}
          primary={primarySection === "invoice"}
          open={activeFilter === "notafiscal" || primarySection === "invoice"}
        >
          <p className="aw-note">{cancellationOnly
            ? "Registre o cancelamento somente depois de confirmá-lo no emissor. Este ajuste não reabre o pedido."
            : "Emita ou confira a NF no emissor e registre os dados abaixo. Marcar NF cancelada apenas registra um cancelamento já confirmado no emissor."}</p>
          {!isAutomatedInvoiceProvider(invoiceConfig.provider) && needsInvoiceIssue(order, fulfillment) && (
            <ManualInvoiceSheet order={order} invoiceConfig={invoiceConfig} />
          )}
          <SectionForm order={order} fulfillment={fulfillment} access={access} section="invoice" activeFilter={activeFilter}>
            <div className="aw-fields aw-fields--invoice">
              <StatusField section="invoice" status={fulfillment.invoice.status} options={getAdminInvoiceOptions(order, invoiceConfig)} />
              <label className="field"><span>Número NF</span><input name="invoiceNumber" defaultValue={fulfillment.invoice.number} inputMode="numeric" readOnly={cancellationOnly} /></label>
              <label className="field"><span>Série</span><input name="invoiceSeries" defaultValue={fulfillment.invoice.series} inputMode="numeric" readOnly={cancellationOnly} /></label>
              <label className="field field-wide"><span>Chave de acesso</span><input name="invoiceAccessKey" defaultValue={fulfillment.invoice.accessKey} placeholder="44 dígitos" inputMode="numeric" maxLength={54} readOnly={cancellationOnly} /></label>
            </div>
            <details className="aw-more">
              <summary>Observações da NF</summary>
              <label className="field"><span>Observações</span><textarea name="invoiceNotes" defaultValue={fulfillment.invoice.notes} rows={3} /></label>
            </details>
            <FormActions>Salvar nota fiscal</FormActions>
          </SectionForm>
          {isAutomatedInvoiceProvider(invoiceConfig.provider) && canRequestInvoice(order, fulfillment) && (
            <InvoiceRequestForm order={order} access={access} providerLabel={invoiceConfig.providerLabel} />
          )}
          {isAutomatedInvoiceProvider(invoiceConfig.provider) && fulfillment.invoice.status === INVOICE_STATUS.API_PENDING && (
            <InvoiceRefreshForm order={order} access={access} />
          )}
        </OperationSection>
      )}

      {canCancel && (
        <OperationSection title="Cancelar NF-e na SEFAZ" status="Cancelamento fiscal" primary={false} open={false}>
          <InvoiceCancelForm order={order} access={access} />
        </OperationSection>
      )}

      {canShip && (
        <OperationSection
          title="Expedição"
          status={shipmentStatus === SHIPMENT_STATUS.SHIPPED
            ? (fulfillment.shipment.status === SHIPMENT_STATUS.DELIVERED ? "Entregue" : "Expedido")
            : "Preparar envio"}
          primary={primarySection === "shipment"}
          open={activeFilter === "expedicao" || primarySection === "shipment"}
        >
          <p className={`aw-note${isNotificationProblem(fulfillment.shipment.notification) ? " aw-note--warning" : ""}`}>
            {formatShipmentNotificationStatus(fulfillment.shipment.notification)}
          </p>
          <SectionForm order={order} fulfillment={fulfillment} access={access} section="shipment" activeFilter={activeFilter}>
            <div className="aw-fields">
              <StatusField section="shipment" status={fulfillment.shipment.status} options={ADMIN_SHIPMENT_OPTIONS} />
              <label className="field"><span>Transportadora</span><input name="carrier" defaultValue={fulfillment.shipment.carrier} placeholder="Correios / Retirada" /></label>
              <label className="field"><span>Rastreio</span><input name="trackingCode" defaultValue={fulfillment.shipment.trackingCode} /></label>
            </div>
            <details className="aw-more">
              <summary>Observações da expedição</summary>
              <label className="field"><span>Observações</span><textarea name="shipmentNotes" defaultValue={fulfillment.shipment.notes} rows={3} /></label>
            </details>
            <FormActions>Salvar expedição</FormActions>
          </SectionForm>
          {canConfirmAdminOrderDelivery(order) && (
            <SectionForm order={order} fulfillment={fulfillment} access={access} section="shipment" activeFilter={activeFilter}>
              <input type="hidden" name="operation" value="confirm_delivery" />
              <p className="aw-note">Confirme somente após verificar que o cliente recebeu o pedido. A ação registra a entrega; pendências de NF ou notificação continuam sinalizadas.</p>
              <FormActions>Confirmar entrega</FormActions>
            </SectionForm>
          )}
          {fulfillment.shipment.status === SHIPMENT_STATUS.DELIVERED && (
            <p className="aw-note aw-note--box" role="status">
              Entrega confirmada{fulfillment.shipment.deliveredAt ? ` em ${formatDateTime(fulfillment.shipment.deliveredAt)}` : ""}. Confira acima eventuais pendências.
            </p>
          )}
        </OperationSection>
      )}
    </div>
  );
}

function OperationSection({ title, status, primary, open, children }) {
  return (
    <details className={`aw-op${primary ? " aw-op--primary" : ""}`} open={open || undefined}>
      <summary>
        <span className="aw-op__title">
          <span>{title}</span>
          {primary && <em>Próxima etapa</em>}
        </span>
        <span className="aw-op__status">{status}</span>
      </summary>
      <div className="aw-op__body">{children}</div>
    </details>
  );
}

function FormActions({ children }) {
  return (
    <div className="aw-form-actions">
      <AdminSubmitButton>{children}</AdminSubmitButton>
    </div>
  );
}

function SectionForm({ order, fulfillment, access, section, activeFilter, children }) {
  return (
    <form className="aw-form" action={updateOperation}>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="token" value={access.token} />
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="filter" value={activeFilter} />
      <input type="hidden" name="expectedUpdatedAt" value={fulfillment[section].updatedAt} />
      {children}
    </form>
  );
}

function StatusField({ section, status, options }) {
  const selected = getAdminSectionStatus(section, status);
  const currentIsAutomatic = !options.some((option) => option.value === selected);
  const label = { production: getProductionStatusLabel, invoice: getInvoiceStatusLabel, shipment: getShipmentStatusLabel }[section];
  return (
    <label className="field">
      <span>Status</span>
      <select name="status" defaultValue={selected}>
        {currentIsAutomatic && <option value={selected}>Atual: {pt(label(status))}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{pt(option.label)}</option>)}
      </select>
    </label>
  );
}

function ManualInvoiceSheet({ order, invoiceConfig }) {
  const sheet = buildManualInvoiceSheet(order, invoiceConfig);

  return (
    <section className="aw-invoice-sheet" aria-label={`Dados para emissão manual da NF do pedido ${order.orderNumber}`}>
      <div className="aw-section-head">
        <h4>Dados para emissão manual da NF-e</h4>
        {!sheet.error && <CopyJsonButton text={JSON.stringify(sheet.payload, null, 2)} label="Copiar dados fiscais (JSON)" />}
      </div>
      {invoiceConfig.automationPaused && (
        <p className="aw-note">
          Se este pedido já teve uma tentativa de emissão automática, consulte a nota no painel Focus NFe antes de emitir outra.
          Uma solicitação anterior pode ter sido autorizada depois da pausa. Nesse caso, registre a nota existente neste pedido.
        </p>
      )}
      {sheet.error ? (
        <p className="aw-alert aw-alert--warning">Não foi possível montar os dados fiscais: {sheet.error}</p>
      ) : (
        <dl className="aw-facts aw-facts--sheet">
          <div>
            <dt>Destinatário</dt>
            <dd>{sheet.payload.nome_destinatario} · <span className="aw-mono">{formatBrTaxDocument(sheet.payload.cnpj_destinatario || sheet.payload.cpf_destinatario)}</span></dd>
          </div>
          <div>
            <dt>Endereço</dt>
            <dd>
              {[sheet.payload.logradouro_destinatario, sheet.payload.numero_destinatario, sheet.payload.complemento_destinatario].filter(Boolean).join(", ")}
              {" · "}{sheet.payload.bairro_destinatario} · {sheet.payload.municipio_destinatario}/{sheet.payload.uf_destinatario} · CEP {sheet.payload.cep_destinatario}
            </dd>
          </div>
          <div>
            <dt>Tributação</dt>
            <dd className="aw-mono">CFOP {sheet.payload.items[0]?.cfop} · NCM {sheet.payload.items[0]?.codigo_ncm} · CSOSN {sheet.payload.items[0]?.icms_situacao_tributaria}</dd>
          </div>
          {sheet.payload.items.map((item) => (
            <div key={item.numero_item}>
              <dt>Item {item.numero_item}</dt>
              <dd>
                {item.descricao} · {item.quantidade_comercial} UN · {formatCurrency(item.valor_bruto)}
                {item.valor_desconto ? ` · desconto ${formatCurrency(item.valor_desconto)}` : ""}
              </dd>
            </div>
          ))}
          <div>
            <dt>Totais</dt>
            <dd>
              Produtos {formatCurrency(sheet.payload.valor_produtos)} · Desconto {formatCurrency(sheet.payload.valor_desconto)}
              {" · "}Frete {formatCurrency(sheet.payload.valor_frete)} · <strong>Total NF {formatCurrency(sheet.payload.valor_total)}</strong>
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function buildManualInvoiceSheet(order, invoiceConfig) {
  try {
    // Ambiente "producao" so define o nome real do destinatario; nada e enviado a API.
    return { payload: buildFocusNfePayload(order, { ...invoiceConfig, environment: "producao" }) };
  } catch (error) {
    return { error: error.message || "dados fiscais incompletos." };
  }
}

function InvoiceRequestForm({ order, access, providerLabel }) {
  return (
    <form className="aw-form aw-form--inline" action={requestAutomatedInvoice}>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="token" value={access.token} />
      <AdminSubmitButton className="aw-button aw-button--quiet" pendingLabel="Solicitando…">
        Emitir NF via {providerLabel}
      </AdminSubmitButton>
    </form>
  );
}

function InvoiceRefreshForm({ order, access }) {
  return (
    <form className="aw-form aw-form--inline" action={refreshAutomatedInvoiceStatus}>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="token" value={access.token} />
      <AdminSubmitButton className="aw-button aw-button--quiet" pendingLabel="Atualizando…">
        Atualizar status da NF
      </AdminSubmitButton>
    </form>
  );
}

function InvoiceCancelForm({ order, access }) {
  return (
    <form className="aw-form" action={cancelAutomatedInvoice}>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="token" value={access.token} />
      <label className="field field-wide">
        <span>Justificativa do cancelamento (mínimo 15 caracteres)</span>
        <textarea
          name="cancelJustification"
          rows={2}
          minLength={15}
          maxLength={255}
          required
          placeholder="Ex.: Pedido cancelado pelo cliente antes da expedição."
        />
      </label>
      <div className="aw-form-actions">
        <AdminSubmitButton className="aw-button aw-button--danger" pendingLabel="Cancelando…">
          Cancelar NF-e na SEFAZ
        </AdminSubmitButton>
      </div>
    </form>
  );
}

async function updateOperation(formData) {
  "use server";

  await assertAdminAccess(cleanFormValue(formData.get("token")));
  const orderId = cleanFormValue(formData.get("orderId"));
  const section = cleanFormValue(formData.get("section"));
  const filter = normalizeFilter(formData.get("filter"));
  const values = Object.fromEntries(formData);
  let failure = "";
  try {
    const updatedOrder = await updateOrderFulfillmentState(orderId, (order) => buildAdminOrderSectionPatch(order, section, values));
    if (!updatedOrder) failure = "admin_operation_unavailable";
    // Confirming delivery does not send or retry the shipment e-mail.
    if (updatedOrder && section === "shipment" && values.operation !== "confirm_delivery") {
      await deliverShipmentNotification(updatedOrder);
    }
  } catch (error) {
    if (!String(error.code || "").startsWith("admin_operation_")) throw error;
    failure = error.code;
  }
  revalidateAdminOrderPaths();
  const selected = encodeURIComponent(orderId);
  const outcome = failure ? `&erro=${encodeURIComponent(failure)}` : `&salvo=${encodeURIComponent(section)}`;
  redirect(adminHref(`/admin/pedidos?fila=${filter}&pedido=${selected}${outcome}#order-${selected}`));
}

function getOperationErrorMessage(code) {
  if (code === "admin_operation_stale") return "Este pedido mudou desde que a ficha foi aberta. Confira os dados atualizados e salve novamente.";
  if (code === "admin_operation_invalid_status") return "Selecione um status operacional válido.";
  if (code === "admin_operation_invalid_invoice") return "Para registrar a NF emitida, informe número, série e chave de acesso com 44 dígitos.";
  if (code === "admin_operation_external_production") return "A produção deste pedido é controlada pelo sistema de produção. Confira o andamento nele.";
  return "Esta etapa não pode ser alterada no estado atual do pedido. Confira o pagamento e eventuais bloqueios.";
}

async function syncPrintFileJobs(formData) {
  "use server";

  try {
    await assertAdminAccess(cleanFormValue(formData.get("token")));
  } catch {
    return;
  }

  const orders = await listOrders({ limit: 200 });
  await syncSiteOrderPrintJobs(orders);
  revalidateAdminOrderPaths();
}

async function requestAutomatedInvoice(formData) {
  "use server";

  try {
    await assertAdminAccess(cleanFormValue(formData.get("token")));
  } catch {
    return;
  }

  const orderId = cleanFormValue(formData.get("orderId"));
  if (!orderId) return;

  const order = await getOrderById(orderId);
  if (!order || order.paymentStatus !== PAYMENT_STATUS.APPROVED) return;

  await requestInvoiceAfterPayment(order, order.payments?.[0] || {});
  revalidateAdminOrderPaths();
}

async function refreshAutomatedInvoiceStatus(formData) {
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

  await refreshInvoiceStatus(order);
  revalidateAdminOrderPaths();
}

async function cancelAutomatedInvoice(formData) {
  "use server";

  try {
    await assertAdminAccess(cleanFormValue(formData.get("token")));
  } catch {
    return;
  }

  const orderId = cleanFormValue(formData.get("orderId"));
  const justification = cleanFormValue(formData.get("cancelJustification"));
  if (!orderId || !justification) return;

  const order = await getOrderById(orderId);
  if (!order) return;

  await cancelInvoice(order, justification);
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

function countFilters(rows) {
  return FILTERS.reduce((counts, filter) => {
    counts[filter.id] = rows.filter((row) => row.filters.includes(filter.id)).length;
    return counts;
  }, {});
}

function getRowFilters({ order, fulfillment }) {
  const filters = ["todos"];

  if (order.metadata?.paymentReview || order.metadata?.paymentAlerts?.length > 0
    || (isCompleted(order, fulfillment) && hasShippedPending(order, fulfillment))
    || order.paymentStatus === PAYMENT_STATUS.REFUNDED
    || (order.status === ORDER_STATUS.CANCELLED && [INVOICE_STATUS.MANUAL_ISSUED, INVOICE_STATUS.API_ISSUED].includes(fulfillment.invoice.status))
    || [ORDER_STATUS.NEEDS_TECHNICAL_REVIEW, ORDER_STATUS.PAID_PENDING_REVIEW].includes(order.status)
    || fulfillment.production.status === PRODUCTION_STATUS.BLOCKED) {
    filters.push("atencao");
  }

  if (order.status !== ORDER_STATUS.CANCELLED && order.paymentStatus !== PAYMENT_STATUS.APPROVED
    && order.paymentStatus !== PAYMENT_STATUS.REFUNDED) {
    filters.push("pagamento");
  }

  if (isPrintQueueRelevant(order, fulfillment)) {
    filters.push("impressao");
  }

  if (canEditAdminOrderSection(order, "shipment") && !isCompleted(order, fulfillment)) {
    filters.push("expedicao");
  }

  if (needsInvoiceIssue(order, fulfillment)) {
    filters.push("notafiscal");
  }

  if (isCompleted(order, fulfillment)) {
    filters.push("concluidos");
  }

  return filters;
}

function isPrintQueueRelevant(order, fulfillment) {
  if (!canEditAdminOrderSection(order, "production")) return false;
  return [
    PRODUCTION_STATUS.QUEUED,
    PRODUCTION_STATUS.SCHEDULED,
    PRODUCTION_STATUS.IN_PRODUCTION,
    PRODUCTION_STATUS.QUALITY_CHECK
  ].includes(fulfillment.production.status);
}

function isCompleted(order, fulfillment) {
  return order.status === ORDER_STATUS.SHIPPED
    || fulfillment.production.status === PRODUCTION_STATUS.SHIPPED
    || [SHIPMENT_STATUS.SHIPPED, SHIPMENT_STATUS.DELIVERED].includes(fulfillment.shipment.status);
}

function needsInvoiceIssue(order, fulfillment) {
  return order.status !== ORDER_STATUS.CANCELLED
    && !order.metadata?.paymentReview
    && (canRequestInvoice(order, fulfillment)
      || (order.paymentStatus === PAYMENT_STATUS.APPROVED && isHomologationInvoice(fulfillment.invoice)));
}

function canRequestInvoice(order, fulfillment) {
  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED) return false;

  return ![
    INVOICE_STATUS.API_ISSUED,
    INVOICE_STATUS.MANUAL_ISSUED,
    INVOICE_STATUS.NOT_REQUIRED,
    INVOICE_STATUS.CANCELLED
  ].includes(fulfillment.invoice.status);
}

function getNextOrderAction({ order, fulfillment, queuePosition }) {
  if (order.status === ORDER_STATUS.CANCELLED || order.paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return isIssuedInvoice(fulfillment.invoice)
      ? { tone: "danger", title: "Pedido cancelado com NF emitida", detail: "Não envie para produção. Cancele a NF no emissor e registre o cancelamento." }
      : { tone: "danger", title: "Pedido cancelado", detail: "Não envie para produção." };
  }

  if (order.metadata?.paymentReview) {
    return { tone: "warning", title: "Conferir pagamento no Mercado Pago", detail: "Pagamento divergente ou recebido após cancelamento. Produção, NF e expedição bloqueadas para conferência." };
  }

  if ([ORDER_STATUS.NEEDS_TECHNICAL_REVIEW, ORDER_STATUS.PAID_PENDING_REVIEW].includes(order.status)) {
    return { tone: "warning", title: "Conferir revisão técnica", detail: "Confira as medidas e a solicitação do cliente antes de prosseguir." };
  }

  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
    return { tone: "danger", title: "Conferir reembolso", detail: "Confira estorno, nota fiscal e qualquer produção ou envio já realizado." };
  }

  if ([PAYMENT_STATUS.REJECTED, PAYMENT_STATUS.EXPIRED].includes(order.paymentStatus)) {
    return { tone: "danger", title: "Retomar cobrança", detail: "Pagamento não aprovado." };
  }

  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED) {
    return { tone: "warning", title: "Aguardar pagamento", detail: "Pedido registrado, fora da fila de produção." };
  }

  if (isCompleted(order, fulfillment)) {
    if (needsInvoiceIssue(order, fulfillment)) {
      return { tone: "warning", title: "Registrar NF do pedido expedido", detail: "O pedido já saiu, mas a NF-e ainda não foi registrada. Emita no emissor e registre número, série e chave." };
    }
    if (isNotificationProblem(fulfillment.shipment.notification)) {
      return { tone: "warning", title: "Reenviar e-mail de expedição", detail: "O cliente não recebeu o aviso de envio. Corrija a causa indicada em Expedição e salve novamente." };
    }
    if (fulfillment.shipment.status === SHIPMENT_STATUS.DELIVERED) {
      return { tone: "success", title: "Pedido concluído · entregue", detail: "Entrega registrada no pedido. Nenhuma ação pendente." };
    }
    return {
      tone: "info",
      title: "Expedido · aguardando entrega",
      detail: fulfillment.shipment.trackingCode
        ? `Acompanhe pelo rastreio ${fulfillment.shipment.trackingCode}. Após verificar o recebimento, use “Confirmar entrega” em Expedição.`
        : "Após verificar o recebimento pelo cliente, use “Confirmar entrega” em Expedição. O pedido não tem rastreio registrado."
    };
  }

  if (fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP) {
    return needsInvoiceIssue(order, fulfillment)
      ? { tone: "warning", title: "Emitir NF antes de expedir", detail: "Emita a NF-e no emissor e registre número, série e chave." }
      : { tone: "success", title: "Pronto para expedir", detail: "NF registrada. Informe transportadora e rastreio e marque como Expedido." };
  }

  if (fulfillment.production.status === PRODUCTION_STATUS.BLOCKED) {
    return { tone: "warning", title: "Conferir bloqueio de produção", detail: "Verifique a causa antes de retomar a produção." };
  }

  if ([PRODUCTION_STATUS.IN_PRODUCTION, PRODUCTION_STATUS.QUALITY_CHECK].includes(fulfillment.production.status)) {
    return { tone: "info", title: "Concluir produção", detail: "Marque como Produzido quando a produção manual terminar." };
  }

  return {
    tone: "info",
    title: queuePosition ? `Iniciar produção · posição ${queuePosition} na fila` : "Iniciar produção",
    detail: "Pagamento aprovado. Marque Em produção ao começar."
  };
}

function getOrderStage({ order, fulfillment, queuePosition }) {
  if (order.status === ORDER_STATUS.CANCELLED || order.paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return { label: "Cancelado", tone: "danger" };
  }

  if (order.metadata?.paymentReview) return { label: "Revisar pagamento", tone: "warning" };
  if ([ORDER_STATUS.NEEDS_TECHNICAL_REVIEW, ORDER_STATUS.PAID_PENDING_REVIEW].includes(order.status)) {
    return { label: "Revisão técnica", tone: "warning" };
  }

  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) return { label: "Reembolsado", tone: "danger" };
  if ([PAYMENT_STATUS.REJECTED, PAYMENT_STATUS.EXPIRED].includes(order.paymentStatus)) {
    return { label: "Pagamento não aprovado", tone: "danger" };
  }

  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED) {
    return { label: "Aguardando pagamento", tone: "warning" };
  }

  if (isCompleted(order, fulfillment)) {
    if (fulfillment.shipment.status === SHIPMENT_STATUS.DELIVERED) return { label: "Entregue", tone: "success" };
    return { label: "Expedido", tone: hasShippedPending(order, fulfillment) ? "warning" : "info" };
  }

  if (fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP) {
    return { label: "Produzido", tone: needsInvoiceIssue(order, fulfillment) ? "warning" : "success" };
  }

  if (fulfillment.production.status === PRODUCTION_STATUS.BLOCKED) {
    return { label: "Produção bloqueada", tone: "warning" };
  }

  if ([PRODUCTION_STATUS.IN_PRODUCTION, PRODUCTION_STATUS.QUALITY_CHECK].includes(fulfillment.production.status)) {
    return { label: "Em produção", tone: "info" };
  }

  return { label: queuePosition ? `Na fila · #${queuePosition}` : "Na fila de produção", tone: "info" };
}

function hasShippedPending(order, fulfillment) {
  return needsInvoiceIssue(order, fulfillment) || isNotificationProblem(fulfillment.shipment.notification);
}

function isNotificationProblem(notification = {}) {
  return ["failed", "blocked"].includes(notification?.status);
}

// Resumo de andamento por etapa. So exibe dados registrados: "Entregue" aparece
// apenas quando o pedido ja tem shipment.status = delivered.
function getFulfillmentSteps({ order, fulfillment }) {
  const cancelled = order.status === ORDER_STATUS.CANCELLED || order.paymentStatus === PAYMENT_STATUS.CANCELLED;
  const refunded = order.paymentStatus === PAYMENT_STATUS.REFUNDED;
  const approved = order.paymentStatus === PAYMENT_STATUS.APPROVED;
  const completed = isCompleted(order, fulfillment);
  const production = fulfillment.production.status;
  const invoice = fulfillment.invoice;
  const shipment = fulfillment.shipment;

  let payment;
  if (order.metadata?.paymentReview) payment = { state: "problem", value: "Em revisão", detail: "Conferir no Mercado Pago." };
  else if (approved) payment = { state: "done", value: "Aprovado" };
  else if (refunded) payment = { state: "problem", value: "Reembolsado" };
  else if (cancelled) payment = { state: "skip", value: "Cancelado" };
  else if ([PAYMENT_STATUS.REJECTED, PAYMENT_STATUS.EXPIRED].includes(order.paymentStatus)) {
    payment = { state: "problem", value: pt(getPaymentStatusLabel(order.paymentStatus)) };
  } else payment = { state: "todo", value: "Aguardando" };

  let productionStep;
  if (completed || production === PRODUCTION_STATUS.READY_TO_SHIP) productionStep = { state: "done", value: "Produzido" };
  else if (cancelled || refunded) productionStep = { state: "skip", value: "Não se aplica" };
  else if (!approved || order.metadata?.paymentReview) productionStep = { state: "todo", value: "Aguardando pagamento" };
  else if (production === PRODUCTION_STATUS.BLOCKED) productionStep = { state: "problem", value: "Bloqueada" };
  else if ([PRODUCTION_STATUS.IN_PRODUCTION, PRODUCTION_STATUS.QUALITY_CHECK].includes(production)) productionStep = { state: "active", value: "Em produção" };
  else productionStep = { state: "todo", value: "Na fila" };

  let invoiceStep;
  if (isHomologationInvoice(invoice)) invoiceStep = { state: "problem", value: "NF de homologação", detail: "Sem valor fiscal; emita a nota real." };
  else if (isIssuedInvoice(invoice)) {
    invoiceStep = (cancelled || refunded)
      ? { state: "problem", value: `NF ${invoice.number || "emitida"}`, detail: "Pedido cancelado ou reembolsado: cancele a NF no emissor." }
      : { state: "done", value: invoice.number ? `NF ${invoice.number}` : "Emitida" };
  } else if (invoice.status === INVOICE_STATUS.CANCELLED) invoiceStep = { state: "skip", value: "NF cancelada" };
  else if (invoice.status === INVOICE_STATUS.NOT_REQUIRED) invoiceStep = { state: "skip", value: "Não requerida" };
  else if (cancelled || refunded) invoiceStep = { state: "skip", value: "Não se aplica" };
  else if (!approved) invoiceStep = { state: "todo", value: "Após pagamento" };
  else if (invoice.status === INVOICE_STATUS.API_FAILED) invoiceStep = { state: "problem", value: "Falha na emissão" };
  else invoiceStep = { state: completed ? "problem" : "todo", value: "A emitir", detail: completed ? "Pedido já expedido sem NF registrada." : "" };

  let shipmentStep;
  if (shipment.status === SHIPMENT_STATUS.DELIVERED) shipmentStep = { state: "done", value: "Entregue", detail: formatTrackingDetail(shipment) };
  else if (completed) {
    shipmentStep = isNotificationProblem(shipment.notification)
      ? { state: "problem", value: "Expedido", detail: "E-mail de envio não entregue ao cliente." }
      : { state: "done", value: "Expedido", detail: [formatTrackingDetail(shipment), "Entrega não confirmada."].filter(Boolean).join(" · ") };
  } else if (cancelled || refunded) shipmentStep = { state: "skip", value: "Não se aplica" };
  else if (production === PRODUCTION_STATUS.READY_TO_SHIP) {
    shipmentStep = needsInvoiceIssue(order, fulfillment)
      ? { state: "todo", value: "Após a NF" }
      : { state: "active", value: "Preparar envio" };
  }
  else shipmentStep = { state: "todo", value: "Após produção" };

  return [
    { id: "payment", label: "Pagamento", short: "Pag.", ...payment },
    { id: "production", label: "Produção", short: "Prod.", ...productionStep },
    { id: "invoice", label: "Nota fiscal", short: "NF", ...invoiceStep },
    { id: "shipment", label: "Envio", short: "Envio", ...shipmentStep }
  ];
}

function formatTrackingDetail(shipment = {}) {
  return [shipment.carrier, shipment.trackingCode].filter(Boolean).join(" · ");
}

// Secao que o pedido precisa agora; abre por padrao e recebe destaque.
function getPrimarySection({ order, fulfillment }) {
  if (isAdminInvoiceCancellationOnly(order)) {
    return canEditAdminOrderSection(order, "invoice") && isIssuedInvoice(fulfillment.invoice) ? "invoice" : "";
  }
  if (order.paymentStatus !== PAYMENT_STATUS.APPROVED || order.metadata?.paymentReview) return "";
  const completed = isCompleted(order, fulfillment);
  const needsInvoice = needsInvoiceIssue(order, fulfillment);
  if (completed) {
    if (needsInvoice && canEditAdminOrderSection(order, "invoice")) return "invoice";
    if (isNotificationProblem(fulfillment.shipment.notification)) return "shipment";
    return "";
  }
  if (fulfillment.production.status === PRODUCTION_STATUS.READY_TO_SHIP) {
    return needsInvoice && canEditAdminOrderSection(order, "invoice") ? "invoice" : "shipment";
  }
  return canEditAdminOrderSection(order, "production") ? "production" : "";
}

function matchesQuery(order, query) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  const haystack = [
    order.orderNumber,
    order.customer?.name,
    order.customer?.email,
    order.customer?.contact,
    ...(order.items || []).map((item) => item.sku)
  ].map(normalizeSearch).join(" ");
  return haystack.includes(needle);
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Rotulos vindos de lib/ sem acento: corrige apenas a exibicao.
const PT_WORDS = {
  producao: "produção",
  expedicao: "expedição",
  nao: "não",
  automatica: "automática",
  revisao: "revisão",
  serie: "série",
  numero: "número",
  emissao: "emissão"
};

function pt(text) {
  return String(text ?? "").replace(/\b(producao|expedicao|nao|automatica|revisao|serie|numero|emissao)\b/gi, (word) => {
    const fixed = PT_WORDS[word.toLowerCase()];
    return word[0] === word[0].toUpperCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;
  });
}

function formatShippingAddress(order) {
  const address = order.metadata?.shippingAddress || {};
  if (!address.street && !address.postalCode && !address.city) return "";

  const streetLine = [address.street, address.number].filter(Boolean).join(", ")
    + (address.complement ? ` (${address.complement})` : "");
  const cityLine = [address.district, [address.city, address.state].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" – ");
  const postalLine = address.postalCode ? `CEP ${address.postalCode}` : "";

  return [streetLine, cityLine, postalLine].filter(Boolean).join(" · ");
}

function formatInvoiceShort(invoice) {
  if (isHomologationInvoice(invoice)) return "NF de homologação";
  return invoice.number ? `NF ${invoice.number}` : pt(getInvoiceStatusLabel(invoice.status));
}

function formatInvoiceSummary(invoice) {
  const label = pt(getInvoiceStatusLabel(invoice.status));
  const details = [
    invoice.number ? `NF ${invoice.number}${invoice.series ? ` série ${invoice.series}` : ""}` : "",
    invoice.providerId ? `ID ${invoice.providerId}` : "",
    invoice.statusDetail || ""
  ].filter(Boolean);

  return details.length ? `${label} · ${details.join(" · ")}` : label;
}

function isIssuedInvoice(invoice) {
  return [INVOICE_STATUS.MANUAL_ISSUED, INVOICE_STATUS.API_ISSUED].includes(invoice?.status);
}

function comparePrintQueueRows(left, right) {
  if (left.queuePosition && right.queuePosition) return left.queuePosition - right.queuePosition;
  if (left.queuePosition) return -1;
  if (right.queuePosition) return 1;
  return String(left.order.createdAt || "").localeCompare(String(right.order.createdAt || ""));
}

function formatProductionStage(status) {
  if (status === PRODUCTION_STATUS.WAITING_PAYMENT) return "Aguardando pagamento";
  if (status === PRODUCTION_STATUS.BLOCKED) return "Bloqueado";
  if ([PRODUCTION_STATUS.IN_PRODUCTION, PRODUCTION_STATUS.QUALITY_CHECK].includes(status)) return "Em produção";
  if (status === PRODUCTION_STATUS.READY_TO_SHIP) return "Produzido";
  if (status === PRODUCTION_STATUS.SHIPPED) return "Expedido";
  return "Na fila";
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

function formatPrintJobStatus(status) {
  const labels = {
    queued: "Na fila",
    processing: "Processando",
    succeeded: "Concluído",
    failed: "Falhou",
    cancelled: "Cancelado"
  };
  return labels[status] || status || "Sem status";
}

function formatPrintJobMaterial(material = {}) {
  return [material.code?.toUpperCase(), material.color, material.profileId].filter(Boolean).join(" | ") || "Não informado";
}

const PARAMETER_LABELS = {
  altura: "Altura",
  alturaApoio: "Altura de apoio",
  alturaHaste: "Altura da haste",
  alturaPescoco: "Altura do pescoço",
  diametroHaste: "Diâmetro da haste",
  diametroPescoco: "Diâmetro do pescoço",
  haste: "Haste",
  pescoco: "Pescoço",
  alturaBase: "Altura da base",
  alturaInterna: "Altura interna",
  comprimento: "Comprimento",
  diametro: "Diâmetro",
  diametroBase: "Diâmetro da base",
  diametroInterno: "Diâmetro interno",
  distanciaFuros: "Distância entre furos",
  largura: "Largura",
  larguraInterna: "Largura interna",
  parede: "Parede",
  paredeTubo: "Parede do tubo",
  profundidadeInsercao: "Profundidade de inserção",
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
    atencao: "uma situação que exige conferência",
    todos: "pedidos",
    pagamento: "pagamento",
    impressao: "produção",
    expedicao: "expedição",
    notafiscal: "nota fiscal a emitir",
    concluidos: "expedidos"
  };
  return labels[filter] || "pedidos";
}

function formatOrderProducts(order) {
  if (!order.items.length) return "Pedido especial";

  const [firstItem, ...remainingItems] = order.items;
  const firstName = formatProductName(firstItem);

  if (!remainingItems.length) return firstName;

  return `${firstName} + ${remainingItems.length} item${remainingItems.length > 1 ? "s" : ""}`;
}

function formatProductName(item) {
  const hasStem = hasActiveStem(item.values);

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

  return [item.categoryName, item.formatName].filter(Boolean).join(" · ") || item.sku || "Produto sem nome";
}

// Um toggle explicito (haste/pescoco = false) prevalece sobre dimensoes inativas
// que o configurador mantem como padrao. Sem toggle, vale a dimensao positiva
// (compatibilidade com pedidos antigos).
const STEM_TOGGLES = [
  { toggle: "haste", suffix: "Haste" },
  { toggle: "pescoco", suffix: "Pescoco" }
];

function hasActiveStem(values = {}) {
  return STEM_TOGGLES.some(({ toggle, suffix }) => {
    if (typeof values?.[toggle] === "boolean") return values[toggle];
    return Number(values?.[`altura${suffix}`] || 0) > 0;
  });
}

// Medidas exibidas na ficha: oculta dimensoes de haste/pescoco desligados.
// O JSON de fabricacao continua com os valores originais.
function getVisibleMeasures(item) {
  const values = item.values || {};
  const inactiveSuffixes = STEM_TOGGLES
    .filter(({ toggle }) => values[toggle] === false)
    .map(({ suffix }) => suffix);
  return Object.entries(values).filter(([key]) => !inactiveSuffixes.some((suffix) => key !== suffix.toLowerCase() && key.endsWith(suffix)));
}

function formatModelKey(item) {
  return [item.categorySlug, item.formatSlug].filter(Boolean).join(" / ") || "modelo-parametrico";
}

function formatParameterLabel(key) {
  return PARAMETER_LABELS[key] || String(key).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function formatParameterValue(value) {
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (value === null || value === undefined || value === "") return "N/A";

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `${value} mm`;

  return String(value);
}

function formatShippingDetail(shipping = {}) {
  const service = [shipping.companyName, shipping.serviceName].filter(Boolean).join(" · ");
  const delivery = Number(shipping.deliveryTimeDays || 0) > 0
    ? `${shipping.deliveryTimeDays} dia(s) estimado(s)`
    : "";
  const source = shipping.source ? `origem ${shipping.source}` : "";
  const fulfillment = shipping.fulfillmentLabel || (shipping.fulfillmentMode === "manual_posting" ? "Postagem manual" : "");
  return [service, delivery, fulfillment, source].filter(Boolean).join(" · ") || "Frete sem detalhe operacional";
}

function formatShipmentNotificationStatus(notification = {}) {
  if (notification.status === "sent") {
    return `Cliente avisado por e-mail em ${formatDateTime(notification.sentAt)}.`;
  }

  if (notification.lastErrorCode === "missing_customer_email") {
    return "E-mail de envio bloqueado: o pedido não tem e-mail do cliente. A expedição foi salva; corrija o cadastro e salve novamente para tentar o envio.";
  }

  if (notification.lastErrorCode === "missing_resend_api_key") {
    return "E-mail de envio bloqueado: RESEND_API_KEY não está configurada. A expedição foi salva; configure o provedor e salve novamente para tentar o envio.";
  }

  if (notification.lastErrorCode === "missing_email_from") {
    return "E-mail de envio bloqueado: TRANSACTIONAL_EMAIL_FROM ou ACCOUNT_EMAIL_FROM não está configurado. A expedição foi salva; configure o remetente e salve novamente.";
  }

  if (notification.status === "failed") {
    return "Falha ao enviar o e-mail de expedição. O pedido continua expedido; salve novamente para repetir a tentativa.";
  }

  return "Ao salvar a expedição como Expedido, o cliente recebe um e-mail. Transportadora e rastreio entram na mensagem quando informados.";
}

function formatDateTime(value) {
  if (!value) return "data não informada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function cleanFormValue(value) {
  return String(value || "").trim();
}

function revalidateAdminOrderPaths() {
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/operacao");
}
