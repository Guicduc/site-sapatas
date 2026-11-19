// Arquivamento administrativo de pedidos.
//
// Arquivar apenas tira o pedido das listas operacionais do admin. Nao cancela
// pedido, pagamento ou NF, nao altera o que o cliente ve na conta e nao exige
// migration: o marcador vive em orders.metadata.adminArchive.
//
// O marcador guarda a situacao do pagamento no momento do arquivamento. Se ela
// mudar depois (boleto pago, reembolso, revisao ou alerta do Mercado Pago), o
// pedido deixa de contar como arquivado e volta sozinho as listas, sem depender
// de nenhum codigo no fluxo de pagamento.

export const ORDER_ARCHIVE_KEY = "adminArchive";

export function getArchivePaymentSignature(order) {
  return [
    order?.paymentStatus || "",
    order?.metadata?.paymentReview ? "review" : "",
    Array.isArray(order?.metadata?.paymentAlerts) ? order.metadata.paymentAlerts.length : 0
  ].join("|");
}

export function getOrderArchive(order) {
  const marker = order?.metadata?.[ORDER_ARCHIVE_KEY];
  return marker && typeof marker === "object" && marker.archivedAt ? marker : null;
}

export function hasOrderArchiveMarker(order) {
  return Boolean(order?.metadata?.[ORDER_ARCHIVE_KEY]);
}

export function isOrderArchived(order) {
  const marker = getOrderArchive(order);
  return Boolean(marker) && marker.paymentSignature === getArchivePaymentSignature(order);
}

// Pedido arquivado cujo pagamento mudou depois: voltou as listas operacionais.
export function wasOrderReactivated(order) {
  return Boolean(getOrderArchive(order)) && !isOrderArchived(order);
}

// Devolve o metadata com o marcador aplicado ou removido, preservando o resto.
export function buildArchivedMetadata(order, archived, now = new Date().toISOString()) {
  const { [ORDER_ARCHIVE_KEY]: _previous, ...metadata } = order?.metadata || {};
  if (!archived) return metadata;
  return {
    ...metadata,
    [ORDER_ARCHIVE_KEY]: {
      archivedAt: now,
      paymentSignature: getArchivePaymentSignature(order)
    }
  };
}

export function splitArchivedOrders(orders = []) {
  const active = [];
  const archived = [];
  for (const order of orders) {
    (isOrderArchived(order) ? archived : active).push(order);
  }
  return { active, archived };
}
