"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/format";
import {
  getOrderStatusLabel,
  getPaymentStatusLabel,
  isPayableOrder,
  ORDER_STATUS,
  PAYMENT_STATUS
} from "@/lib/order-status";
import { brand } from "@/lib/site-data";

const FILTERS = [
  ["all", "Todos"],
  ["progress", "Em andamento"],
  ["payment", "Aguardando pagamento"],
  ["paid", "Pagos"],
  ["finished", "Concluídos"]
];

const FINISHED = new Set([ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED]);
const PAID = new Set([PAYMENT_STATUS.APPROVED]);
const PAYMENT_ACTION_NEEDED = new Set([
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.REJECTED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.EXPIRED,
  PAYMENT_STATUS.UNKNOWN
]);

const AUTH_ERROR_MESSAGES = {
  google_login_cancelled: "Login Google cancelado.",
  google_login_failed: "Nao foi possivel concluir o login Google.",
  google_login_unavailable: "Login Google indisponivel no momento.",
  google_state_invalid: "Sessao de login expirada. Tente novamente.",
  missing_google_oauth_config: "Login Google ainda nao esta configurado.",
  google_oauth_token_failed: "Nao foi possivel validar o login Google.",
  google_userinfo_failed: "Nao foi possivel carregar os dados da conta Google.",
  google_email_not_verified: "A conta Google precisa ter e-mail verificado."
};

export function AccountAccess({ googleEnabled = false, authError = "" }) {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("request");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/account/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber, ...(phase === "verify" ? { code } : {}) })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      if (payload.challenge) {
        setPhase("verify");
        setDevCode(payload.devCode || "");
        return;
      }
      window.location.reload();
    } catch (caughtError) {
      setError(caughtError.message || "Não foi possível acessar sua conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="account-access">
      <div className="account-access__intro">
        <p className="eyebrow">Minha conta</p>
        <h1>Acompanhe cada etapa, da medida à entrega.</h1>
        <p className="lead">
          Consulte pedidos, pagamentos, especificações técnicas e prazos usando os dados enviados na compra.
        </p>
        <ul className="account-access__benefits">
          <li><strong>Pedidos reunidos</strong><span>Histórico vinculado ao mesmo e-mail.</span></li>
          <li><strong>Pagamento claro</strong><span>Valor, situação e próxima ação.</span></li>
          <li><strong>Recompra técnica</strong><span>SKU, medidas, cor e quantidade preservados.</span></li>
        </ul>
      </div>

      <form className="account-login" onSubmit={handleSubmit} aria-busy={submitting}>
        <div>
          <p className="eyebrow">Acesso seguro</p>
          <h2>Entre na sua conta</h2>
          <p>Use sua conta Google ou receba um codigo no e-mail de qualquer pedido associado a ele.</p>
        </div>
        {googleEnabled && (
          <>
            <a className="button button-secondary button-block account-google-button" href="/api/account/google/start?returnTo=/conta">
              <span aria-hidden="true">G</span>
              Entrar com Google
            </a>
            <div className="account-login__divider" role="separator">
              <span>ou</span>
            </div>
          </>
        )}
        <label className="field">
          <span>E-mail da compra</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={phase === "verify"}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Número do pedido</span>
          <input
            autoComplete="off"
            required
            placeholder="BF-260619-ABCD"
            disabled={phase === "verify"}
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
          />
        </label>
        {phase === "verify" && (
          <label className="field">
            <span>Código recebido por e-mail</span>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength="6" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
          </label>
        )}
        {devCode && <p className="account-alert" role="status">Ambiente local: use o código <strong>{devCode}</strong>.</p>}
        {authError && AUTH_ERROR_MESSAGES[authError] && (
          <p className="account-alert account-alert--error" role="alert">{AUTH_ERROR_MESSAGES[authError]}</p>
        )}
        {error && <p className="account-alert account-alert--error" role="alert">{error}</p>}
        <button className="button button-primary button-block" disabled={submitting}>
          {submitting ? "Validando..." : phase === "verify" ? "Confirmar código" : "Enviar código de acesso"}
        </button>
        {phase === "verify" && <button className="button button-secondary button-block" type="button" onClick={() => { setPhase("request"); setCode(""); setDevCode(""); }}>Usar outros dados</button>}
        <small>Não encontrou o número? Consulte a confirmação recebida após finalizar o pedido.</small>
      </form>
    </section>
  );
}

