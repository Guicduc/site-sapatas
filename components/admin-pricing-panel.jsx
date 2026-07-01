import { CAD_STATUS } from "@/lib/cad-contract";
import { formatCurrency } from "@/lib/format";

export function AdminPricingPanel({ order, action, token = "" }) {
  const pricing = order.metadata?.pricing || {};
  const cad = order.metadata?.cad || {};
  const canSlice = Boolean(cad.fileName) && [CAD_STATUS.GENERATED, CAD_STATUS.READY_FOR_PRINT].includes(cad.status);
  const currentSummary = buildCurrentSummary(order);
  const productSubtotalBrl = order.metadata?.commerce?.itemsSubtotalBrl ?? order.totalBrl;
  const difference = pricing.suggestedPriceBrl
    ? Number(pricing.suggestedPriceBrl) - Number(productSubtotalBrl || 0)
    : 0;

  return (
    <section className="pricing-panel">
      <div className="pricing-panel__header">
        <div>
          <p className="eyebrow">{pricing.mode || "pending"}</p>
          <h3>{canSlice ? "Calculo real por fatiamento" : "Aguardando STL registrado"}</h3>
        </div>
        <form action={action}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="token" value={token} />
          <button className="button button-primary" type="submit" disabled={!canSlice}>
            Calcular com Orca
          </button>
        </form>
      </div>

      {!canSlice && (
        <p className="admin-note">
          Registre o STL no painel Rhino / Grasshopper antes de chamar o Orca Slicer.
        </p>
      )}

      {pricing.error && (
        <p className="admin-error">
          {pricing.error.message}
        </p>
      )}

      <dl className="admin-payment-grid pricing-grid">
        <div>
          <dt>Resumo atual</dt>
          <dd>{currentSummary.materialGrams} g | {currentSummary.printHours} h</dd>
        </div>
        <div>
          <dt>Orca material</dt>
          <dd>{pricing.materialGrams ? `${pricing.materialGrams} g` : "N/A"}</dd>
        </div>
        <div>
          <dt>Orca tempo</dt>
          <dd>{pricing.printMinutes ? formatMinutes(pricing.printMinutes) : "N/A"}</dd>
        </div>
        <div>
          <dt>Custo direto</dt>
          <dd>{pricing.directCostBrl ? formatCurrency(pricing.directCostBrl) : "N/A"}</dd>
        </div>
        <div>
          <dt>Preco sugerido</dt>
          <dd>{pricing.suggestedPriceBrl ? formatCurrency(pricing.suggestedPriceBrl) : "N/A"}</dd>
        </div>
        <div>
          <dt>Dif. vs produtos</dt>
          <dd>{pricing.suggestedPriceBrl ? formatCurrency(difference) : "N/A"}</dd>
        </div>
      </dl>

      {pricing.calculatedAt && (
        <p className="admin-note">
          Calculado em {new Date(pricing.calculatedAt).toLocaleString("pt-BR")} com perfil{" "}
          {pricing.profileId || "default"}.
        </p>
      )}
    </section>
  );
}

function buildCurrentSummary(order) {
  const totals = order.items.reduce(
    (sum, item) => {
      sum.materialGrams += Number(item.priceBreakdown?.materialGrams || 0) * Number(item.quantity || 1);
      sum.printHours += Number(item.priceBreakdown?.printHours || 0) * Number(item.quantity || 1);
      return sum;
    },
    { materialGrams: 0, printHours: 0 }
  );

  return {
    materialGrams: Math.round(totals.materialGrams * 10) / 10,
    printHours: Math.round(totals.printHours * 10) / 10
  };
}

function formatMinutes(minutes) {
  const safeMinutes = Math.round(Number(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (!hours) {
    return `${remainder} min`;
  }

  return `${hours} h ${String(remainder).padStart(2, "0")} min`;
}
