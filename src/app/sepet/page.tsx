"use client";

import Link from "next/link";
import { formatTL } from "@/data/site";
import { useCartLines } from "@/lib/useCartLines";
import ProductImage from "@/components/ProductImage";
import OrderSummary from "@/components/OrderSummary";
import styles from "./cart.module.css";

export default function CartPage() {
  const { lines, ready, subtotal, shipping, total, setQty, remove } = useCartLines();

  if (!ready) return <div className="wrap section" />;

  if (lines.length === 0) {
    return (
      <div className={`wrap section ${styles.empty}`}>
        <h1>Sepetin boş</h1>
        <p className="muted">Ajandanın modelini seçerek başlayabilirsin.</p>
        <Link href="/#kiliflar" className="btn">Kılıflara bak</Link>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.page}`}>
      <h1 className={styles.title}>Sepet</h1>
      <div className={styles.layout}>
        <ul className={styles.list}>
          {lines.map(({ item, product, name, href, details, unitPrice, lineTotal }) => (
            <li key={item.key} className={styles.line}>
              <Link href={href} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                {product ? (
                  <ProductImage product={product} sizes="96px" />
                ) : (
                  <div className="photo-soon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/marka/logo.png" alt="" width={214} height={203} />
                    <span>Özel istek</span>
                  </div>
                )}
              </Link>
              <div className={styles.body}>
                <div className={styles.row}>
                  <Link href={href} className={styles.name}>
                    {name}
                  </Link>
                  <span className={styles.lineTotal}>{formatTL(lineTotal)}</span>
                </div>
                <ul className={styles.details}>
                  {details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                  {item.agenda.link ? (
                    <li>
                      <a href={item.agenda.link} target="_blank" rel="noopener noreferrer">
                        Ürün bağlantısı
                      </a>
                    </li>
                  ) : null}
                  {item.note ? <li>Not: {item.note}</li> : null}
                  {item.agendaThumb ? (
                    <li className={styles.agendaImg}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.agendaThumb} alt="Eklediğin ajanda görseli" />
                      <span>Görsel eklendi</span>
                    </li>
                  ) : null}
                </ul>
                <div className={styles.row}>
                  <div className="qty" aria-label={`${name} adedi`}>
                    <button type="button" onClick={() => setQty(item.key, item.qty - 1)} aria-label="Bir azalt">−</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => setQty(item.key, item.qty + 1)} aria-label="Bir artır">+</button>
                  </div>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {item.qty > 1 ? `Tanesi ${formatTL(unitPrice)}` : ""}
                  </span>
                  <button type="button" className="link-btn" onClick={() => remove(item.key)}>
                    Kaldır
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className={styles.aside}>
          <OrderSummary subtotal={subtotal} shipping={shipping} total={total}>
            <Link href="/odeme" className="btn btn--block" style={{ marginTop: 8 }}>
              Siparişi tamamla
            </Link>
            <p className="field__hint" style={{ textAlign: "center" }}>
              Üyelik gerekmez.
            </p>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
