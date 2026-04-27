"use client";

import { useState } from "react";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/order-status";

export function CartPage() {
  const { items, total, updateQuantity, removeItem } = useCart();

  return (
    <section className="cart-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Carrinho</p>
          <h1>Revise as configuracoes antes de fechar o pedido.</h1>
        </div>
        <Link className="button button-secondary" href="/">
          Adicionar outro item
        </Link>
      </div>

      {items.length === 0 ? (
        <article className="empty-cart">
          <h2>O carrinho esta vazio.</h2>
          <p>Configure uma ponteira ou sapata para gerar o resumo tecnico do pedido.</p>
          <Link className="button button-primary" href="/">
            Abrir catalogo
          </Link>
        </article>
      ) : (
        <div className="cart-grid">
          <div className="cart-list">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <div>
                  <p className="eyebrow">{item.categoryName}</p>
                  <h2>{item.formatName}</h2>
                  <span>{item.sku}</span>
                </div>
                <dl>
                  <div className="cart-info-block cart-info-block--measures">
                    <dt>Medidas</dt>
                    <dd>
                      {Object.entries(item.values).map(([key, value]) => (
                        <span key={key}>
                          <span>{formatKey(key)}</span>
                          <strong>{value} mm</strong>
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div className="cart-info-block">
                    <dt>Outras informacoes</dt>
                    <dd>
                      <span>
                        <span>Cor</span>
                        <strong>{item.color}</strong>
                      </span>
                    </dd>
                  </div>
                </dl>
                <div className="cart-item__footer">
                  <label className="field">
                    <span>Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.id, event.target.value)}
                    />
                  </label>
                  <button type="button" className="text-button" onClick={() => removeItem(item.id)}>
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="summary-panel cart-summary">
            <p className="eyebrow">Total estimado</p>
            <h2>{formatCurrency(total)}</h2>
            <p>Pedidos dentro da matriz seguem para pagamento. Fora dela, entram em revisao tecnica.</p>
            <CheckoutForm />
          </aside>
        </div>
      )}
    </section>
  );
}

function CheckoutForm() {
  const { items, clearCart } = useCart();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);
  const canSubmit = items.length > 0 && name.trim() && contact.trim();

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source: "configurator",
          customer: { name, contact },
          notes: "",
          items
        })
      });
      const orderPayload = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderPayload.message || "Nao foi possivel criar o pedido.");
      }

      const order = orderPayload.order;
      setCreatedOrder(order);
      window.sessionStorage.setItem("traco-base-last-order-id", order.id);

      if (order.status === ORDER_STATUS.NEEDS_TECHNICAL_REVIEW) {
        clearCart();
        window.location.assign(`/pedido-confirmado?orderId=${order.id}`);
        return;
      }

      const paymentResponse = await fetch("/api/payments/mercado-pago/preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderId: order.id })
      });
      const paymentPayload = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          paymentPayload.message ||
            "Pedido criado, mas o pagamento Mercado Pago ainda nao foi gerado."
        );
      }

      clearCart();
      window.location.assign(paymentPayload.checkoutUrl);
    } catch (caughtError) {
      setError(caughtError.message || "Nao foi possivel finalizar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nome</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Contato</span>
        <input
          value={contact}
          placeholder="WhatsApp ou email"
          onChange={(event) => setContact(event.target.value)}
        />
      </label>
      {createdOrder && (
        <div className="success-box">
          <strong>Pedido criado</strong>
          <span>{createdOrder.orderNumber}</span>
          <Link href={`/pedido-confirmado?orderId=${createdOrder.id}`}>Ver status do pedido</Link>
        </div>
      )}
      {error && (
        <div className="issue-box">
          <strong>Falha no checkout</strong>
          <span>{error}</span>
        </div>
      )}
      <button className="button button-primary button-block" type="submit" disabled={!canSubmit || submitting}>
        {submitting ? "Gerando pedido..." : "Finalizar e pagar"}
      </button>
    </form>
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
