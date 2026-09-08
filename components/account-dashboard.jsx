"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
const PRODUCTION_DONE = new Set(["ready_to_ship", "shipped"]);
const SHIPMENT_DONE = new Set(["shipped", "delivered"]);

export function AccountAccess({ initialOrderNumber = "" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState(() => normalizeOrderNumber(initialOrderNumber));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState("request");
  const [authMode, setAuthMode] = useState("code");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (phase !== "verify") return undefined;
    codeInputRef.current?.focus();
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (authMode === "password") {
      setSubmitting(true); setError("");
      try {
        const { response } = await postAccountSession({ email, password });
        if (!response.ok) throw new Error("E-mail ou senha não conferem.");
        router.replace("/conta"); router.refresh();
      } catch (caughtError) { setError(caughtError.message); }
      finally { setSubmitting(false); }
      return;
    }
    if (phase === "verify") {
      await verifyCode();
      return;
    }
    await requestCode();
  }

  async function requestCode() {
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const { response, payload } = await postAccountSession({ email, orderNumber, ...(recovery ? { recovery: true } : {}) });
      if (!response.ok) {
        if (response.status === 429) setResendSeconds(Number(payload.retryAfter || 60));
        throw new Error(payload.message || "Não foi possível enviar o código.");
      }
      setPhase("verify");
      setCode("");
      setDevCode(payload.devCode || "");
      setResendSeconds(Number(payload.retryAfter || 60));
      setNotice(payload.message || "Código enviado. Confira sua caixa de entrada.");
    } catch (caughtError) {
      setError(caughtError.message || "Não foi possível acessar sua conta.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) {
      setError("Digite os 6 números do código recebido.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const { response, payload } = await postAccountSession({ email, code });
      if (!response.ok) throw new Error(payload.message || "Código inválido ou expirado.");
      setNotice("Acesso confirmado. Abrindo sua conta...");
      router.replace("/conta");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError.message || "Não foi possível confirmar o código.");
      setCode("");
      window.requestAnimationFrame(() => codeInputRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  function changeAccount() {
    setPhase("request");
    setCode("");
    setDevCode("");
    setError("");
    setNotice("");
    setResendSeconds(0);
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
        <div className="account-login__heading">
          <p className="eyebrow">Acesso seguro</p>
          {authMode === "code" && <div className="account-login__progress" aria-label={`Etapa ${phase === "request" ? 1 : 2} de 2`}>
              <span className="is-active">1</span>
              <i aria-hidden="true" />
              <span className={phase === "verify" ? "is-active" : ""}>2</span>
            </div>}
          <h2>{authMode === "password" ? "Entre com sua senha" : phase === "verify" ? "Confira seu e-mail" : "Entre na sua conta"}</h2>
          <p>
            {authMode === "password"
              ? "Use o e-mail da compra e a senha criada na sua conta."
              : phase === "verify"
              ? <>Enviamos um código de 6 números para <strong>{maskEmail(email)}</strong>. Ele vale por 10 minutos.</>
              : recovery
                ? "Informe o e-mail da sua conta para receber um código de recuperação."
                : "Use o e-mail da compra e o número de qualquer pedido para receber um código de acesso."}
          </p>
        </div>
        {authMode === "password" ? (
          <div className="account-login__fields">
            <label className="field"><span>E-mail</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          </div>
        ) : phase === "request" ? (
          <div className="account-login__fields">
            <label className="field">
              <span>E-mail da compra</span>
              <input
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                required
                placeholder="voce@empresa.com.br"
                value={email}
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
              />
            </label>
            <label className="field">
              <span>Número do pedido</span>
              <input
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
                required={!recovery}
                placeholder="BF-260619-ABCD1234EFGH"
                value={orderNumber}
                aria-describedby="account-order-help"
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setOrderNumber(normalizeOrderNumber(event.target.value));
                  setError("");
                }}
              />
              <small id="account-order-help">Você encontra esse número no e-mail de confirmação do pedido.</small>
            </label>
          </div>
        ) : (
          <div className="account-login__verification">
            <label className="field">
              <span>Código de acesso</span>
              <input
                ref={codeInputRef}
                className="account-login__code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                maxLength="6"
                required
                placeholder="000000"
                value={code}
                aria-describedby="account-code-help"
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
              />
              <small id="account-code-help">Digite apenas os 6 números. Confira também a pasta de spam.</small>
            </label>
          </div>
        )}
        {devCode && <p className="account-alert" role="status">Ambiente local: use o código <strong>{devCode}</strong>.</p>}
        {notice && <p className="account-alert account-alert--success" role="status" aria-live="polite">{notice}</p>}
        {error && <p className="account-alert account-alert--error" role="alert">{error}</p>}
        <button className="button button-primary button-block" disabled={submitting || (phase === "verify" && code.length !== 6)}>
          {submitting
            ? authMode === "password" ? "Entrando..." : phase === "verify" ? "Entrando..." : "Enviando código..."
            : authMode === "password" ? "Entrar com senha" : phase === "verify" ? "Entrar na minha conta" : "Continuar"}
        </button>
        {phase === "request" && <button type="button" className="account-login__link" onClick={() => { setAuthMode(authMode === "code" ? "password" : "code"); setError(""); }}>
          {authMode === "code" ? "Entrar com senha" : "Entrar com código"}
        </button>}
        {authMode === "password" && <button type="button" className="account-login__link" onClick={() => { setAuthMode("code"); setRecovery(true); setPhase("request"); setError(""); }}>Esqueci minha senha</button>}
        {phase === "verify" && (
          <div className="account-login__secondary-actions">
            <button
              className="account-login__link"
              type="button"
              disabled={submitting || resendSeconds > 0}
              onClick={requestCode}
            >
              {resendSeconds > 0 ? `Reenviar em ${resendSeconds}s` : "Reenviar código"}
            </button>
            <button className="account-login__link" type="button" disabled={submitting} onClick={changeAccount}>
              Trocar e-mail ou pedido
            </button>
          </div>
        )}
        <p className="account-login__privacy">{authMode === "password" ? "Sua senha e sua sessão são protegidas. O acesso por código continua disponível." : "Sem senha. Sua sessão fica protegida neste dispositivo e pode ser encerrada a qualquer momento."}</p>
      </form>
    </section>
  );
}

async function postAccountSession(body) {
  const response = await fetch("/api/account/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function normalizeOrderNumber(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
}

function maskEmail(value) {
  const [localPart = "", domain = ""] = String(value || "").trim().split("@");
  if (!domain) return value;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"•".repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}

export function AccountDashboard({ email, orders, demo = false, passwordAvailable = false }) {
  const [filter, setFilter] = useState("all");
  const [paymentError, setPaymentError] = useState("");
  const [hasPassword, setHasPassword] = useState(passwordAvailable);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [securityPassword, setSecurityPassword] = useState("");
  const [securityNotice, setSecurityNotice] = useState("");
  const [securityError, setSecurityError] = useState(false);
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const passwordInputRef = useRef(null);
  const customer = orders[0]?.customer;
  const latestAddress = orders.find((order) => order.shippingAddress)?.shippingAddress;
  const summary = useMemo(() => ({
    totalPaid: orders
      .filter((order) => PAID.has(order.paymentStatus))
      .reduce((sum, order) => sum + Number(order.totalBrl || 0), 0),
    paid: orders.filter((order) => PAID.has(order.paymentStatus)).length,
    progress: orders.filter((order) => !isFinishedOrder(order)).length
  }), [orders]);
  const attentionOrders = orders.filter((order) => PAYMENT_ACTION_NEEDED.has(order.paymentStatus) && !isFinishedOrder(order));
  const visibleOrders = orders.filter((order) => matchesFilter(order, filter));

  function showPaymentOrders() {
    setFilter("payment");
    window.requestAnimationFrame(() => document.getElementById("pedidos")?.scrollIntoView({ behavior: "smooth" }));
  }

  async function logout() {
    if (demo) {
      window.localStorage.removeItem("baseforma-demo-orders");
      window.location.assign("/catalogo");
      return;
    }
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

  async function savePassword(event) {
    event.preventDefault();
    if (securitySubmitting) return;
    setSecurityNotice("");
    setSecurityError(false);
    setSecuritySubmitting(true);
    try {
      const response = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: securityPassword }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setSecurityError(true); setSecurityNotice(payload.message || "Não foi possível salvar a senha."); return; }
      setSecurityPassword("");
      setHasPassword(true);
      setShowPasswordSetup(false);
      setSecurityNotice(hasPassword ? "Senha atualizada. As outras sessões foram encerradas." : "Senha criada. Agora você também pode entrar sem código.");
    } catch {
      setSecurityError(true);
      setSecurityNotice("Não foi possível salvar a senha. Tente novamente.");
    } finally {
      setSecuritySubmitting(false);
    }
  }

  function startPasswordSetup() {
    setShowPasswordSetup(true);
    setSecurityNotice("");
    window.requestAnimationFrame(() => passwordInputRef.current?.focus());
  }

  async function revokeOtherSessions() {
    if (securitySubmitting) return;
    setSecurityNotice("");
    setSecurityError(false);
    setSecuritySubmitting(true);
    try {
      const response = await fetch("/api/account/sessions", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSecurityError(true);
        setSecurityNotice(payload.message || "Não foi possível encerrar as outras sessões.");
        return;
      }
      setSecurityNotice("As outras sessões foram encerradas. Este dispositivo continua conectado.");
    } catch {
      setSecurityError(true);
      setSecurityNotice("Não foi possível encerrar as outras sessões. Tente novamente.");
    } finally {
      setSecuritySubmitting(false);
    }
  }

  return (
    <section className="account-shell">
      <header className="account-heading">
        <div className="account-heading__copy">
          <p className="eyebrow">Minha conta</p>
          <h1>Olá, {firstName(customer?.name) || "cliente"}.</h1>
          <p>Acompanhe pedidos, pagamentos e dados de entrega em um só lugar.</p>
          <span className="account-heading__email"><small>Conta vinculada</small>{email}</span>
        </div>
        <div className="account-heading__actions">
          <Link className="button button-primary" href="/catalogo">Fazer novo pedido</Link>
          <button className="button button-secondary" type="button" onClick={logout}>{demo ? "Limpar testes" : "Sair da conta"}</button>
        </div>
      </header>

      {!demo && !hasPassword && (
        <section id="criar-senha" className={`account-password-banner${showPasswordSetup ? " is-open" : ""}`} aria-labelledby="password-banner-title">
          <div className="account-password-banner__copy">
            <p className="eyebrow">Primeiro acesso</p>
            <h2 id="password-banner-title">Entre mais rápido nas próximas vezes</h2>
            <p>Crie uma senha para acessar sua conta sem depender do código por e-mail. O acesso por código continuará disponível.</p>
          </div>
          {!showPasswordSetup ? (
            <button className="button button-primary" type="button" aria-expanded="false" aria-controls="password-setup-form" onClick={startPasswordSetup}>Criar minha senha</button>
          ) : (
            <form id="password-setup-form" className="account-password-banner__form" onSubmit={savePassword}>
              <label className="field">
                <span>Nova senha</span>
                <input ref={passwordInputRef} type="password" minLength="15" maxLength="128" autoComplete="new-password" required value={securityPassword} onChange={(event) => setSecurityPassword(event.target.value)} />
                <small>Use pelo menos 15 caracteres. Espaços e acentos são aceitos.</small>
              </label>
              <div className="account-password-banner__actions">
                <button className="button button-primary" type="submit" disabled={securitySubmitting}>{securitySubmitting ? "Salvando..." : "Salvar senha"}</button>
                <button className="button button-secondary" type="button" disabled={securitySubmitting} onClick={() => { setShowPasswordSetup(false); setSecurityPassword(""); setSecurityNotice(""); }}>Agora não</button>
              </div>
              {securityNotice && <p className={`account-alert${securityError ? " account-alert--error" : ""}`} role={securityError ? "alert" : "status"}>{securityNotice}</p>}
            </form>
          )}
        </section>
      )}

      {!demo && hasPassword && securityNotice && <p className={`account-alert${securityError ? " account-alert--error" : " account-alert--success"}`} role={securityError ? "alert" : "status"}>{securityNotice}</p>}

      <div className="account-layout">
        <nav className="account-nav" aria-label="Seções da conta">
          <p>Seções da conta</p>
          <a href="#visao-geral"><span>Visão geral</span><small>Resumo</small></a>
          <a href="#pedidos"><span>Pedidos</span><small>{orders.length}</small></a>
          <a href="#dados"><span>Meus dados</span><small>Cadastro</small></a>
          {!demo && <a href={hasPassword ? "#seguranca" : "#criar-senha"}><span>Segurança</span><small>{hasPassword ? "Senha" : "Configurar"}</small></a>}
          <a href="#ajuda"><span>Ajuda</span><small>Suporte</small></a>
        </nav>

        <div className="account-content">
          <section id="visao-geral" className="account-section" aria-labelledby="overview-title">
            <div className="account-section__heading">
              <div><p className="eyebrow">Visão geral</p><h2 id="overview-title">Resumo da conta</h2><p>Os números abaixo consideram todos os pedidos vinculados a este e-mail.</p></div>
            </div>
            <div className={`account-priority${attentionOrders.length ? " account-priority--attention" : ""}`}>
              <div>
                <p className="eyebrow">Próximo passo</p>
                <h3>{getPriorityTitle(attentionOrders, summary.progress, orders.length)}</h3>
                <p>{getPriorityDescription(attentionOrders, summary.progress, orders.length)}</p>
              </div>
              {attentionOrders.length > 0 ? (
                <button className="button button-primary" type="button" onClick={showPaymentOrders}>Revisar pagamento</button>
              ) : orders.length > 0 ? (
                <a className="button button-secondary" href="#pedidos">Ver pedidos</a>
              ) : (
                <Link className="button button-primary" href="/catalogo">Começar pedido</Link>
              )}
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
              <div><p className="eyebrow">Pedidos</p><h2 id="orders-title">Histórico e andamento</h2><p>Abra um pedido para consultar medidas, entrega, pagamento e valores.</p></div>
            </div>
            <div className="account-filters" aria-label="Filtrar pedidos">
              {FILTERS.map(([value, label]) => (
                <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)} aria-pressed={filter === value}>
                  <span>{label}</span><small>{orders.filter((order) => matchesFilter(order, value)).length}</small>
                </button>
              ))}
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
            <div className="account-section__heading"><div><p className="eyebrow">Cadastro</p><h2 id="data-title">Meus dados</h2><p>Informações recuperadas dos pedidos vinculados à conta.</p></div></div>
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

          {!demo && hasPassword && <section id="seguranca" className="account-section" aria-labelledby="security-title">
            <div className="account-section__heading"><div><p className="eyebrow">Segurança</p><h2 id="security-title">Acesso à conta</h2><p>Gerencie sua senha e as sessões abertas em outros dispositivos.</p></div></div>
            <form className="account-help" onSubmit={savePassword}>
              <div><h3>Alterar senha</h3><p>Use pelo menos 15 caracteres. Espaços e acentos são aceitos.</p><label className="field"><span>Nova senha</span><input type="password" minLength="15" maxLength="128" autoComplete="new-password" required value={securityPassword} onChange={(event) => setSecurityPassword(event.target.value)} /></label><button className="button button-primary" type="submit" disabled={securitySubmitting}>{securitySubmitting ? "Atualizando..." : "Atualizar senha"}</button></div>
              <div><h3>Outros dispositivos</h3><p>Encerre sessões abertas em outros navegadores.</p><button type="button" className="button button-secondary" disabled={securitySubmitting} onClick={revokeOtherSessions}>Sair dos outros dispositivos</button></div>
            </form>
          </section>}

          <section id="ajuda" className="account-section" aria-labelledby="help-title">
            <div className="account-section__heading"><div><p className="eyebrow">Suporte</p><h2 id="help-title">Ajuda e privacidade</h2><p>Escolha o canal de acordo com o assunto.</p></div></div>
            <div className="account-help">
              <div><small>Pedidos</small><h3>Ajuda com uma compra</h3><p>Inclua o número do pedido para agilizar a análise.</p><a href={`mailto:${brand.email}?subject=Ajuda com pedido Baseforma`}>Enviar e-mail</a></div>
              <div><small>Privacidade</small><h3>Seus dados pessoais</h3><p>Solicite acesso, correção ou exclusão de dados pelo canal oficial.</p><a href={`mailto:${brand.email}?subject=Privacidade e dados pessoais`}>{brand.email}</a></div>
              <div><small>Informações</small><h3>Dúvidas frequentes</h3><p>Consulte compatibilidade, preço, prazo, material e acabamento.</p><Link href="/faq">Abrir FAQ</Link></div>
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
  const clientStatus = getClientOrderStatusLabel(order);

  return (
    <details className={`account-order account-order--${statusTone(order)}`} id={`pedido-${order.id}`}>
      <summary>
        <span className="account-order__identity"><small>Pedido</small><strong>{order.orderNumber}</strong><span>{formatDate(order.createdAt)} · {formatItemCount(order)}</span></span>
        <span className="account-order__status"><small>Situação</small><strong>{clientStatus}</strong><span>Pagamento {getPaymentStatusLabel(order.paymentStatus).toLowerCase()}</span></span>
        <span className="account-order__total"><small>Total</small><strong>{formatCurrency(order.totalBrl)}</strong></span>
        <span className="account-order__toggle" aria-hidden="true" />
      </summary>
      <div className="account-order__detail">
        <section className="account-order__tracking" aria-labelledby={`tracking-${order.id}`}>
          <div className="account-order__block-heading"><div><p className="eyebrow">Acompanhamento</p><h3 id={`tracking-${order.id}`}>{clientStatus}</h3></div><small>Atualizado em {formatDate(order.updatedAt)}</small></div>
          <div className="order-progress" aria-label={`Andamento: ${clientStatus}`}>
            {buildSteps(order).map((step) => <span key={step.label} className={step.done ? "is-done" : ""}><i aria-hidden="true" />{step.label}</span>)}
          </div>
        </section>

        <div className="account-order__columns">
          <div className="account-order__main">
            <section className="account-order__block" aria-labelledby={`items-${order.id}`}>
              <div className="account-order__block-heading"><div><p className="eyebrow">Especificações</p><h3 id={`items-${order.id}`}>Itens do pedido</h3></div><small>{formatItemCount(order)}</small></div>
              {order.items.length > 0 ? <div className="order-items">{order.items.map((item) => (
                <article key={item.id}>
                  <div className="order-item__identity"><p>{item.categoryName}</p><h4>{item.formatName}</h4><code>{item.sku}</code></div>
                  <dl>{visibleItemValues(item.values).map(([key, value]) => <div key={key}><dt>{formatKey(key)}</dt><dd>{formatSpecValue(key, value)}</dd></div>)}<div><dt>Cor</dt><dd>{item.color || "Não informada"}</dd></div><div><dt>Quantidade</dt><dd>{item.quantity}</dd></div></dl>
                  <strong className="order-item__price">{formatCurrency(item.totalPriceBrl)}</strong>
                </article>
              ))}</div> : <p className="account-note">As especificações deste projeto especial são acompanhadas pelo atendimento.</p>}
            </section>
          </div>

          <aside className="account-order__sidebar" aria-label={`Resumo do pedido ${order.orderNumber}`}>
            {payable && <div className="account-order__payment-action"><p className="eyebrow">Ação necessária</p><h3>Pagamento pendente</h3><p>Conclua o pagamento para liberar as próximas etapas do pedido.</p><button className="button button-primary" type="button" onClick={() => onPay(order.id)}>Pagar agora</button></div>}

            <section className="account-order__block" aria-labelledby={`payment-${order.id}`}>
              <div className="account-order__block-heading"><h3 id={`payment-${order.id}`}>Pagamento</h3><span className={`account-status account-status--${statusTone(order)}`}>{getPaymentStatusLabel(order.paymentStatus)}</span></div>
              <dl className="account-order__facts">
                <div><dt>Situação</dt><dd>{getPaymentStatusLabel(order.paymentStatus)}</dd></div>
                <div><dt>Valor</dt><dd>{latestPayment ? formatCurrency(latestPayment.amountBrl) : formatCurrency(order.totalBrl)}</dd></div>
              </dl>
            </section>

            <section className="account-order__block" aria-labelledby={`delivery-${order.id}`}>
              <div className="account-order__block-heading"><h3 id={`delivery-${order.id}`}>Entrega</h3><span className="account-status">{order.fulfillment?.shipment?.label || "Aguardando"}</span></div>
              <p className="account-order__address">{formatAddress(order.shippingAddress) || "Endereço não registrado neste pedido."}</p>
              {(order.fulfillment?.shipment?.carrier || order.fulfillment?.shipment?.trackingCode) && <dl className="account-order__facts">{order.fulfillment.shipment.carrier && <div><dt>Transportadora</dt><dd>{order.fulfillment.shipment.carrier}</dd></div>}{order.fulfillment.shipment.trackingCode && <div><dt>Rastreio</dt><dd>{order.fulfillment.shipment.trackingCode}</dd></div>}</dl>}
            </section>

            {order.commerce && (
              <section className="account-order__block" aria-labelledby={`totals-${order.id}`}>
                <h3 id={`totals-${order.id}`}>Resumo de valores</h3>
                <dl className="checkout-totals account-order__totals">
                  <div><dt>Produtos</dt><dd>{formatCurrency(order.commerce.itemsSubtotalBrl)}</dd></div>
                  <div><dt>Desconto</dt><dd>{order.commerce.discount?.applied ? `-${formatCurrency(order.commerce.discount.amountBrl)}` : formatCurrency(0)}</dd></div>
                  <div><dt>Frete</dt><dd>{formatCurrency(order.commerce.shipping?.amountBrl || 0)}</dd></div>
                  <div className="checkout-totals__total"><dt>Total</dt><dd>{formatCurrency(order.commerce.totalBrl)}</dd></div>
                </dl>
              </section>
            )}

            <div className="account-order__actions">
              <a className="button button-secondary" href={`mailto:${brand.email}?subject=${encodeURIComponent(`Ajuda com pedido ${order.orderNumber}`)}`}>Pedir ajuda</a>
            </div>
          </aside>
        </div>
      </div>
    </details>
  );
}

