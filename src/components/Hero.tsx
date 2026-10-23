"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useCatalog } from "@/lib/CatalogProvider";
import { rain } from "./Glitter";
import PhotoFrame from "./PhotoFrame";
import styles from "./Hero.module.css";

// Girişteki fotoğraf: ilanların kapak fotoğrafları sırayla değişir. Şeffaf seçiliyken
// sadece şeffaf, Simli seçiliyken sadece simli ilanlar; fotoğrafa (ya da altındaki
// ada) dokununca o ilan açılır. Üzerine gelince durur, "hareketi azalt" açıksa dönmez.
const ROTATE_MS = 3800;
const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export default function Hero() {
  const [simli, setSimli] = useState(false);
  const [entered, setEntered] = useState(false);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const photo = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

  const { products, productHref } = useCatalog();
  const covers = useMemo(() => {
    const of = (kind: "seffaf" | "simli") =>
      products
        .filter((p) => p.kilif === kind && p.images.length > 0)
        .map((p) => ({ src: p.images[0], name: p.name, href: productHref(p), slug: p.slug }));
    return { seffaf: of("seffaf"), simli: of("simli") };
  }, [products, productHref]);
  const list = covers[simli ? "simli" : "seffaf"];
  const at = list.length ? idx % list.length : 0;
  const active = list[at];

  useEffect(() => {
    if (list.length < 2 || paused || reduced) return;
    const t = setInterval(() => setIdx((n) => n + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, [list.length, paused, reduced, simli]);

  const choose = (next: boolean) => {
    setSimli(next);
    setIdx(0);
  };

  // fareyle üzerine gelince fotoğraf hafifçe eğilir, ışık yansıması imleci takip eder
  const onMove = (e: React.PointerEvent) => {
    const el = photo.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--rx", `${((px - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((0.5 - py) * 9).toFixed(2)}deg`);
  };
  const onLeave = () => {
    const el = photo.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("lemona-rain") === "1";
      sessionStorage.setItem("lemona-rain", "1");
    } catch {}
    if (!seen) {
      const t = setTimeout(rain, 350);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <section className={styles.hero}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`${styles.corner} ${styles.cornerTl}`} src="/marka/yildiz-sol-ust.png" alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`${styles.corner} ${styles.cornerBr}`} src="/marka/yildiz-sag-alt.png" alt="" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1>
            Şeffaf
            <br />
            ajanda kılıfı
          </h1>
          <p className="ornament" aria-hidden="true">☆</p>
          <p className={styles.lead}>
            Her kılıfı ajandanın modeline göre ölçüp elde dikiyorum. Modelini
            seç, şeffaf mı simli mi olsun söyle, gerisini bana bırak.
          </p>
          <div className={styles.actions}>
            <a className="btn" href="#kiliflar">Ajandanı seç</a>
            <a className="btn btn--ghost" href="#yorumlar">Yorumları oku</a>
          </div>
        </div>

        <div className={styles.stage}>
          <div
            ref={photo}
            className={`${styles.photo} ${entered ? styles.entered : ""} ${simli ? styles.isSimli : ""}`}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
          >
            <PhotoFrame className={styles.photoCard}>
              <Link
                href={active?.href ?? "#kiliflar"}
                className={styles.frame}
                aria-label={active ? `${active.name} ${simli ? "simli" : "şeffaf"} kılıf — ilana git` : "Kılıflara git"}
                onPointerEnter={() => setPaused(true)}
                onPointerLeave={() => setPaused(false)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
              >
                {list.length ? (
                  list.map((c, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={c.slug}
                      src={c.src}
                      alt=""
                      className={styles.shot}
                      data-on={i === at}
                      loading={i === at || i === (at + 1) % list.length ? "eager" : "lazy"}
                      decoding="async"
                    />
                  ))
                ) : (
                  // ilan fotoğrafı yoksa giriş fotoğrafları
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/marka/giris-seffaf.webp" alt="" className={styles.shot} data-on={!simli} width={717} height={956} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/marka/giris-simli.webp" alt="" className={styles.shot} data-on={simli} width={717} height={956} />
                  </>
                )}
                <span className={styles.glare} aria-hidden="true" />
                {/* simli seçiliyken fotoğrafın üstünde hafif parıltı */}
                <span className={styles.sparkle} aria-hidden="true" />
              </Link>
            </PhotoFrame>
          </div>
          {active ? (
            <Link href={active.href} className={styles.caption}>
              {active.name}
            </Link>
          ) : null}
          <div className={styles.switch} role="radiogroup" aria-label="Kılıf türü">
            {/* yıldızları Glitter saçar: her iki yöne geçişte de aynı */}
            <button
              type="button"
              role="radio"
              aria-checked={!simli}
              data-burst="14"
              onClick={() => choose(false)}
            >
              Şeffaf
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={simli}
              data-burst="14"
              onClick={() => choose(true)}
            >
              Simli
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
