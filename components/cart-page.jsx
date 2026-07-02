"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { calculateCommerceAdjustments, normalizeCouponCode } from "@/lib/commerce-adjustments";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/order-status";

const recoveryStorageKey = "baseforma-cart-recovery";

export function CartPage() {
  const { items, total, updateQuantity, removeItem } = useCart();

  return (
    <section className="cart-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">Carrinho</p>
          <h1>Revise as configurações antes de fechar o pedido.</h1>
        </div>
        <Link className="button button-secondary" href="/">
          Adicionar outro item
        </Link>
      </div>

      {items.length === 0 ? (
        <article className="empty-cart">
          <div>
            <p className="eyebrow">Carrinho vazio</p>
            <h2>O carrinho está vazio.</h2>
            <p>Configure uma ponteira ou sapata para gerar o resumo técnico do pedido.</p>
          </div>
          <Link className="button button-primary" href="/">
            Abrir catálogo
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
            <p>Pedidos dentro da matriz seguem para pagamento. Fora dela, entram em revisão técnica.</p>
            <CheckoutForm />
          </aside>
        </div>
      )}
    </section>
  );
}

function CheckoutForm() {
  const { items, clearCart, loaded } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [address, setAddress] = useState({
    postalCode: "", street: "", number: "", complement: "", district: "", city: "", state: ""
  });
  const lastPostalCodeLookupRef = useRef("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);
  const [recoveryState, setRecoveryState] = useState({ status: "idle", lastSavedAt: "" });
  const [postalCodeLookupState, setPostalCodeLookupState] = useState({
    status: "idle",
    message: ""
  });
  const [shippingQuoteState, setShippingQuoteState] = useState({
    status: "idle",
    quote: null,
    commerce: null
  });
  const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.priceBrl || item.totalPriceBrl || 0), 0);
  const localCommerce = calculateCommerceAdjustments({
    itemsSubtotalBrl: itemsSubtotal,
    shippingAddress: address,
    couponCode
  });
  const commerce = shippingQuoteState.commerce || localCommerce;
  const couponReady = !couponCode || commerce.discount.applied;
  const canSubmit = items.length > 0 && name.trim() && email.trim() && contact.trim()
    && address.postalCode.trim() && address.street.trim() && address.number.trim()
    && address.city.trim() && address.state.trim().length === 2
    && couponReady;
  const recoverySnapshotKey = JSON.stringify({
    items,
    name,
    email,
    contact,
    address,
    couponCode,
    commerceTotalBrl: commerce.totalBrl
  });
  const quoteSnapshotKey = JSON.stringify({
    items,
    postalCode: address.postalCode,
    state: address.state,
    couponCode
  });

  useEffect(() => {
    const postalCode = String(address.postalCode || "").replace(/\D/g, "");

    if (postalCode.length < 8) {
      lastPostalCodeLookupRef.current = "";
      setPostalCodeLookupState({ status: "idle", message: "" });
      return undefined;
    }

    if (lastPostalCodeLookupRef.current === postalCode) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setPostalCodeLookupState({ status: "loading", message: "Consultando CEP..." });
        const response = await fetch(`/api/postal-code/${postalCode}`);
        const payload = await response.json();

        if (response.status === 404) {
          lastPostalCodeLookupRef.current = postalCode;
          if (!cancelled) {
            setPostalCodeLookupState({
              status: "not_found",
              message: "CEP nao encontrado. Preencha o endereco manualmente."
            });
          }
          return;
        }

        if (!response.ok) {
          throw new Error(payload.message || "Nao foi possivel consultar o CEP.");
        }

        if (!cancelled && payload.address) {
          const lookupAddress = payload.address;
          lastPostalCodeLookupRef.current = lookupAddress.postalCodeDigits || postalCode;
          setAddress((current) => ({
            ...current,
            postalCode: lookupAddress.postalCode || current.postalCode,
            street: lookupAddress.street || current.street,
            district: lookupAddress.district || current.district,
            city: lookupAddress.city || current.city,
            state: lookupAddress.state || current.state
          }));
          setPostalCodeLookupState({
            status: "found",
            message: lookupAddress.city && lookupAddress.state
              ? `Endereco localizado em ${lookupAddress.city}/${lookupAddress.state}.`
              : "Endereco localizado pelo CEP."
          });
        }
      } catch {
        if (!cancelled) {
          setPostalCodeLookupState({
            status: "error",
            message: "Nao foi possivel consultar o CEP agora. Preencha o endereco manualmente."
          });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address.postalCode]);

  useEffect(() => {
    const postalCode = String(address.postalCode || "").replace(/\D/g, "");
    if (!loaded || !items.length || postalCode.length < 8) {
      setShippingQuoteState({ status: "idle", quote: null, commerce: null });
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setShippingQuoteState((current) => ({ ...current, status: "loading" }));
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            items,
            shippingAddress: address,
            couponCode: normalizeCouponCode(couponCode)
          })
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Nao foi possivel cotar o frete.");
        }

        if (!cancelled) {
          setShippingQuoteState({
            status: "quoted",
            quote: payload.shippingQuote || null,
            commerce: payload.commerce || null
          });
        }
      } catch {
        if (!cancelled) {
          setShippingQuoteState({ status: "idle", quote: null, commerce: null });
        }
      }
    }, 550);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loaded, quoteSnapshotKey]);

  useEffect(() => {
    if (!loaded || createdOrder || !canSaveRecoveryLead({ items, email, contact })) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setRecoveryState((current) => ({ ...current, status: "saving" }));
        const recovery = await persistCartRecoveryLead({
          status: "active",
          name,
          email,
          contact,
          address,
          couponCode,
          items
        });

        if (!cancelled) {
          setRecoveryState({ status: "saved", lastSavedAt: recovery.updatedAt || "" });
        }
      } catch {
        if (!cancelled) {
          setRecoveryState((current) => ({ ...current, status: "idle" }));
        }
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loaded, recoverySnapshotKey, createdOrder]);

  function updateAddress(key, value) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  function updatePostalCode(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    updateAddress("postalCode", formatted);
  }

  async function markRecoveryLeadConverted(orderId) {
    if (!canSaveRecoveryLead({ items, email, contact })) {
      return;
    }

    try {
      await persistCartRecoveryLead({
        status: "converted",
        orderId,
        name,
        email,
        contact,
        address,
        couponCode,
        items
      });
      window.localStorage.removeItem(recoveryStorageKey);
    } catch {
      // Recuperacao de carrinho nao deve bloquear checkout ou pagamento.
    }
  }

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
          customer: { name, email, contact },
          shippingAddress: address,
          couponCode: normalizeCouponCode(couponCode),
          notes: "",
          items
        })
      });
      const orderPayload = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderPayload.message || "Não foi possível criar o pedido.");
      }

      const order = orderPayload.order;
      setCreatedOrder(order);
      window.sessionStorage.setItem("baseforma-last-order-id", order.id);
      await markRecoveryLeadConverted(order.id);

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
            "Pedido criado, mas o pagamento Mercado Pago ainda não foi gerado."
        );
      }

      clearCart();
      window.location.assign(paymentPayload.checkoutUrl);
    } catch (caughtError) {
      setError(caughtError.message || "Não foi possível finalizar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <div className="checkout-contact-grid">
        <label className="field">
          <span>Nome</span>
          <input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          <span>WhatsApp</span>
          <input
            type="tel"
            autoComplete="tel"
            required
            value={contact}
            placeholder="(11) 99999-0000"
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
      </div>
      <fieldset className="checkout-address">
        <legend>Endereço de entrega</legend>
        <div className="field-row">
          <label className="field checkout-field--postal"><span>CEP</span><input inputMode="numeric" autoComplete="postal-code" required value={address.postalCode} placeholder="01001-000" onChange={(event) => updatePostalCode(event.target.value)} /></label>
          <label className="field checkout-field--state"><span>UF</span><input maxLength="2" autoComplete="address-level1" required value={address.state} onChange={(event) => updateAddress("state", event.target.value.toUpperCase())} /></label>
        </div>
        {postalCodeLookupState.status !== "idle" && (
          <p
            className={`checkout-note${postalCodeLookupState.status === "not_found" || postalCodeLookupState.status === "error" ? " checkout-note--warning" : ""}`}
            aria-live="polite"
          >
            {postalCodeLookupState.message}
          </p>
        )}
        <label className="field checkout-field--street"><span>Rua ou avenida</span><input autoComplete="address-line1" required value={address.street} onChange={(event) => updateAddress("street", event.target.value)} /></label>
        <div className="field-row">
          <label className="field checkout-field--number"><span>Número</span><input autoComplete="address-line2" required value={address.number} onChange={(event) => updateAddress("number", event.target.value)} /></label>
          <label className="field checkout-field--complement"><span>Complemento</span><input value={address.complement} onChange={(event) => updateAddress("complement", event.target.value)} /></label>
        </div>
        <div className="field-row">
          <label className="field checkout-field--district"><span>Bairro</span><input autoComplete="address-level3" value={address.district} onChange={(event) => updateAddress("district", event.target.value)} /></label>
          <label className="field checkout-field--city"><span>Cidade</span><input autoComplete="address-level2" required value={address.city} onChange={(event) => updateAddress("city", event.target.value)} /></label>
        </div>
      </fieldset>
      <label className="field">
        <span>Cupom</span>
        <input
          autoComplete="off"
          value={couponCode}
          placeholder="TRACO10"
          onChange={(event) => setCouponCode(normalizeCouponCode(event.target.value))}
        />
      </label>
      <dl className="checkout-totals" aria-label="Resumo de valores">
        <div>
          <dt>Produtos</dt>
          <dd>{formatCurrency(commerce.itemsSubtotalBrl)}</dd>
        </div>
        <div>
          <dt>Desconto</dt>
          <dd>{commerce.discount.applied ? `-${formatCurrency(commerce.discount.amountBrl)}` : formatCurrency(0)}</dd>
        </div>
        <div>
          <dt>Frete</dt>
          <dd>
            {shippingQuoteState.status === "loading"
              ? "Calculando..."
              : commerce.shipping.status === "pending_address"
                ? "Informe o CEP"
                : formatCurrency(commerce.shipping.amountBrl)}
          </dd>
        </div>
        <div className="checkout-totals__total">
          <dt>Total</dt>
          <dd>{formatCurrency(commerce.totalBrl)}</dd>
        </div>
      </dl>
      {(couponCode || commerce.shipping.message) && (
        <p className={`checkout-note${commerce.discount.status === "invalid" || commerce.discount.status === "not_eligible" ? " checkout-note--warning" : ""}`}>
          {couponCode ? commerce.discount.message : commerce.shipping.message}
        </p>
      )}
      {shippingQuoteState.status === "loading" && (
        <p className="checkout-note">
          Consultando frete para o CEP informado.
        </p>
      )}
      {recoveryState.status === "saved" && !createdOrder && (
        <p className="checkout-note">
          Carrinho salvo para retomada pelo atendimento. Nenhuma mensagem automatica sera enviada.
        </p>
      )}
      {createdOrder && (
        <div className="success-box" role="status">
          <strong>Pedido criado</strong>
          <span>{createdOrder.orderNumber}</span>
          <Link href={`/pedido-confirmado?orderId=${createdOrder.id}`}>Ver status do pedido</Link>
        </div>
      )}
      {error && (
        <div className="issue-box" role="alert">
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
    .replace("Inserção", "inserção")
    .replace("Apoio", "apoio")
    .replace("Aparente", "aparente");
}

function canSaveRecoveryLead({ items, email, contact }) {
  return items.length > 0 && isValidEmail(email) && String(contact || "").replace(/\D/g, "").length >= 8;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function persistCartRecoveryLead({ status, orderId, name, email, contact, address, couponCode, items }) {
  const savedRecovery = readSavedRecoveryLead();
  const response = await fetch("/api/cart-recovery", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      recoveryId: savedRecovery?.id,
      recoveryToken: savedRecovery?.token,
      status,
      orderId,
      source: "checkout",
      customer: { name, email, contact },
      shippingAddress: address,
      couponCode: normalizeCouponCode(couponCode),
      items
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Nao foi possivel salvar o carrinho.");
  }

  if (payload.recovery?.id && payload.recovery?.token) {
    window.localStorage.setItem(
      recoveryStorageKey,
      JSON.stringify({ id: payload.recovery.id, token: payload.recovery.token })
    );
  }

  return payload.recovery;
}

function readSavedRecoveryLead() {
  try {
    const saved = window.localStorage.getItem(recoveryStorageKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
