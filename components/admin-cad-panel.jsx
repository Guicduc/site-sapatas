"use client";

import { useMemo, useState } from "react";

export function AdminCadPanel({ order, payload, action, token = "" }) {
  const [copied, setCopied] = useState(false);
  const payloadText = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const suggestedFileName = payload.items?.[0]?.outputs?.stlFileName || "";

  async function copyPayload() {
    await navigator.clipboard.writeText(payloadText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <details open>
      <summary>Rhino / Grasshopper</summary>
      <div className="cad-panel">
        <div className="cad-panel__header">
          <div>
            <p className="eyebrow">Payload CAD</p>
            <h3>{order.cad?.status || "sem cad"}</h3>
          </div>
          <button className="button button-secondary" type="button" onClick={copyPayload}>
            {copied ? "Copiado" : "Copiar JSON"}
          </button>
        </div>

        <pre className="brief-preview">{payloadText}</pre>

        <div className="cad-checklist">
          <span>1. Copiar JSON para o fluxo Rhino/Grasshopper local.</span>
          <span>2. Conferir inputs, gerar malha e exportar STL.</span>
          <span>3. Salvar com o nome sugerido e registrar abaixo.</span>
        </div>

        <form className="cad-form" action={action}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="token" value={token} />
          <label className="field">
            <span>Arquivo STL gerado</span>
            <input
              name="cadFileName"
              defaultValue={order.cad?.fileName || suggestedFileName}
              placeholder="ORDER-BF-260504-AB12-BF-RD-PI-22X28X18.stl"
              required
            />
          </label>
          <label className="field">
            <span>Versao do modelo</span>
            <input
              name="cadModelVersion"
              defaultValue={order.cad?.modelVersion || payload.items?.[0]?.modelVersion || ""}
              required
            />
          </label>
          <button className="button button-primary" type="submit">
            Registrar STL e liberar impressao
          </button>
        </form>
      </div>
    </details>
  );
}
