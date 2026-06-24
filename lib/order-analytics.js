import { PAYMENT_STATUS } from "@/lib/order-status";

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildOrderAnalytics(orders = [], { now = new Date() } = {}) {
  const safeOrders = Array.isArray(orders) ? orders.filter(Boolean) : [];
  const periodStart = new Date(now.getTime() - 30 * DAY_MS);

  const summary = emptySummary();
  const last30Days = emptySummary();
  const statusCounts = {};
  const paymentCounts = {};
  const sourceCounts = {};
  const recentOrders = [];
  const byDayMap = new Map();

  for (const order of safeOrders) {
    const createdAt = toDate(order.createdAt);
    const commerce = getCommerceSummary(order);
    const paymentStatus = order.paymentStatus || "unknown";
    const orderStatus = order.status || "unknown";
    const source = order.source || "unknown";

    addOrderToSummary(summary, order, commerce);
    increment(statusCounts, orderStatus);
    increment(paymentCounts, paymentStatus);
    increment(sourceCounts, source);

    if (createdAt && createdAt >= periodStart) {
      addOrderToSummary(last30Days, order, commerce);
      const dayKey = createdAt.toISOString().slice(0, 10);
      const day = byDayMap.get(dayKey) || emptyDay(dayKey);
      addOrderToDay(day, order, commerce);
      byDayMap.set(dayKey, day);
    }

    recentOrders.push({
      id: order.id,
      orderNumber: order.orderNumber || order.id,
      customerName: order.customer?.name || "Cliente sem nome",
      createdAt: order.createdAt || null,
      status: orderStatus,
      paymentStatus,
      itemsCount: Array.isArray(order.items) ? order.items.length : 0,
      productsBrl: commerce.itemsSubtotalBrl,
      discountBrl: commerce.discountBrl,
      shippingBrl: commerce.shippingBrl,
      totalBrl: commerce.totalBrl
    });
  }

  finalizeSummary(summary);
  finalizeSummary(last30Days);

  return {
    generatedAt: now.toISOString(),
    period: {
      label: "Ultimos 30 dias",
      startsAt: periodStart.toISOString(),
      endsAt: now.toISOString()
    },
    summary,
    last30Days,
    statusCounts: toSortedCountList(statusCounts),
    paymentCounts: toSortedCountList(paymentCounts),
    sourceCounts: toSortedCountList(sourceCounts),
    daily: Array.from(byDayMap.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-30),
    recentOrders: recentOrders
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 20)
  };
}

function emptySummary() {
  return {
    ordersCount: 0,
    approvedOrdersCount: 0,
    pendingPaymentCount: 0,
    failedPaymentCount: 0,
    itemsCount: 0,
    productsBrl: 0,
    discountBrl: 0,
    shippingBrl: 0,
    totalBrl: 0,
    approvedRevenueBrl: 0,
    averageTicketBrl: 0
  };
}

function emptyDay(date) {
  return {
    date,
    ordersCount: 0,
    approvedOrdersCount: 0,
    totalBrl: 0,
    approvedRevenueBrl: 0
  };
}

function addOrderToSummary(summary, order, commerce) {
  summary.ordersCount += 1;
  summary.itemsCount += Array.isArray(order.items)
    ? order.items.reduce((total, item) => total + Number(item.quantity || 0), 0)
    : 0;
  summary.productsBrl += commerce.itemsSubtotalBrl;
  summary.discountBrl += commerce.discountBrl;
  summary.shippingBrl += commerce.shippingBrl;
  summary.totalBrl += commerce.totalBrl;

  if (order.paymentStatus === PAYMENT_STATUS.APPROVED) {
    summary.approvedOrdersCount += 1;
    summary.approvedRevenueBrl += commerce.totalBrl;
  }

  if (order.paymentStatus === PAYMENT_STATUS.PENDING) {
    summary.pendingPaymentCount += 1;
  }

  if ([PAYMENT_STATUS.REJECTED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.EXPIRED].includes(order.paymentStatus)) {
    summary.failedPaymentCount += 1;
  }
}

function addOrderToDay(day, order, commerce) {
  day.ordersCount += 1;
  day.totalBrl += commerce.totalBrl;

  if (order.paymentStatus === PAYMENT_STATUS.APPROVED) {
    day.approvedOrdersCount += 1;
    day.approvedRevenueBrl += commerce.totalBrl;
  }
}

function finalizeSummary(summary) {
  summary.productsBrl = roundMoney(summary.productsBrl);
  summary.discountBrl = roundMoney(summary.discountBrl);
  summary.shippingBrl = roundMoney(summary.shippingBrl);
  summary.totalBrl = roundMoney(summary.totalBrl);
  summary.approvedRevenueBrl = roundMoney(summary.approvedRevenueBrl);
  summary.averageTicketBrl = summary.ordersCount
    ? roundMoney(summary.totalBrl / summary.ordersCount)
    : 0;
}

function getCommerceSummary(order) {
  const commerce = order.metadata?.commerce || {};
  const discount = commerce.discount || {};
  const shipping = commerce.shipping || {};
  const itemsSubtotalBrl = Number(
    commerce.itemsSubtotalBrl ?? sumItemsSubtotal(order.items)
  );
  const discountBrl = Number(discount.amountBrl || 0);
  const shippingBrl = Number(shipping.amountBrl || 0);
  const totalBrl = Number(commerce.totalBrl ?? order.totalBrl ?? itemsSubtotalBrl - discountBrl + shippingBrl);

  return {
    itemsSubtotalBrl: roundMoney(itemsSubtotalBrl),
    discountBrl: roundMoney(discountBrl),
    shippingBrl: roundMoney(shippingBrl),
    totalBrl: roundMoney(totalBrl)
  };
}

function sumItemsSubtotal(items = []) {
  return Array.isArray(items)
    ? items.reduce((total, item) => total + Number(item.totalPriceBrl || 0), 0)
    : 0;
}

function increment(counts, key) {
  counts[key] = Number(counts[key] || 0) + 1;
}

function toSortedCountList(counts) {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function toDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
