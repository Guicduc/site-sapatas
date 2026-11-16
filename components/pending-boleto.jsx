export function PendingBoleto({ boleto, onContinuePayment }) {
  if (!boleto) return null;
  const expired = boleto.expiresAt && Date.parse(boleto.expiresAt) <= Date.now();
  const dueDate = boleto.expiresAt ? new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeZone: "America/Sao_Paulo"
  }).format(new Date(boleto.expiresAt)) : null;

  return (
    <div className="account-order__payment-action">
      <p className="eyebrow">Pagamento por boleto</p>
      <p><strong>{expired ? "Boleto vencido" : "Boleto emitido"}</strong></p>
      <p>{dueDate ? `Vencimento: ${dueDate}.` : "Confira o vencimento no boleto."}</p>
      {expired ? (
        <>
          <p>Se já pagou, aguarde a confirmação. Caso ainda não tenha pago, consulte as opções no Mercado Pago pela sua conta antes de fazer um novo pagamento.</p>
          {onContinuePayment && <button className="button button-secondary" type="button" onClick={onContinuePayment}>Consultar pagamento no Mercado Pago</button>}
        </>
      ) : (
        <>
          <p>Abra o boleto para copiar o código de pagamento ou imprimir. Pague pelo aplicativo do seu banco ou outro canal que aceite boletos.</p>
          <a className="button button-primary" href={boleto.url} target="_blank" rel="noopener noreferrer">Abrir boleto no Mercado Pago</a>
          <p>Se já pagou, aguarde a confirmação e evite pagar novamente. A produção é liberada após a confirmação do pagamento.</p>
        </>
      )}
    </div>
  );
}
