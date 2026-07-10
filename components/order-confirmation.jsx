"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { formatCurrency } from "@/lib/format";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";
import { readDemoOrders } from "@/components/demo-account";

export function OrderConfirmation({ initialOrderId = "", initialPaymentResult = "" }) {
  const { clearCart } = useCart();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialOrderId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialPaymentResult === "success") {
      clearCart();
      clearStoredPendingCheckout();
    }
  }, [clearCart, initialPaymentResult]);

  useEffect(() => {
    if (orderId) {
      return;
    }

    const savedId = window.sessionStorage.getItem("baseforma-last-order-id");

    if (savedId) {
      setOrderId(savedId);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    // No retorno do checkout o webhook pode ainda não ter chegado: reconcilia
    // direto com o Mercado Pago antes de exibir o status ao cliente.
    const shouldReconcile = initialPaymentResult === "success" || initialPaymentResult === "pending";

    (async () => {
      const demoOrder = readDemoOrders().find((item) => item.id === orderId);
      if (demoOrder) return demoOrder;
      const reconciledOrder = shouldReconcile ? await reconcilePayment(orderId) : null;
      return reconciledOrder || fetchOrderById(orderId);
    })()
      .then((nextOrder) => {
        if (!cancelled) {
          setOrder(nextOrder);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError.message || "Não foi possível carregar o pedido.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, initialPaymentResult]);

  async function handleRefreshStatus() {
    if (!orderId || refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      const nextOrder = (await reconcilePayment(orderId)) || (await fetchOrderById(orderId));
      setOrder(nextOrder);
    } catch (caughtError) {
      setError(caughtError.message || "Não foi possível atualizar o status do pedido.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <section className="empty-cart">
        <p className="eyebrow">Pedido</p>
        <h1>Carregando status do pedido.</h1>
      </section>
    );
  }

  if (!order || error) {
    return (
      <section className="empty-cart">
        <p className="eyebrow">Pedido</p>
        <h1>{error || "Nenhum pedido recente encontrado."}</h1>
        <Link className="button button-primary" href="/">
          Abrir catálogo
        </Link>
      </section>
    );
  }

  return (
    <section className="confirmation-shell">
      <div className="confirmation-card">
        <p className="eyebrow">Pedido recebido</p>
        <h1>{order.orderNumber}</h1>
        {order.demo && (
          <p className="payment-notice payment-notice--pending" role="status">
            Simulação concluída: este pedido não foi cobrado, gravado ou enviado à produção.
          </p>
        )}
        {initialPaymentResult === "pending" && (
          <p className="payment-notice payment-notice--pending" role="status">
            Seu pagamento ainda está sendo processado. Assim que for confirmado (por exemplo, após a
            compensação do Pix ou boleto), o status abaixo será atualizado. Não é necessário refazer o
            pedido.
          </p>
        )}
        <p>
          Este é o resumo do pedido registrado na Baseforma. Para acompanhar produção, pagamento
          e envio, acesse sua conta.
        </p>
        <div className="summary-stats">
          <article>
            <strong>Cliente</strong>
            <span>{order.customer.name}</span>
          </article>
          <article>
            <strong>Contato</strong>
            <span>{order.customer.contact}</span>
          </article>
          <article>
            <strong>Status</strong>
            <span>{getOrderStatusLabel(order.status)}</span>
          </article>
          <article>
            <strong>Pagamento</strong>
            <span>{getPaymentStatusLabel(order.paymentStatus)}</span>
          </article>
          <article>
            <strong>Itens</strong>
            <span>{order.items.length || "Projeto especial"}</span>
          </article>
          <article>
            <strong>Total</strong>
            <span>{formatCurrency(order.totalBrl)}</span>
          </article>
        </div>
        {["pending", "unknown"].includes(order.paymentStatus) && (
          <div className="action-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleRefreshStatus}
              disabled={refreshing}
            >
              {refreshing ? "Consultando pagamento..." : "Atualizar status"}
            </button>
          </div>
        )}
      </div>

      {order.technicalReviews?.length > 0 && (
        <article className="surface-card">
          <p className="eyebrow">Revisão técnica</p>
          <h2>Este pedido precisa de conferência antes de produção.</h2>
          <p>Nossa equipe vai revisar as medidas e entrar em contato se precisar de algum ajuste.</p>
        </article>
      )}

      {order.items.length > 0 && (
        <div className="cart-list">
          {order.items.map((item) => (
            <article className="cart-item" key={item.id}>
              <p className="eyebrow">{item.categoryName}</p>
              <h2>{item.formatName}</h2>
              <p>{item.sku}</p>
              <dl>
                {Object.entries(item.values || {}).map(([key, value]) => (
                  <div key={key}>
                    <dt>{formatKey(key)}</dt>
                    <dd>{value} mm</dd>
                  </div>
                ))}
                <div>
                  <dt>Cor</dt>
                  <dd>{item.color}</dd>
                </div>
                <div>
                  <dt>Acabamento</dt>
                  <dd>{item.finish}</dd>
                </div>
              </dl>
              <strong>{formatCurrency(item.totalPriceBrl)}</strong>
            </article>
          ))}
        </div>
      )}

      {order.commerce && (
        <article className="surface-card order-commerce">
          <p className="eyebrow">Valores</p>
          <h2>Resumo comercial</h2>
          <dl className="checkout-totals">
            <div>
              <dt>Produtos</dt>
              <dd>{formatCurrency(order.commerce.itemsSubtotalBrl)}</dd>
            </div>
            <div>
              <dt>Desconto</dt>
              <dd>{order.commerce.discount?.applied ? `-${formatCurrency(order.commerce.discount.amountBrl)}` : formatCurrency(0)}</dd>
            </div>
            <div>
              <dt>Frete</dt>
              <dd>{formatCurrency(order.commerce.shipping?.amountBrl || 0)}</dd>
            </div>
            <div className="checkout-totals__total">
              <dt>Total</dt>
              <dd>{formatCurrency(order.commerce.totalBrl)}</dd>
            </div>
          </dl>
        </article>
      )}

      <div className="action-row">
        <Link className="button button-primary" href="/conta">
          Ver minha conta
        </Link>
        <Link className="button button-secondary" href="/">
          Fazer novo pedido
        </Link>
      </div>
    </section>
  );
}

async function fetchOrderById(orderId) {
  const response = await fetch(`/api/orders/${orderId}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Pedido não encontrado.");
  }

  return payload.order;
}

// Consulta o status real do pagamento no Mercado Pago e devolve o pedido já
// atualizado. Falhas aqui não podem esconder o pedido do cliente: retorna null
// e o chamador cai no fetch normal.
async function reconcilePayment(orderId) {
  try {
    const response = await fetch("/api/payments/mercado-pago/reconcile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ orderId })
    });
    const payload = await response.json();

    if (response.ok && payload.order) {
      return payload.order;
    }
  } catch {
    // Sem rede ou sem token MP: segue com o status registrado localmente.
  }

  return null;
}

function clearStoredPendingCheckout() {
  try {
    window.localStorage.removeItem("baseforma-pending-checkout");
    window.sessionStorage.removeItem("baseforma-pending-checkout");
  } catch {
    // Storage indisponível não deve quebrar a confirmação.
  }
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .replace("Interno", "interno")
    .replace("Inserção", "inserção")
    .replace("Apoio", "apoio")
    .replace("Aparente", "aparente");
}

