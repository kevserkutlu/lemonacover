"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { AgendaInfo, CustomSize, SelectedOptions } from "@/data/products";

/** Onayladığım özel istek (fiyatı istekten gelir; sipariş sırasında API yeniden kontrol eder) */
export type CartRequest = {
  code: string;
  kilif: "seffaf" | "simli";
  details: string[];
  price: number;
};

export type CartItem = {
  key: string;
  slug: string; // özel istekte "istek-<kod>"
  request?: CartRequest;
  options: SelectedOptions;
  custom?: CustomSize;
  note?: string;
  agenda: AgendaInfo;
  agendaThumb?: string; // sepette göstermek için küçük önizleme
  qty: number;
};

type CartState = {
  items: CartItem[];
  ready: boolean;
  count: number;
  lastAdded: number; // zaman damgası — sepet ikonunu zıplatmak için
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "lemona-cart-v3"; // v3: şeffaf ve simli ayrı ilan oldu

function itemKey(i: Omit<CartItem, "key" | "qty">) {
  if (i.request) return JSON.stringify(["istek", i.request.code]); // aynı istek tek satır
  return JSON.stringify([i.slug, i.options, i.custom ?? null, i.note ?? "", i.agenda]);
}

/* ---------- tarayıcı deposu (localStorage) ---------- */

const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function load(): CartItem[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function save(next: CartItem[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  // başka sekmede sepet değişirse buraya da yansısın
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
const noop = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  // statik HTML'de sepet boş görünür; tarayıcıda yerel depodan okunur
  const items = useSyncExternalStore(subscribe, load, () => EMPTY);
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const [lastAdded, setLastAdded] = useState(0);

  const add = useCallback<CartState["add"]>((item, qty = 1) => {
    const key = itemKey(item);
    const prev = load();
    const found = prev.find((p) => p.key === key);
    save(
      found
        ? prev.map((p) => (p.key === key ? { ...p, qty: Math.min(p.qty + qty, 10) } : p))
        : [...prev, { ...item, key, qty }],
    );
    setLastAdded(Date.now());
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    save(load().map((p) => (p.key === key ? { ...p, qty: Math.max(1, Math.min(qty, 10)) } : p)));
  }, []);

  const remove = useCallback((key: string) => {
    save(load().filter((p) => p.key !== key));
  }, []);

  const clear = useCallback(() => save([]), []);

  const value = useMemo(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.qty, 0),
      lastAdded,
      add,
      setQty,
      remove,
      clear,
    }),
    [items, ready, lastAdded, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
