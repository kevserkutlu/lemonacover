"use client";

// Ana sayfadaki perde.
//
// Sayfa açıldığında perde ortada kapalıdır. Sonra sanki biri bağ noktasından
// kumaşı avucuna toplayıp yana çekiyormuş gibi açılır:
//  • bağ noktası ortadan yavaşça kenara doğru gider,
//  • perdenin tepesi kornişte ortadan ayrılır ama bir yerde durur
//    (kornişte daha öteye gidemez),
//  • el toplamaya devam ettiği için tepeyle bağ arasındaki kumaş ortaya
//    doğru bombeleşir.
// Bağın altından sayfanın en altına kadar dar (sıkıştırılmış) devam eder.
// Bağ: burgulu ip ve püskül.

import { useEffect, useRef } from "react";
import styles from "./Curtains.module.css";

const INK = "#26232c";
const FABRIC = "#e2dbc8";
const TAN = "#e8d3a9";
const NS = { vectorEffect: "non-scaling-stroke" as const };

/* ---------- animasyon zamanlaması ---------- */
const DELAY = 250; // ms, sayfa açıldıktan sonra
const DURATION = 2300; // ms
const TOP_START = 0.1; // tepe, el çekmeye başladıktan biraz sonra kımıldar
const TOP_STOP = 0.75; // ve bu noktada kornişte durur; el çekmeye devam eder
const FOLDS = [0.16, 0.34, 0.52, 0.7, 0.86];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Geo = { center: number; topW: number; lowW: number; H: number };

// p: 0 (kapalı) → 1 (bağlı). Sol perdenin iç kenarı ve kıvrımları, piksel cinsinden.
function shape(p: number, g: Geo) {
  // bağ noktası (avuç) önden gider; tepe geriden gelip kornişte durur
  const tieProgress = 0.5 * easeInOut(p) + 0.5 * (1 - (1 - p) ** 2); // başta daha hızlı
  const xTie = lerp(g.center, g.lowW, tieProgress);
  const xTop = lerp(g.center, g.topW, easeInOut(clamp01((p - TOP_START) / (TOP_STOP - TOP_START))));
  // tepe durduktan sonra el çekmeye devam ettikçe kumaş ortaya doğru bombeleşir
  const bulge = g.topW * 0.22 * easeInOut(clamp01((p - TOP_STOP + 0.1) / (1 - TOP_STOP + 0.1)));
  const curve = (k: number) => {
    const t = xTop * k;
    const b = xTie * k;
    const c1x = t + bulge * 0.55 * k;
    const c2x = b + (t - b) * 0.88 + bulge * k;
    return `M${t.toFixed(1)} 0 C ${c1x.toFixed(1)} ${(g.H * 0.3).toFixed(1)}, ${c2x.toFixed(1)} ${(g.H * 0.74).toFixed(1)}, ${b.toFixed(1)} ${g.H}`;
  };
  const edge = curve(1);
  return {
    xTie,
    fill: `${edge} L0 ${g.H} L0 0 Z`,
    edge,
    folds: FOLDS.map(curve),
  };
}

/* ---------- bağın altı: dar kısım ---------- */
// Kıvrımlar üst kısımla aynı oranlarda (FOLDS): bağ noktasında üstteki çizgilerin
// bittiği yerden başlarlar, böylece perde kapalıyken de açılırken de hizalı kalır.
function Lower() {
  return (
    <svg className={styles.fill} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke={INK} strokeOpacity="0.32" strokeWidth="1.2">
        {FOLDS.map((k, i) => {
          const x = k * 100;
          const sway = i % 2 ? 1.5 : -1.5;
          return <path key={k} d={`M${x} 0 C ${x + sway} 35, ${x - sway} 70, ${x} 100`} {...NS} />;
        })}
      </g>
    </svg>
  );
}

function Hem() {
  return (
    <svg className={styles.fill} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 0 H100 V8 Q 92 20 84 9 Q 76 20 68 9 Q 60 20 52 9 Q 44 20 36 9 Q 28 20 20 9 Q 12 20 4 9 L0 10 Z"
        fill={FABRIC}
      />
      <path
        d="M100 0 V8 Q 92 20 84 9 Q 76 20 68 9 Q 60 20 52 9 Q 44 20 36 9 Q 28 20 20 9 Q 12 20 4 9 L0 10"
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
        {...NS}
      />
    </svg>
  );
}

