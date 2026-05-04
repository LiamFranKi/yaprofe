import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'yaprofe_cart_v1';

export type CartLine = {
  productId: number;
  title: string;
  price_cents: number;
  cover_url: string | null;
};

type CartContextValue = {
  items: CartLine[];
  count: number;
  totalCents: number;
  addItem: (line: CartLine) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
  hasItem: (productId: number) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadInitial(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter(
      (x): x is CartLine =>
        x &&
        typeof x === 'object' &&
        typeof (x as CartLine).productId === 'number' &&
        typeof (x as CartLine).title === 'string' &&
        typeof (x as CartLine).price_cents === 'number'
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((line: CartLine) => {
    setItems((prev) => {
      if (prev.some((p) => p.productId === line.productId)) return prev;
      return [...prev, line];
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const hasItem = useCallback(
    (productId: number) => items.some((p) => p.productId === productId),
    [items]
  );

  const totalCents = useMemo(() => items.reduce((s, p) => s + p.price_cents, 0), [items]);
  const count = items.length;

  const value = useMemo(
    () => ({ items, count, totalCents, addItem, removeItem, clear, hasItem }),
    [items, count, totalCents, addItem, removeItem, clear, hasItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
