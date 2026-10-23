"use client";

// Ana sayfadaki kılıf listesi ve marka filtresi.
// Seçilen marka adreste tutulur (/?marka=prev#kiliflar): paylaşılabilir, geri tuşu çalışır.
// Statik HTML'de tüm ilanlar çizilir; filtre tarayıcıda uygulanır.

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { hasMedia } from "@/data/products";
import { useCatalog } from "@/lib/CatalogProvider";
import ProductCard from "./ProductCard";

const EVENT = "lemona:marka";

function readBrand() {
  return new URLSearchParams(window.location.search).get("marka") ?? "";
}
function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}
function choose(id: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("marka", id);
  else url.searchParams.delete("marka");
  url.hash = "kiliflar";
  window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}

export default function ProductGrid() {
  const { brands, products } = useCatalog();
  const wanted = useSyncExternalStore(subscribe, readBrand, () => "");
  const brand = brands.some((b) => b.id === wanted) ? wanted : "";
  // fotoğrafı/videosu olmayan kılıf türü ayrı kart olmaz (ürün sayfasında seçilebilir)
  const shown = products.filter(hasMedia);
  const list = brand ? shown.filter((p) => p.marka === brand) : shown;
  const current = brands.find((b) => b.id === brand);

  return (
    <>
      <div className="brand-filter" role="group" aria-label="Markaya göre">
        <button type="button" className="brand-chip" aria-pressed={!brand} onClick={() => choose("")}>
          Tümü
        </button>
        {brands.map((b) => (
          <button
            key={b.id}
            type="button"
            className="brand-chip"
            aria-pressed={brand === b.id}
            onClick={() => choose(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="grid" aria-live="polite">
          {list.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <div className="notice brand-empty" aria-live="polite">
          <p>
            {current?.name} ajandaları için ilanları yakında ekliyorum. O zamana kadar
            ajandanın adını ve fotoğrafını gönder; dikebiliyorsam fiyatıyla sana dönerim.
          </p>
          <Link className="btn btn--ghost" href="/istek">
            Özel istek gönder
          </Link>
        </div>
      )}
    </>
  );
}
