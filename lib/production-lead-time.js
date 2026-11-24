// Regra unica de prazo de producao, usada pelo navegador (configurador, carrinho) e pelo
// servidor (pedido). Prazos em dias uteis, contados a partir da aprovacao do pagamento.
//
//   producao = max(piso, ceil(tempo de impressao do pedido / capacidade diaria) + folga)
//              + acrescimo de formato em revisao
//
// O tempo do pedido e a soma de (minutos por peca x quantidade) de todos os itens: varios
// itens dividem as mesmas impressoras, entao a carga soma em vez de pegar o maior item.

export const MIN_PRODUCTION_DAYS = 7;
// Embalagem e postagem depois da ultima peca impressa.
export const PRODUCTION_BUFFER_DAYS = 1;
export const REVIEW_EXTRA_DAYS = 3;
const DEFAULT_DAILY_PRINT_HOURS = 30;
const MAX_LEAD_TIME_DAYS = 365;

// NEXT_PUBLIC_ porque o configurador calcula o mesmo prazo no navegador. Soma das horas de
// impressao de todas as impressoras em um dia util.
export function getDailyPrintMinutes() {
  const hours = Number(process.env.NEXT_PUBLIC_PRODUCTION_DAILY_PRINT_HOURS || DEFAULT_DAILY_PRINT_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_DAILY_PRINT_HOURS) * 60;
}

/**
 * @param {Array<{ printMinutesPerUnit?: number, quantity?: number, minDays?: number, review?: boolean }>} lines
 */
export function calculateProductionLeadTime(lines = [], { dailyPrintMinutes = getDailyPrintMinutes() } = {}) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const printMinutes = safeLines.reduce((sum, line) => {
    const minutes = Math.max(0, Number(line?.printMinutesPerUnit || 0));
    const quantity = Math.max(1, Math.floor(Number(line?.quantity || 1)));
    return sum + (Number.isFinite(minutes) ? minutes * quantity : 0);
  }, 0);
  const minDays = Math.max(
    MIN_PRODUCTION_DAYS,
    ...safeLines.map((line) => Number(line?.minDays || 0)).filter(Number.isFinite)
  );
  const printDays = Math.ceil(printMinutes / dailyPrintMinutes);
  const capacityDays = printDays > 0 ? printDays + PRODUCTION_BUFFER_DAYS : 0;
  const reviewDays = safeLines.some((line) => line?.review) ? REVIEW_EXTRA_DAYS : 0;
  const days = Math.min(MAX_LEAD_TIME_DAYS, Math.max(minDays, capacityDays) + reviewDays);

  return {
    days,
    printMinutes: Math.round(printMinutes),
    printDays,
    capacityBound: capacityDays > minDays,
    reviewDays
  };
}

export function leadTimeLineForFormat(format, quantity, printMinutesPerUnit) {
  return {
    printMinutesPerUnit,
    quantity,
    minDays: Number(format?.leadTimeBaseDays || 0),
    review: format?.status === "review"
  };
}

// Prazo total prometido ao cliente: producao + transporte, ambos em dias uteis.
export function buildDeliveryEstimate(productionDays, shippingDays) {
  const production = Math.max(0, Math.round(Number(productionDays || 0)));
  const shipping = Number(shippingDays);
  const hasShipping = Number.isFinite(shipping) && shipping > 0;

  return {
    unit: "business_days",
    startsAt: "payment_approved",
    productionDays: production,
    shippingDays: hasShipping ? Math.round(shipping) : null,
    totalDays: hasShipping ? production + Math.round(shipping) : null
  };
}

export function formatBusinessDays(days) {
  const value = Math.round(Number(days || 0));
  return `${value} ${value === 1 ? "dia útil" : "dias úteis"}`;
}
