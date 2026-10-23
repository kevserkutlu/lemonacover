"use client";

// Ürün fotoğrafı: köşeleri yuvarlatılmış, etrafında teşekkür kartındaki elips
// çizgileri gibi ince kalemle elle çizilmiş birkaç halka.
//  • Halkalar ortak bir dalgayı izler (birbirleriyle uyumlu), ama her birinin
//    kendi kıpırtısı da var: aralarındaki boşluk yer yer açılır, daralır.
//  • Kalem kâğıttan kalkmadan bir tur atmış gibi: bitiş başlangıcı biraz geçer
//    ve tam üstüne oturmaz.
// Her fotoğrafın çizgileri farklı (useId'den türeyen tohum), ama sayfa her
// açıldığında aynı.

import { useEffect, useId, useRef } from "react";

const OUT = 26; // çizgilerin fotoğraf kenarından en fazla taşabileceği mesafe (px)

// içten dışa halkalar: ortalama uzaklık, kendi dalgasının genliği, kalınlık, koyuluk
const LOOPS = [
  { d: 6.5, amp: 2.2, w: 1, o: 0.8 },
  { d: 11.5, amp: 3, w: 0.85, o: 0.62 },
  { d: 17, amp: 3.6, w: 0.75, o: 0.48 },
];

function rng(seedText: string) {
  let a = 2166136261;
  for (const ch of seedText) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Wave = { k: number; phase: number; amp: number };
type LoopParams = { start: number; overshoot: number; drift: number; own: Wave[] };

// Köşeleri yuvarlatılmış dikdörtgenin çevresinde s uzunluğundaki nokta ve dışa bakan normal
function roundRect(W: number, H: number, R: number) {
  const sw = W - 2 * R;
  const sh = H - 2 * R;
  const arc = (Math.PI * R) / 2;
  const total = 2 * sw + 2 * sh + 4 * arc;
  const corner = (cx: number, cy: number, a0: number, u: number) => {
    const a = a0 + (u / arc) * (Math.PI / 2);
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
  };
  const at = (s0: number) => {
    let s = ((s0 % total) + total) % total;
    if (s < sw) return { x: R + s, y: 0, nx: 0, ny: -1 };
    s -= sw;
    if (s < arc) return corner(W - R, R, -Math.PI / 2, s);
    s -= arc;
    if (s < sh) return { x: W, y: R + s, nx: 1, ny: 0 };
    s -= sh;
    if (s < arc) return corner(W - R, H - R, 0, s);
    s -= arc;
    if (s < sw) return { x: W - R - s, y: H, nx: 0, ny: 1 };
    s -= sw;
    if (s < arc) return corner(R, H - R, Math.PI / 2, s);
    s -= arc;
    if (s < sh) return { x: 0, y: H - R - s, nx: -1, ny: 0 };
    s -= sh;
    return corner(R, R, Math.PI, s);
  };
  return { total, at };
}

const wave = (w: Wave, t: number) => w.amp * Math.sin(2 * Math.PI * (w.k * t + w.phase));

export default function PhotoFrame({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const photo = photoRef.current;
    if (!svg || !photo) return;
    const paths = [...svg.querySelectorAll("path")];

    const rand = rng(id);
    const r = (min: number, max: number) => min + rand() * (max - min);
    // tüm halkaların birlikte izlediği yavaş dalga → uyum
    const shared: Wave[] = [
      { k: 2, phase: rand(), amp: r(1.6, 2.6) },
      { k: 3, phase: rand(), amp: r(0.5, 1) },
    ];
    const loops: LoopParams[] = LOOPS.map((l) => ({
      start: rand(),
      overshoot: r(0.04, 0.09),
      drift: r(1.5, 3.2) * (rand() < 0.5 ? -1 : 1),
      own: [
        { k: 1, phase: rand(), amp: l.amp * r(0.5, 0.8) },
        { k: Math.round(r(3, 5)), phase: rand(), amp: l.amp * r(0.3, 0.5) },
      ],
    }));

    const draw = () => {
      const W = photo.offsetWidth;
      const H = photo.offsetHeight;
      if (!W || !H) return;
      const radius = parseFloat(getComputedStyle(photo).borderTopLeftRadius) || 0;
      // halkalar fotoğraftan daha yuvarlak dönsün (elips hissi)
      const R = Math.min(radius + 24, W / 2 - 1, H / 2 - 1);
      const rr = roundRect(W, H, R);
      svg.setAttribute("viewBox", `${-OUT} ${-OUT} ${W + 2 * OUT} ${H + 2 * OUT}`);
      LOOPS.forEach((l, i) => {
        const p = loops[i];
        const span = 1 + p.overshoot;
        const steps = Math.ceil((rr.total * span) / 4);
        let d = "";
        for (let j = 0; j <= steps; j++) {
          const u = (j / steps) * span; // 0 → 1+overshoot (bir tur ve biraz fazlası)
          const t = p.start + u;
          const off =
            l.d +
            shared.reduce((s, w) => s + wave(w, t), 0) +
            p.own.reduce((s, w) => s + wave(w, t), 0) +
            p.drift * (u / span - 0.5); // bitiş başlangıcın üstüne tam oturmasın
          const pt = rr.at(t * rr.total);
          d += `${j ? "L" : "M"}${(pt.x + pt.nx * off).toFixed(1)} ${(pt.y + pt.ny * off).toFixed(1)}`;
        }
        paths[i]?.setAttribute("d", d);
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(photo);
    return () => ro.disconnect();
  }, [id]);

  return (
    <div className={`pf ${className}`} style={style}>
      <svg ref={svgRef} className="pf__lines" aria-hidden="true">
        {LOOPS.map((l, i) => (
          <path key={i} strokeWidth={l.w} strokeOpacity={l.o} />
        ))}
      </svg>
      <div ref={photoRef} className="pf__photo">
        {children}
      </div>
    </div>
  );
}