/* ---------- bağ: burgulu ip ve ten rengi püskül ---------- */
// 160×70 alanda; ip soldan sağa perdeyi sarar, püskül sayfanın ortasına bakan tarafta.
const ink = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Tie() {
  return (
    <div className={styles.tie}>
      <svg className={styles.tieSvg} viewBox="0 0 160 70" aria-hidden="true">
        <g {...ink}>
          <path d="M8 32 C 50 26, 96 28, 124 34" fill="none" strokeWidth="3.2" stroke={INK} />
          <path d="M8 32 C 50 26, 96 28, 124 34" fill="none" strokeWidth="1.6" stroke={TAN} strokeDasharray="5 4" />
          <path d="M124 34 C 132 36, 134 40, 132 44" fill="none" />
          <circle cx="132" cy="46" r="5" fill={TAN} />
          <path d="M126 50 H 138 L 142 68 H 122 Z" fill={TAN} />
          <path d="M126 54 L 124 68 M130 54 L 129 68 M134 54 L 135 68 M138 54 L 140 68" fill="none" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}

/* ---------- bir yan ---------- */
// İlk çizim (statik HTML): kapalı perde. Tarayıcıda gerçek ölçülerle yeniden çizilir.
function Side({ right = false }: { right?: boolean }) {
  return (
    <div className={`${styles.side} ${right ? styles.right : styles.left}`} data-side>
      <svg className={styles.upper} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" data-part="svg">
        <path d="M100 0 L100 100 L0 100 L0 0 Z" fill={FABRIC} filter="url(#lc-grain)" data-part="fill" />
        <g fill="none" stroke={INK} strokeOpacity="0.32" strokeWidth="1.2">
          {FOLDS.map((k) => (
            <path key={k} d={`M${k * 100} 0 L${k * 100} 100`} data-part="fold" {...NS} />
          ))}
        </g>
        <path d="M100 0 L100 100" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" data-part="edge" {...NS} />
      </svg>
      <div className={styles.lower} data-part="lower">
        <Tie />
        <Lower />
        <div className={styles.hem}>
          <Hem />
        </div>
      </div>
    </div>
  );
}

export default function Curtains() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let p = 0;
    let raf = 0;
    let start = 0;
    const sides = [...el.querySelectorAll<HTMLElement>("[data-side]")].map((side) => ({
      svg: side.querySelector<SVGSVGElement>('[data-part="svg"]'),
      fill: side.querySelector<SVGPathElement>('[data-part="fill"]'),
      edge: side.querySelector<SVGPathElement>('[data-part="edge"]'),
      folds: [...side.querySelectorAll<SVGPathElement>('[data-part="fold"]')],
      lower: side.querySelector<HTMLElement>('[data-part="lower"]'),
    }));

    const geo = (): Geo => {
      const vw = el.clientWidth;
      const topW = Math.min(290, Math.max(84, vw * 0.2));
      const H = sides[0]?.svg?.getBoundingClientRect().height ?? 500;
      return { center: vw * 0.505, topW, lowW: topW * 0.33, H };
    };

    const draw = () => {
      const g = geo();
      const s = shape(p, g);
      for (const side of sides) {
        side.svg?.setAttribute("viewBox", `0 0 ${g.center.toFixed(1)} ${g.H.toFixed(1)}`);
        side.fill?.setAttribute("d", s.fill);
        side.edge?.setAttribute("d", s.edge);
        side.folds.forEach((f, i) => f.setAttribute("d", s.folds[i]));
        if (side.lower) side.lower.style.width = `${s.xTie.toFixed(1)}px`;
      }
      el.dataset.state = p >= 0.9 ? "bagli" : "aciliyor";
    };

    const tick = (now: number) => {
      if (!start) start = now;
      p = clamp01((now - start - DELAY) / DURATION);
      draw();
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      p = 1;
      draw();
    } else {
      draw();
      raf = requestAnimationFrame(tick);
    }

    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={root} className={`${styles.root} lc-curtains`} data-state="kapali" aria-hidden="true">
      <svg className={styles.rod} viewBox="0 0 1200 30" preserveAspectRatio="none">
        <path d="M14 15 H1186" fill="none" stroke={INK} strokeWidth="2" {...NS} />
      </svg>
      <span className={`${styles.finial} ${styles.finialL}`} />
      <span className={`${styles.finial} ${styles.finialR}`} />

      <Side />
      <Side right />
    </div>
  );
}