export function AccountDashboard({ email, orders }) {
  const [filter, setFilter] = useState("all");
  const [paymentError, setPaymentError] = useState("");
  const customer = orders[0]?.customer;
  const latestAddress = orders.find((order) => order.shippingAddress)?.shippingAddress;
  const summary = useMemo(() => ({
    totalPaid: orders
      .filter((order) => PAID.has(order.paymentStatus))
      .reduce((sum, order) => sum + Number(order.totalBrl || 0), 0),
    paid: orders.filter((order) => PAID.has(order.paymentStatus)).length,
    progress: orders.filter((order) => !FINISHED.has(order.status)).length
  }), [orders]);
  const visibleOrders = orders.filter((order) => matchesFilter(order, filter));

  async function logout() {
    await fetch("/api/account/session", { method: "DELETE" });
    window.location.reload();
  }

  async function retryPayment(orderId) {
    setPaymentError("");
    const response = await fetch("/api/payments/mercado-pago/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    });
    const payload = await response.json();
    if (!response.ok || !payload.checkoutUrl) {
      setPaymentError(payload.message || "Não foi possível iniciar o pagamento.");
      return;
    }
    window.location.assign(payload.checkoutUrl);
  }

  return (
    <section className="account-shell">
      <header className="account-heading">
        <div>
          <p className="eyebrow">Minha conta</p>
          <h1>Olá, {firstName(customer?.name) || "cliente"}.</h1>
          <p>Aqui está o registro comercial vinculado a {email}.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={logout}>Sair com segurança</button>
      </header>

      <div className="account-layout">
        <nav className="account-nav" aria-label="Seções da conta">
          <a href="#visao-geral">Visão geral</a>
          <a href="#pedidos">Pedidos</a>
          <a href="#dados">Meus dados</a>
          <a href="#ajuda">Ajuda e privacidade</a>
        </nav>

        <div className="account-content">
          <section id="visao-geral" className="account-section" aria-labelledby="overview-title">
            <div className="account-section__heading">
              <div><p className="eyebrow">Visão geral</p><h2 id="overview-title">Sua relação com a Baseforma</h2></div>
              <Link className="button button-primary" href="/catalogo">Novo pedido</Link>
            </div>
            <dl className="account-metrics">
              <div><dt>Pedidos</dt><dd>{orders.length}</dd></div>
              <div><dt>Em andamento</dt><dd>{summary.progress}</dd></div>
              <div><dt>Pagos</dt><dd>{summary.paid}</dd></div>
              <div><dt>Total pago</dt><dd>{formatCurrency(summary.totalPaid)}</dd></div>
            </dl>
          </section>

          <section id="pedidos" className="account-section" aria-labelledby="orders-title">
            <div className="account-section__heading">
              <div><p className="eyebrow">Pedidos</p><h2 id="orders-title">Histórico e andamento</h2></div>
              <div className="account-filters" aria-label="Filtrar pedidos">
                {FILTERS.map(([value, label]) => (
                  <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>
                ))}
              </div>
            </div>
            {paymentError && <p className="account-alert account-alert--error" role="alert">{paymentError}</p>}
            {visibleOrders.length ? (
              <div className="account-orders">
                {visibleOrders.map((order) => <OrderRow key={order.id} order={order} onPay={retryPayment} />)}
              </div>
            ) : (
              <div className="account-empty"><h3>Nenhum pedido neste filtro.</h3><p>Escolha outra situação ou inicie uma nova configuração.</p></div>
            )}
          </section>

          <section id="dados" className="account-section" aria-labelledby="data-title">
            <div className="account-section__heading"><div><p className="eyebrow">Cadastro</p><h2 id="data-title">Meus dados</h2></div></div>
            <dl className="account-profile">
              <div><dt>Nome</dt><dd>{customer?.name || "Não informado"}</dd></div>
              <div><dt>E-mail da conta</dt><dd>{email}</dd></div>
              <div><dt>Contato</dt><dd>{customer?.contact || "Não informado"}</dd></div>
            </dl>
            <div className="account-address">
              <strong>Último endereço de entrega</strong>
              <span>{formatAddress(latestAddress) || "Ainda não há endereço registrado nos pedidos desta conta."}</span>
            </div>
            <p className="account-note">Para alterar e-mail ou contato sem perder o vínculo com pedidos anteriores, fale com o atendimento.</p>
          </section>

          <section id="ajuda" className="account-section" aria-labelledby="help-title">
            <div className="account-section__heading"><div><p className="eyebrow">Suporte</p><h2 id="help-title">Ajuda e privacidade</h2></div></div>
            <div className="account-help">
              <div><h3>Precisa falar sobre um pedido?</h3><p>Tenha o número do pedido em mãos para agilizar a análise.</p><a href={`https://wa.me/${brand.whatsappNumber}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a></div>
              <div><h3>Seus dados</h3><p>Solicite acesso, correção ou exclusão de dados pelo canal oficial.</p><a href={`mailto:${brand.email}?subject=Privacidade e dados pessoais`}>{brand.email}</a></div>
              <div><h3>Dúvidas frequentes</h3><p>Consulte compatibilidade, preço, prazo, material e acabamento.</p><Link href="/faq">Abrir FAQ</Link></div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function OrderRow({ order, onPay }) {
  const latestPayment = order.payments?.[0];
  const payable = isPayableOrder(order.status);

  return (
    <details className="account-order">
      <summary>
        <span className={`status-dot status-dot--${statusTone(order)}`} aria-hidden="true" />
        <span><strong>{order.orderNumber}</strong><small>{formatDate(order.createdAt)} · {order.items.length || "Projeto especial"} {order.items.length === 1 ? "item" : "itens"}</small></span>
        <span className="account-order__status"><strong>{getOrderStatusLabel(order.status)}</strong><small>Pagamento {getPaymentStatusLabel(order.paymentStatus).toLowerCase()}</small></span>
        <strong className="account-order__total">{formatCurrency(order.totalBrl)}</strong>
      </summary>
      <div className="account-order__detail">
        <div className="order-progress" aria-label={`Andamento: ${getOrderStatusLabel(order.status)}`}>
          {buildSteps(order).map((step) => <span key={step.label} className={step.done ? "is-done" : ""}><i aria-hidden="true" />{step.label}</span>)}
        </div>
        <dl className="order-facts">
          <div><dt>Pedido</dt><dd>{order.orderNumber}</dd></div>
          <div><dt>Última atualização</dt><dd>{formatDate(order.updatedAt)}</dd></div>
          <div><dt>Prazo produtivo</dt><dd>{order.leadTimeDays ? `${order.leadTimeDays} dias úteis` : "Após revisão técnica"}</dd></div>
          <div><dt>Pagamento</dt><dd>{latestPayment ? `${getPaymentStatusLabel(latestPayment.status)} · ${formatCurrency(latestPayment.amountBrl)}` : getPaymentStatusLabel(order.paymentStatus)}</dd></div>
        </dl>
        <div className="account-address">
          <strong>Entrega deste pedido</strong>
          <span>{formatAddress(order.shippingAddress) || "Endereço não registrado neste pedido."}</span>
        </div>
        {order.items.length > 0 && <div className="order-items">{order.items.map((item) => (
          <article key={item.id}>
            <div><p className="eyebrow">{item.categoryName}</p><h3>{item.formatName}</h3><code>{item.sku}</code></div>
            <dl>{visibleItemValues(item.values).map(([key, value]) => <div key={key}><dt>{formatKey(key)}</dt><dd>{formatSpecValue(key, value)}</dd></div>)}<div><dt>Cor</dt><dd>{item.color || "Não informada"}</dd></div><div><dt>Quantidade</dt><dd>{item.quantity}</dd></div></dl>
            <strong>{formatCurrency(item.totalPriceBrl)}</strong>
          </article>
        ))}</div>}
        {order.commerce && (
          <dl className="checkout-totals account-order__totals">
            <div><dt>Produtos</dt><dd>{formatCurrency(order.commerce.itemsSubtotalBrl)}</dd></div>
            <div><dt>Desconto</dt><dd>{order.commerce.discount?.applied ? `-${formatCurrency(order.commerce.discount.amountBrl)}` : formatCurrency(0)}</dd></div>
            <div><dt>Frete</dt><dd>{formatCurrency(order.commerce.shipping?.amountBrl || 0)}</dd></div>
            <div className="checkout-totals__total"><dt>Total</dt><dd>{formatCurrency(order.commerce.totalBrl)}</dd></div>
          </dl>
        )}
        <div className="account-order__actions">
          {payable && <button className="button button-primary" type="button" onClick={() => onPay(order.id)}>Pagar agora</button>}
          <a className="button button-secondary" href={`https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(`Olá, preciso de ajuda com o pedido ${order.orderNumber}.`)}`} target="_blank" rel="noreferrer">Ajuda com este pedido</a>
        </div>
      </div>
    </details>
  );
}

function matchesFilter(order, filter) {
  if (filter === "finished") return FINISHED.has(order.status);
  if (filter === "payment") return PAYMENT_ACTION_NEEDED.has(order.paymentStatus);
  if (filter === "paid") return PAID.has(order.paymentStatus);
  if (filter === "progress") return !FINISHED.has(order.status);
  return true;
}

function statusTone(order) {
  if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.PAYMENT_FAILED) return "danger";
  if (PAID.has(order.paymentStatus)) return "success";
  return "warning";
}

function buildSteps(order) {
  const paid = PAID.has(order.paymentStatus) || order.paymentStatus === PAYMENT_STATUS.REFUNDED;
  const production = [ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.SHIPPED].includes(order.status);
  return [
    { label: "Pedido recebido", done: true },
    { label: "Pagamento", done: paid },
    { label: "Validação técnica", done: paid && order.status !== ORDER_STATUS.PAID_PENDING_REVIEW },
    { label: "Produção", done: production },
    { label: "Envio", done: order.status === ORDER_STATUS.SHIPPED }
  ];
}

function formatDate(value) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0];
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function visibleItemValues(values = {}) {
  return Object.entries(values).filter(([key]) => {
    if (values.pescoco) return true;
    return key !== "alturaPescoco" && key !== "diametroPescoco";
  });
}

function formatSpecValue(key, value) {
  if (key === "pescoco") return value ? "Sim" : "Não";
  return `${value} mm`;
}

function formatAddress(address) {
  if (!address?.street) return "";
  return [
    `${address.street}, ${address.number}`,
    address.complement,
    address.district,
    `${address.city || ""}${address.state ? ` - ${address.state}` : ""}`,
    address.postalCode ? `CEP ${address.postalCode}` : ""
  ].filter(Boolean).join(" · ");
}
