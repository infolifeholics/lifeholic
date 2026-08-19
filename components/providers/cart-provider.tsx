'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  price_inr?: number;
  price_usd?: number;
  image: string;
  quantity: number;
  type: 'digital' | 'physical';
};

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'thelifeholics-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;

    let active = true;
    const fetchLatestPrices = async () => {
      try {
        const updatedItems = await Promise.all(
          items.map(async (item) => {
            const docRef = doc(db, 'products', item.id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const data = snap.data();
              return {
                ...item,
                name: data.name || item.name,
                image: data.image || item.image,
                type: data.type || item.type,
                price: data.price_inr || data.price || item.price,
                price_inr: data.price_inr || item.price_inr,
                price_usd: data.price_usd || item.price_usd,
              };
            }
            return item;
          })
        );
        if (active) {
          const hasChanged = JSON.stringify(items) !== JSON.stringify(updatedItems);
          if (hasChanged) {
            setItems(updatedItems);
          }
        }
      } catch (err) {
        console.error('Error syncing cart prices with Firestore:', err);
      }
    };

    fetchLatestPrices();
    return () => {
      active = false;
    };
  }, [hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add: (item, quantity = 1) => {
        setItems((prev) => {
          const existing = prev.find((p) => p.id === item.id);
          if (existing) {
            return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + quantity } : p));
          }
          return [...prev, { ...item, quantity }];
        });
      },
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      setQuantity: (id, quantity) =>
        setItems((prev) =>
          prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, quantity) } : p))
        ),
      clear: () => setItems([]),
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.quantity * i.price, 0),
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
