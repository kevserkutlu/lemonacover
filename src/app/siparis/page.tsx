"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatTL, site } from "@/data/site";
import { getOrderSummary } from "@/lib/api";
import type { OrderSummary } from "@/lib/orderLogic";
import Celebrate from "./Celebrate";
import styles from "./order.module.css";

// Sipariş onayı: /siparis/?no=LC-XXXXX
function OrderPage() {
  const no = useSearchParams().get("no") ?? "";
  const [order, setOrder] = useState<OrderSummary | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!no) return;
    // Ödeme sağlayıcısının onayı birkaç saniye gecikebilir: onaylanana kadar sorar
    const load = () =>
      getOrderSummary(no).then((o) => {
        if (!alive) return;
        setOrder(o);
        if (o?.status === "odeme-bekleniyor" && tries++ < 20) timer = setTimeout(load, 3000);
      });
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [no]);

  if (no && order === undefined) return <div className={`wrap ${styles.page}`} aria-busy="true" />;

  if (!order) {
    return (
      <div className={`wrap ${styles.page}`}>
        <h1>Sipariş bulunamadı</h1>
        <p className="muted">
          Bu bağlantıdaki sipariş numarası geçersiz ya da ödemesi tamamlanmamış.
          Siparişine <Link href="/siparis-takip">sipariş takibi</Link> sayfasından da bakabilirsin.
        </p>
      </div>
    );
  }

  if (order.status === "odeme-bekleniyor") {
    return (
      <div className={`wrap ${styles.page}`} aria-live="polite">
        <h1>Ödemen onaylanıyor…</h1>
        <p className="muted">
          Sipariş numaran <strong className="marker">{order.id}</strong>. Bankanın onayı
          birkaç saniye sürebilir; bu sayfa kendiliğinden yenilenecek. Ödemeyi
          tamamlamadıysan <Link href="/sepet">sepetine</Link> dönebilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.page}`}>
      <Celebrate />
      <h1>Siparişini aldım, teşekkürler</h1>
      <p className={styles.lead}>
        Sipariş numaran <strong className="marker">{order.id}</strong>. Kılıfını{" "}
        {site.productionDays} içinde dikip kargoya vereceğim; kargo takip
        numarasını e-posta adresine yollayacağım.
      </p>

      <div className={`panel ${styles.panel}`}>
        <ul className={styles.lines}>
          {order.lines.map((l, i) => (
            <li key={i}>
              <div className="summary-row">
                <span>
                  {l.name} {l.qty > 1 ? `× ${l.qty}` : ""}
                </span>
                <span>{formatTL(l.unitPrice * l.qty)}</span>
              </div>
              <span className="field__hint">{l.details.join(", ")}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row">
          <span>Kargo</span>
          <span>{formatTL(order.shipping)}</span>
        </div>
        <div className="summary-row summary-row--total">
          <span>Toplam</span>
          <span>{formatTL(order.total)}</span>
        </div>
      </div>

      <p className="muted">
        Siparişinin durumuna sipariş numaran ve telefonunun son 4 hanesiyle{" "}
        <Link href="/siparis-takip">sipariş takibi</Link> sayfasından bakabilirsin.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <OrderPage />
    </Suspense>
  );
}
