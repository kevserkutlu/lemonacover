"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

export default function Header() {
  const { count, ready, lastAdded } = useCart();
  const path = usePathname();
  const [compact, setCompact] = useState(false);

  // aşağı kaydırınca başlık küçülür
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cur = (p: string) => (path === p || path.startsWith(p + "/") ? "page" : undefined);

  return (
    <header className={`site-header ${compact ? "is-compact" : ""}`}>
      <div className="wrap site-header__inner">
        <nav className="nav" aria-label="Ana menü">
          <Link href="/#kiliflar">Kılıflar</Link>
          <Link href="/siparis-takip" className="nav__hide-sm" aria-current={cur("/siparis-takip")}>
            Sipariş takibi
          </Link>
        </nav>
        <Link href="/" className="logo" aria-label="lemona cover ana sayfa">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marka/logo.png" alt="" width={214} height={203} />
          <span className="logo__name">lemona cover</span>
        </Link>
        <nav className="nav nav--right" aria-label="Sepet">
          <Link href="/sepet" className="nav__cart" aria-current={cur("/sepet")} id="cart-link">
            Sepet
            <span
              // her eklemede yeniden çizilir, böylece zıplama animasyonu baştan oynar
              key={lastAdded}
              className={`nav__count ${lastAdded ? "bump" : ""}`} aria-label={`${count} ürün`}>
              {ready ? count : 0}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
