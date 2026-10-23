"use client";

import { useEffect, useRef, useState } from "react";
import { rain } from "@/components/Glitter";
import styles from "./order.module.css";

// Sipariş tamamlanınca teşekkür kartını ekrana getirir (sadece ilk açılışta).
export default function Celebrate() {
  // ödeme sayfasından ?yeni=1 ile gelindiyse kart açık başlar
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has("yeni"));
  const [isNew] = useState(open);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(rain, 250);
    // sayfa yenilenince kart tekrar açılmasın
    const url = new URL(window.location.href);
    url.searchParams.delete("yeni");
    window.history.replaceState(null, "", url.toString());
    return () => clearTimeout(t);
  }, [isNew]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Teşekkür kartı"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className={styles.cardWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marka/tesekkur-karti.webp"
          width={1228}
          height={865}
          className={styles.card}
          alt="Beni desteklediğiniz için teşekkür ederim! Güzel günlerde kullanmanız dileğiyle. (Ajandanızın yağmurluklu fotolarını benimle de paylaşmayı unutmayın!)"
        />
        <button ref={closeRef} className="btn" onClick={() => setOpen(false)}>
          Siparişime bak
        </button>
      </div>
    </div>
  );
}
