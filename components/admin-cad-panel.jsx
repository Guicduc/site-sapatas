"use client";

import { useMemo, useState } from "react";

export function AdminCadPanel({ order, payload, action, token = "" }) {
  const [copied, setCopied] = useState(false);
  const payloadText = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const cadInputs = useMemo(() => buildCadInputs(payload), [payload]);
  const suggestedFileName = payload.items?.[0]?.outputs?.stlFileName || "";

  async function copyPayload() {
    await navigator.clipboard.writeText(payloadText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="cad-panel">
      <div className="cad-panel__header">
        <div>
          <p className="eyebrow">CAD</p>
          <h3>Rhino / Grasshopper</h3>
          <small>Status: {order.cad?.status || "sem cad"}</small>
        </div>
        <button className="button button-secondary" type="button" onClick={copyPayload}>
          {copied ? "Copiado" : "Copiar JSON"}
        </button>
      </div>

      {cadInputs.length > 0 && (
        <div className="cad-inputs">
          <h4>Inputs para impressao 3D</h4>
          {cadInputs.map((item) => (
            <section className="cad-input-card" key={item.id}>
              <div className="cad-input-card__header">
                <strong>{item.productName}</strong>
                <span>{item.quantity} un.</span>
              </div>
              <dl className="cad-input-grid">
                <div>
                  <dt>SKU</dt>
                  <dd>{item.sku}</dd>
                </div>
                <div>
                  <dt>Modelo</dt>
                  <dd>{item.modelVersion}</dd>
                </div>
                {item.parameters.map((parameter) => (
                  <div key={parameter.key}>
                    <dt>{parameter.label}</dt>
                    <dd>{parameter.value}</dd>
                  </div>
                ))}
              </dl>
              <small>Arquivo sugerido: {item.stlFileName || "N/A"}</small>
            </section>
          ))}
        </div>
      )}

      <details className="admin-order-section cad-payload">
        <summary>JSON tecnico completo</summary>
        <pre className="brief-preview">{payloadText}</pre>
      </details>

      <div className="cad-checklist">
        <span>1. Use os inputs acima no fluxo Rhino/Grasshopper local.</span>
        <span>2. Gere a malha, confira encaixe e exporte o STL.</span>
        <span>3. Registre o arquivo gerado abaixo para liberar a impressao.</span>
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
    </section>
  );
}

function buildCadInputs(payload) {
  return (payload.items || []).map((item) => ({
    id: item.itemId || item.sku,
    productName: formatCadProductName(item),
    sku: item.sku || "N/A",
    quantity: item.quantity || 0,
    modelVersion: item.modelVersion || "N/A",
    stlFileName: item.outputs?.stlFileName || "",
    parameters: Object.entries(item.parameters || {}).map(([key, value]) => ({
      key,
      label: formatParameterLabel(key),
      value: formatParameterValue(value)
    }))
  }));
}

function formatCadProductName(item) {
  const productNames = {
    "ponteira-interna-tubo:redondo": "Sapata interna tubo redondo",
    "ponteira-interna-tubo:quadrado": "Sapata interna tubo quadrado",
    "ponteira-interna-tubo:retangular": "Sapata interna tubo retangular",
    "ponteira-interna-tubo:oblongo": "Sapata interna tubo oblongo",
    "sapata-base-lisa:redonda": "Sapata lisa redonda",
    "sapata-base-lisa:quadrada": "Sapata lisa quadrada",
    "sapata-base-lisa:oblonga": "Sapata lisa oblonga",
    "sapata-base-lisa:retangular": "Sapata lisa retangular"
  };

  return productNames[`${item.categorySlug}:${item.formatSlug}`] || item.sku || "Produto CAD";
}

const PARAMETER_LABELS = {
  altura: "Altura",
  alturaApoio: "Altura de apoio",
  alturaBase: "Altura da base",
  alturaInterna: "Altura interna",
  comprimento: "Comprimento",
  diametro: "Diametro",
  diametroBase: "Diametro da base",
  diametroInterno: "Diametro interno",
  distanciaFuros: "Distancia entre furos",
  largura: "Largura",
  larguraInterna: "Largura interna",
  parede: "Parede",
  profundidadeInsercao: "Profundidade de insercao",
  raioCanto: "Raio do canto"
};

function formatParameterLabel(key) {
  return PARAMETER_LABELS[key] || String(key).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function formatParameterValue(value) {
  if (typeof value === "boolean") return value ? "sim" : "nao";
  if (value === null || value === undefined || value === "") return "N/A";

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `${value} mm`;

  return String(value);
}
