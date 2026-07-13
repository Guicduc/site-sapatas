"use client";

import { useEffect, useState } from "react";

import { AccountDashboard } from "@/components/account-dashboard";

export const DEMO_ORDERS_KEY = "baseforma-demo-orders";

export function readDemoOrders() {
  try {
    const orders = JSON.parse(window.localStorage.getItem(DEMO_ORDERS_KEY) || "[]");
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

export function saveDemoOrder(order) {
  const orders = readDemoOrders().filter((item) => item.id !== order.id);
  window.localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify([order, ...orders].slice(0, 20)));
}

export function DemoAccount() {
  const [orders, setOrders] = useState(null);

  useEffect(() => setOrders(readDemoOrders()), []);

  if (orders === null) {
    return <section className="empty-cart"><h1>Carregando pedidos de demonstração.</h1></section>;
  }

  if (!orders.length) {
    return (
      <section className="empty-cart">
        <p className="eyebrow">Conta de demonstração</p>
        <h1>Ainda não há pedidos simulados neste dispositivo.</h1>
        <p>Configure um produto e finalize o checkout para conhecer o pós-compra.</p>
        <a className="button button-primary" href="/catalogo">Criar pedido de teste</a>
      </section>
    );
  }

  return <AccountDashboard email="visitante@demonstracao.local" orders={orders} demo />;
}