function matchesFilter(order, filter) {
  if (filter === "finished") return isFinishedOrder(order);
  if (filter === "payment") return PAYMENT_ACTION_NEEDED.has(order.paymentStatus);
  if (filter === "paid") return PAID.has(order.paymentStatus);
  if (filter === "progress") return !isFinishedOrder(order);
  return true;
}

function statusTone(order) {
  if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.PAYMENT_FAILED) return "danger";
  if (PAID.has(order.paymentStatus)) return "success";
  return "warning";
}

function buildSteps(order) {
  const paid = PAID.has(order.paymentStatus) || order.paymentStatus === PAYMENT_STATUS.REFUNDED;
  const productionStatus = order.fulfillment?.production?.status || "";
  const shipmentStatus = order.fulfillment?.shipment?.status || "";
  const production = PRODUCTION_DONE.has(productionStatus) || SHIPMENT_DONE.has(shipmentStatus);
  return [
    { label: "Pedido recebido", done: true },
    { label: "Pagamento", done: paid },
    { label: "Produção", done: production },
    { label: "Expedição", done: SHIPMENT_DONE.has(shipmentStatus) || order.status === ORDER_STATUS.SHIPPED }
  ];
}

function isFinishedOrder(order) {
  return FINISHED.has(order.status) || SHIPMENT_DONE.has(order.fulfillment?.shipment?.status);
}

