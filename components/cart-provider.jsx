"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clampCartQuantity, restoreClientCart, updateClientCartItem } from "@/lib/client-cart";

const CartContext = createContext(null);
const storageKey = "baseforma-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved) {
        setItems(restoreClientCart(saved));
      }
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Storage cheio ou bloqueado nao pode derrubar o site: o carrinho segue
      // em memoria nesta aba.
    }
  }, [items, loaded]);

  // Callbacks estaveis: consumidores podem usa-los em dependencias de efeitos
  // sem disparar novos renders a cada mudanca do carrinho.
  const addItem = useCallback((item) => {
    setItems((current) => [
      ...current,
      {
        ...item,
        quantity: clampCartQuantity(item.quantity),
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`
      }
    ]);
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    const safeQuantity = clampCartQuantity(quantity);
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? updateClientCartItem(item, safeQuantity)
          : item
      )
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    // Mantem a mesma referencia quando ja esta vazio para nao gerar render.
    setItems((current) => (current.length ? [] : current));
  }, []);

  const value = useMemo(
    () => ({
      items,
      loaded,
      count: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      total: items.reduce((sum, item) => sum + Number(item.priceBrl || 0), 0),
      addItem,
      updateQuantity,
      removeItem,
      clearCart
    }),
    [items, loaded, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error("useCart must be used within CartProvider");
  }

  return value;
}

