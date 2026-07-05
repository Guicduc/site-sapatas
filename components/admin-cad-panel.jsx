"use client";

export function AdminCadPanel({ order, payload, action, token = "" }) {
  const suggestedFileName = payload.items?.[0]?.outputs?.stlFileName || "";

  return (
    <section className="cad-panel">
      <div className="cad-panel__header">
        <div>
          <p className="eyebrow">CAD</p>
          <h3>Rhino / Grasshopper</h3>
          <small>Status: {order.cad?.status || "sem cad"}</small>
        </div>
      </div>

      <div className="cad-checklist">
        <span>1. Copie o JSON na secao "Dados para Grasshopper" e use no fluxo Rhino/Grasshopper local.</span>
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
