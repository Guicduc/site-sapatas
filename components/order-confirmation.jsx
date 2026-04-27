"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/order-status";

export function OrderConfirmation({ initialOrderId = "" }) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialOrderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (orderId) {
      return;
    }

    const savedId = window.sessionStorage.getItem("traco-base-last-order-id");

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
          throw new Error(payload.message || "Pedido nao encontrado.");
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
          setError(caughtError.message || "Nao foi possivel carregar o pedido.");
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
          Abrir catalogo
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
          O pedido agora esta salvo no sistema. O status abaixo reflete a validacao tecnica e o
          retorno de pagamento recebido ate o momento.
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
          <p className="eyebrow">Revisao tecnica</p>
          <h2>Este pedido precisa de avaliacao antes de producao.</h2>
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

      <div className="action-row">
        <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>
          Atualizar status
        </button>
        <Link className="button button-primary" href="/">
          Configurar novo pedido
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
    .replace("Insercao", "insercao")
    .replace("Apoio", "apoio")
    .replace("Aparente", "aparente");
}

