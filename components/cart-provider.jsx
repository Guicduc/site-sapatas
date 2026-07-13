"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  buildConfigurationSku,
  calculateLeadTime,
  calculatePriceBreakdown,
  getCategoryBySlug,
  getFormat,
  isLegacySku
} from "@/lib/configurator-data";

const CartContext = createContext(null);
const storageKey = "baseforma-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved) {
        setItems(JSON.parse(saved).map(migrateLegacyItem));
      }
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, loaded]);

  const value = useMemo(
    () => ({
      items,
      loaded,
      count: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      total: items.reduce((sum, item) => sum + Number(item.priceBrl || 0), 0),
      addItem(item) {
        setItems((current) => [
          ...current,
          {
            ...item,
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`
          }
        ]);
      },
      updateQuantity(id, quantity) {
        const safeQuantity = Math.max(1, Number(quantity || 1));
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? buildUpdatedQuantityItem(item, safeQuantity)
              : item
          )
        );
      },
      removeItem(id) {
        setItems((current) => current.filter((item) => item.id !== id));
      },
      clearCart() {
        setItems([]);
      }
    }),
    [items]
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

function migrateLegacyItem(item) {
  if (!isLegacySku(item?.sku)) {
    return item;
  }

  const category = getCategoryBySlug(item.categorySlug);
  const format = category ? getFormat(category, item.formatSlug) : null;

  if (!format) {
    return item;
  }

  const quantity = Math.max(1, Number(item.quantity || 1));
  const priceBreakdown = calculatePriceBreakdown(format, item.values || {}, quantity);

  return {
    ...item,
    sku: buildConfigurationSku(format, item.values || {}, { color: item.color }),
    quantity,
    unitPriceBrl: priceBreakdown.unitPriceBrl,
    priceBrl: priceBreakdown.totalPriceBrl,
    priceBreakdown,
    leadTimeDays: calculateLeadTime(format, quantity)
  };
}

function buildUpdatedQuantityItem(item, quantity) {
  const category = getCategoryBySlug(item.categorySlug);
  const format = category ? getFormat(category, item.formatSlug) : null;

  if (!format) {
    return {
      ...item,
      quantity,
      priceBrl: roundMoney(Number(item.unitPriceBrl || 0) * quantity)
    };
  }

  const priceBreakdown = calculatePriceBreakdown(format, item.values || {}, quantity);

  return {
    ...item,
    quantity,
    unitPriceBrl: priceBreakdown.unitPriceBrl,
    priceBrl: priceBreakdown.totalPriceBrl,
    priceBreakdown
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
