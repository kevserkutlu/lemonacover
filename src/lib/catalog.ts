// Ürün kataloğu API'den: markalar, satıştaki ilanlar, kargo ücreti, kurallar.
// Tek kaynak veritabanı (api/ → GET /katalog). Bu dosya hem build sırasında
// (sunucu bileşenleri sayfaları hazırlarken) hem tarayıcıda kullanılır.

import type { Brand, Product } from "@/data/products";

export type CatalogRules = {
  agendaNameMin: number;
  agendaNameMax: number;
  maxQty: number;
  maxLines: number;
};

export type Catalog = {
  brands: Brand[];
  products: Product[];
  shipping: number; // TL, her siparişte sabit
  rules: CatalogRules;
};

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export async function fetchCatalog(init?: RequestInit): Promise<Catalog> {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL tanımlı değil. Ürünler API'den alınır: geliştirmede .env.development.local, " +
        "yayında .env.production içine API adresini yaz (README → Yayına hazırlama).",
    );
  }
  const res = await fetch(`${API_URL}/katalog`, init);
  if (!res.ok) throw new Error(`Katalog alınamadı: ${API_URL}/katalog → ${res.status}`);
  return (await res.json()) as Catalog;
}
