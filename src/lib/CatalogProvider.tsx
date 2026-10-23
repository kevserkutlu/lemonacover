"use client";

// Sitenin her yerinde kullanılan katalog. Sayfa, build sırasında API'den alınan
// veriyle hazır gelir (Google ve bağlantı önizlemeleri için); tarayıcı açılınca
// API'den güncelini çeker. Böylece veritabanında değişen fiyat ya da fotoğraf
// yeniden build almadan sitede görünür.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { fetchCatalog, type Catalog } from "./catalog";

type CatalogValue = Catalog & {
  getProduct: (slug: string) => Product | undefined;
  /** Build'den sonra eklenen ilanın hazır sayfası yok; o zaman /urun/?id= sayfası açılır */
  productHref: (product: Product) => string;
};

const Ctx = createContext<CatalogValue | null>(null);

export function CatalogProvider({ initial, children }: { initial: Catalog; children: React.ReactNode }) {
  const [data, setData] = useState(initial);
  const [built] = useState(() => new Set(initial.products.map((p) => p.slug)));

  useEffect(() => {
    let alive = true;
    fetchCatalog({ cache: "no-store" })
      .then((fresh) => alive && setData(fresh))
      .catch(() => {}); // API'ye ulaşılamazsa sayfadaki (build) veriyle devam
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<CatalogValue>(
    () => ({
      ...data,
      getProduct: (slug) => data.products.find((p) => p.slug === slug),
      productHref: (p) => (built.has(p.slug) ? `/urun/${p.slug}/` : `/urun/?id=${encodeURIComponent(p.slug)}`),
    }),
    [data, built],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalog, CatalogProvider içinde kullanılmalı.");
  return v;
}