function getPriorityTitle(attentionOrders, progressCount, orderCount) {
  if (attentionOrders.length === 1) return `${attentionOrders[0].orderNumber} aguarda pagamento`;
  if (attentionOrders.length > 1) return `${attentionOrders.length} pedidos aguardam pagamento`;
  if (progressCount === 1) return "1 pedido está em andamento";
  if (progressCount > 1) return `${progressCount} pedidos estão em andamento`;
  if (orderCount > 0) return "Nenhuma ação pendente";
  return "Sua conta está pronta";
}

function getPriorityDescription(attentionOrders, progressCount, orderCount) {
  if (attentionOrders.length > 0) return "Revise a situação e conclua o pagamento para o pedido seguir para produção.";
  if (progressCount > 0) return "A produção e a entrega seguem o andamento indicado em cada pedido.";
  if (orderCount > 0) return "Seus pedidos anteriores continuam disponíveis para consulta e recompra.";
  return "Configure seu primeiro produto para iniciar um pedido.";
}

function formatItemCount(order) {
  if (!order.items.length) return "Projeto especial";
  return `${order.items.length} ${order.items.length === 1 ? "item" : "itens"}`;
}

function getClientOrderStatusLabel(order) {
  if (order.status === ORDER_STATUS.CANCELLED) return "Cancelado";
  if (PAYMENT_ACTION_NEEDED.has(order.paymentStatus)) return getOrderStatusLabel(order.status);

  const productionStatus = order.fulfillment?.production?.status || "";
  const shipmentStatus = order.fulfillment?.shipment?.status || "";

  if (shipmentStatus === "delivered") return "Concluído";
  if (["packing", "ready_for_pickup", "shipped"].includes(shipmentStatus)) return "Enviando";
  if (productionStatus === "blocked" || order.status === ORDER_STATUS.PAID_PENDING_REVIEW) return "Revisão técnica";
  if (productionStatus === "ready_to_ship") return "Produzido";

  return "Aguardando produção";
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
