export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

export function buildMailtoUrl(email, subject, body) {
  // RFC 6068 exige %20 no lugar de espaco; URLSearchParams geraria "+",
  // que parte dos clientes de e-mail mostra literalmente no assunto.
  const query = [
    subject ? `subject=${encodeURIComponent(subject)}` : "",
    body ? `body=${encodeURIComponent(body)}` : ""
  ]
    .filter(Boolean)
    .join("&");

  return query ? `mailto:${email}?${query}` : `mailto:${email}`;
}
