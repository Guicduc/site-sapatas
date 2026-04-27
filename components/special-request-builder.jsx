"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { buildWhatsAppUrl } from "@/lib/format";
import { brand } from "@/lib/site-data";

export function SpecialRequestBuilder({ families }) {
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [family, setFamily] = useState("");
  const [application, setApplication] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [quantity, setQuantity] = useState("");
  const [color, setColor] = useState("");
  const [finish, setFinish] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    const incoming = params.get("family") || params.get("familia") || "";

    if (incoming && families.some((item) => item.slug === incoming)) {
      setFamily(incoming);
    }
  }, [families, params]);

  const selectedFamilyName =
    families.find((item) => item.slug === family)?.name || "Projeto especial";
  const canSubmit = name.trim() && contact.trim();

  const message = [
    "Oi, quero solicitar um projeto especial para sapatas.",
    `Nome: ${name || "Nao informado"}`,
    `Contato: ${contact || "Nao informado"}`,
    `Familia de referencia: ${selectedFamilyName}`,
    `Aplicacao: ${application || "Nao informada"}`,
    `Medidas desejadas: ${dimensions || "Nao informadas"}`,
    `Quantidade estimada: ${quantity || "Nao informada"}`,
    `Cor desejada: ${color || "Nao informada"}`,
    `Acabamento: ${finish || "Nao informado"}`,
    `Observacoes: ${notes || "Nao informadas"}`
  ].join("\n");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source: "special_request",
          customer: { name, contact },
          specialRequest: {
            family,
            familyName: selectedFamilyName,
            application,
            dimensions,
            quantity,
            color,
            finish,
            notes
          }
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Nao foi possivel salvar o briefing.");
      }

      setCreatedOrder(payload.order);
      window.sessionStorage.setItem("traco-base-last-order-id", payload.order.id);
    } catch (caughtError) {
      setError(caughtError.message || "Nao foi possivel salvar o briefing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="brief-grid">
      <form className="surface-card brief-form" onSubmit={handleSubmit}>
        <div className="field-row">
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
        </div>

        <label className="field">
          <span>Familia de referencia</span>
          <select value={family} onChange={(event) => setFamily(event.target.value)}>
            <option value="">Selecione uma familia</option>
            {families.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Aplicacao do movel</span>
          <input
            type="text"
            placeholder="Ex.: mesa de jantar com pe metalico"
            value={application}
            onChange={(event) => setApplication(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Medidas desejadas</span>
          <textarea
            placeholder="Ex.: tubo 24 mm interno, base 28 mm, altura 14 mm"
            value={dimensions}
            onChange={(event) => setDimensions(event.target.value)}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Quantidade estimada</span>
            <input
              type="number"
              min="1"
              placeholder="Ex.: 32"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Cor desejada</span>
            <input
              type="text"
              placeholder="Ex.: areia quente"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Acabamento e restricoes</span>
          <input
            type="text"
            placeholder="Ex.: fosco tecnico, evitar leitura industrial"
            value={finish}
            onChange={(event) => setFinish(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Observacoes adicionais</span>
          <textarea
            placeholder="Conte contexto, referencias visuais ou requisitos de prazo."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {createdOrder && (
          <div className="success-box">
            <strong>Briefing salvo</strong>
            <span>{createdOrder.orderNumber}</span>
            <Link href={`/pedido-confirmado?orderId=${createdOrder.id}`}>Ver status da revisao</Link>
          </div>
        )}
        {error && (
          <div className="issue-box">
            <strong>Falha ao salvar</strong>
            <span>{error}</span>
          </div>
        )}

        <button className="button button-dark button-block" type="submit" disabled={!canSubmit || submitting}>
          {submitting ? "Salvando briefing..." : "Salvar briefing tecnico"}
        </button>
      </form>

      <aside className="surface-card brief-preview-card">
        <p className="eyebrow">Resumo do briefing</p>
        <h2>Mensagem pronta para o comercial</h2>
        <p>
          O objetivo aqui e reduzir ida e volta improdutiva e capturar o pedido especial com
          densidade suficiente para avaliacao tecnica.
        </p>
        <pre className="brief-preview">{message}</pre>
        <a
          className="button button-primary button-block"
          href={buildWhatsAppUrl(brand.whatsappNumber, message)}
          rel="noreferrer"
          target="_blank"
        >
          Enviar no WhatsApp
        </a>
      </aside>
    </div>
  );
}

