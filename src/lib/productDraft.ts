"use client";

// Ürün sayfasında doldurulan alanlar (ajanda adı, görsel, bağlantı, ölçüler, not, adet,
// diğer seçenekler). Şeffaf ve simli kılıf ayrı ilan; müşteri Şeffaf/Simli düğmesiyle
// diğer ilana geçince yazdıkları kaybolmasın diye taslak ajandanın "grup"una göre
// bu sekmede (sessionStorage) tutulur. Sepete eklenince temizlenir.

import { useCallback, useSyncExternalStore } from "react";
import type { CustomSize, SelectedOptions } from "@/data/products";

export type ProductDraft = {
  options: SelectedOptions;
  custom: CustomSize;
  note: string;
  qty: number;
  agenda: { name: string; link: string; imageId?: string; thumb?: string };
  /** galeride açık fotoğraf; kılıf türü değişip fotoğraflar aynı kalınca yerinde dursun */
  photo?: { source: string; index: number };
};

export const EMPTY_DRAFT: ProductDraft = {
  options: {},
  custom: { en: "", boy: "", sirt: "" },
  note: "",
  qty: 1,
  agenda: { name: "", link: "" },
};

const PREFIX = "lemona-taslak:";
const EVENT = "lemona:taslak";
const cache = new Map<string, ProductDraft>();

function read(group: string): ProductDraft {
  const hit = cache.get(group);
  if (hit) return hit;
  let draft = EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(PREFIX + group);
    if (raw) draft = { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {}
  cache.set(group, draft);
  return draft;
}

function write(group: string, draft: ProductDraft | null) {
  cache.set(group, draft ?? EMPTY_DRAFT);
  try {
    if (draft) sessionStorage.setItem(PREFIX + group, JSON.stringify(draft));
    else sessionStorage.removeItem(PREFIX + group);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** Grubun taslağı ve güncelleme fonksiyonları. Sunucuda boş taslakla çizilir. */
export function useProductDraft(group: string) {
  const draft = useSyncExternalStore(
    subscribe,
    () => read(group),
    () => EMPTY_DRAFT,
  );
  const update = useCallback(
    (patch: Partial<ProductDraft> | ((d: ProductDraft) => Partial<ProductDraft>)) => {
      const current = read(group);
      const p = typeof patch === "function" ? patch(current) : patch;
      write(group, { ...current, ...p });
    },
    [group],
  );
  const clear = useCallback(
    (keep?: Partial<ProductDraft>) => write(group, keep ? { ...EMPTY_DRAFT, ...keep } : null),
    [group],
  );
  return { draft, update, clear };
}
