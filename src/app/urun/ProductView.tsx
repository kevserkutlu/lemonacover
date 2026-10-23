"use client";

// Ürün sayfasının içi: konum çubuğu ve sipariş formu. Ürün bilgisi katalogdan
// (veritabanı → API) gelir; sayfa build'de hazırlanmış olsa da tarayıcı açılınca
// güncel fiyat ve fotoğraflarla yenilenir.

import Link from "next/link";
import { useCatalog } from "@/lib/CatalogProvider";
import Configurator from "./[slug]/Configurator";
import styles from "./[slug]/product.module.css";

export default function ProductView({ slug, setTitle = false }: { slug: string; setTitle?: boolean }) {
  const { getProduct } = useCatalog();
  const product = getProduct(slug);

  if (!product) {
    return (
      <div className={`wrap ${styles.page}`}>
        <h1>Bu ilan şu an satışta değil</h1>
        <p className="muted" style={{ marginTop: 12 }}>
          Bu ilanı kaldırmış ya da adresini değiştirmiş olabilirim. Diğer kılıflara göz at.
        </p>
        <p style={{ marginTop: 20 }}>
          <Link className="btn" href="/#kiliflar">Kılıflara dön</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.page}`}>
      {/* build'den sonra eklenen ilanlar /urun/?id= sayfasında açılır; başlığı burada verilir */}
      {setTitle ? <title>{`${product.name} kılıfı · lemona cover`}</title> : null}
      <nav className={styles.crumbs} aria-label="Konum">
        <Link href="/#kiliflar">Kılıflar</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>
      <Configurator key={product.slug} product={product} />
    </div>
  );
}
