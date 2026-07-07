"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { formatCurrency } from "@/lib/format";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

export function OrderConfirmation({ initialOrderId = "", initialPaymentResult = "" }) {
  const { clearCart } = useCart();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialOrderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialPaymentResult === "success") {
      clearCart();
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

    fetch(`/api/orders/${orderId}`)
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Pedido não encontrado.");
        }

        return payload.order;
      })
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
  }, [orderId]);

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
        <p>
          O pedido agora está salvo no sistema. O status abaixo reflete a validação tecnica e o
          retorno de pagamento recebido até o momento.
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
      </div>

      {order.technicalReviews?.length > 0 && (
        <article className="surface-card">
          <p className="eyebrow">Revisão técnica</p>
          <h2>Este pedido precisa de avaliação antes de produção.</h2>
          <pre className="brief-preview">{order.technicalReviews[0].notes}</pre>
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
        <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>
          Atualizar status
        </button>
        <Link className="button button-primary" href="/">
          Configurar novo pedido
        </Link>
        <Link className="button button-secondary" href="/conta">
          Ver minha conta
        </Link>
      </div>
    </section>
  );
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

