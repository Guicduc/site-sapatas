"use client";

import { useState } from "react";

import { buildWhatsAppUrl } from "@/lib/format";
import { brand } from "@/lib/site-data";

export function SpecialRequestBuilder() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [dimensions, setDimensions] = useState("");

  const message = [
    "Oi, quero solicitar um projeto especial para sapatas.",
    `Nome: ${name || "Nao informado"}`,
    `WhatsApp ou email: ${contact || "Nao informado"}`,
    `Projeto: ${dimensions || "Nao informado"}`
  ].join("\n");

  return (
    <div className="brief-grid">
      <div className="surface-card brief-form">
        <div className="field-row">
          <label className="field">
            <span>Nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="field">
            <span>WhatsApp ou email</span>
            <input
              value={contact}
              placeholder="WhatsApp ou email"
              onChange={(event) => setContact(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Descreva seu projeto</span>
          <textarea
            placeholder="Ex.: tubo 24 mm interno, base 28 mm, altura 14 mm, uso em mesa de jantar com pe metalico"
            value={dimensions}
            onChange={(event) => setDimensions(event.target.value)}
          />
        </label>
      </div>

      <aside className="surface-card brief-preview-card">
        <p className="eyebrow">WhatsApp</p>
        <h2>Enviar para o comercial</h2>
        <p>
          O objetivo aqui e reduzir ida e volta improdutiva e capturar o pedido especial com
          densidade suficiente para avaliacao tecnica.
        </p>
        <a
          className="button button-primary button-block whatsapp-button"
          href={buildWhatsAppUrl(brand.whatsappNumber, message)}
          rel="noreferrer"
          target="_blank"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12.04 2C6.58 2 2.14 6.34 2.14 11.68c0 1.7.46 3.36 1.33 4.82L2 22l5.66-1.43a10.1 10.1 0 0 0 4.38.99c5.46 0 9.9-4.34 9.9-9.68S17.5 2 12.04 2Zm0 17.9c-1.4 0-2.76-.37-3.96-1.06l-.28-.16-3.34.84.87-3.2-.18-.3a8 8 0 0 1-1.3-4.34c0-4.42 3.67-8.02 8.19-8.02 4.51 0 8.18 3.6 8.18 8.02 0 4.43-3.67 8.02-8.18 8.02Zm4.5-6.01c-.25-.12-1.46-.7-1.68-.78-.23-.08-.4-.12-.56.12-.16.23-.64.78-.78.94-.14.16-.29.18-.54.06-.25-.12-1.05-.38-2-1.22-.74-.64-1.24-1.44-1.39-1.68-.14-.23-.01-.36.11-.48.12-.11.25-.29.37-.43.12-.14.16-.23.25-.39.08-.16.04-.29-.02-.41-.06-.12-.56-1.32-.76-1.8-.2-.47-.4-.4-.56-.41h-.48c-.16 0-.41.06-.62.29-.21.23-.82.78-.82 1.9 0 1.12.84 2.2.95 2.35.12.16 1.65 2.47 4 3.46.56.23 1 .37 1.34.47.56.17 1.07.15 1.47.09.45-.07 1.46-.58 1.66-1.14.21-.56.21-1.03.15-1.14-.06-.1-.22-.16-.47-.28Z" />
          </svg>
          Enviar no WhatsApp
        </a>
      </aside>
    </div>
  );
}
