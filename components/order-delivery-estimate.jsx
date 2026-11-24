import { formatBusinessDays } from "@/lib/production-lead-time";

// Prazo prometido na compra (metadata.deliveryEstimate), em dias uteis apos o pagamento.
export function OrderDeliveryEstimate({ estimate, className = "checkout-totals" }) {
  if (!estimate?.productionDays) return null;

  return (
    <>
      <dl className={className} aria-label="Prazo estimado">
        <div>
          <dt>Produção</dt>
          <dd>até {formatBusinessDays(estimate.productionDays)}</dd>
        </div>
        {estimate.shippingDays ? (
          <div>
            <dt>Transporte</dt>
            <dd>até {formatBusinessDays(estimate.shippingDays)}</dd>
          </div>
        ) : null}
        {estimate.totalDays ? (
          <div className="checkout-totals__total">
            <dt>Entrega estimada</dt>
            <dd>até {formatBusinessDays(estimate.totalDays)}</dd>
          </div>
        ) : null}
      </dl>
      <p className="checkout-note">Prazos em dias úteis, contados a partir da confirmação do pagamento.</p>
    </>
  );
}
