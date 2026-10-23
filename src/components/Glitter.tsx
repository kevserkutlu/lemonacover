"use client";

import { useEffect, useRef } from "react";
import { starPath } from "@/lib/star";

// Yıldız yağmuru.
// - "lemona:rain"  → ekranın üstünden yıldızlar süzülerek düşer (ana sayfaya ilk giriş, sipariş onayı)
// - "lemona:burst" → verilen noktadan küçük yıldızlar saçılır (tıklama, sepete ekleme)

type Star = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  spin: number; // kendi ekseninde dönerken genişliği
  vs: number;
  sway: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
};

// teşekkür kartının açık tonları; logo yıldızının rengi baskın
const COLORS = ["#e8d3a9", "#e8d3a9", "#e8d3a9", "#f0ccd8", "#fbfaf3", "#e2dbc8", "#c9cbe0"];
// gölge hep aynı yöne düşer (ekranda sağ alta), yıldız dönse de
const SHADOW = "rgba(38, 35, 44, 0.16)";
const SHADOW_X = 1.6;
const SHADOW_Y = 2.2;

export function rain() {
  window.dispatchEvent(new CustomEvent("lemona:rain"));
}
export function burst(x: number, y: number, amount = 18) {
  window.dispatchEvent(new CustomEvent("lemona:burst", { detail: { x, y, amount } }));
}

export default function Glitter() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    // yarıçapı 10 olan tek yıldız; her yıldız bunu ölçekleyerek çizer
    const shape = new Path2D(starPath(0, 0, 10));
    let stars: Star[] = [];
    let raf = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const make = (p: Partial<Star>): Star => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.05,
      spin: Math.random() * Math.PI * 2,
      vs: 0.03 + Math.random() * 0.05,
      sway: Math.random() * Math.PI * 2,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 0,
      maxLife: 300,
      gravity: 0.03,
      drag: 0.99,
      ...p,
    });

    const loop = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const h = window.innerHeight;
      stars = stars.filter((s) => s.life < s.maxLife && s.y < h + 30);
      for (const s of stars) {
        s.life++;
        s.vy += s.gravity;
        s.vx *= s.drag;
        s.vy *= s.drag;
        s.sway += 0.035;
        s.x += s.vx + Math.sin(s.sway) * 0.5;
        s.y += s.vy;
        s.rot += s.vr;
        s.spin += s.vs;

        const fade = Math.min(1, (s.maxLife - s.life) / 40, s.life / 8);
        const k = s.size / 10;
        const sx = k * Math.max(0.35, Math.abs(Math.cos(s.spin))); // kendi etrafında döner gibi
        for (const shadow of [true, false]) {
          ctx.save();
          ctx.translate(s.x + (shadow ? SHADOW_X : 0), s.y + (shadow ? SHADOW_Y : 0));
          ctx.rotate(s.rot);
          ctx.scale(sx, k);
          ctx.globalAlpha = fade;
          ctx.fillStyle = shadow ? SHADOW : s.color;
          ctx.fill(shape);
          ctx.restore();
        }
      }
      if (stars.length) raf = requestAnimationFrame(loop);
      else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        raf = 0;
      }
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onRain = () => {
      const w = window.innerWidth;
      const n = Math.round(Math.min(110, w / 11));
      for (let i = 0; i < n; i++) {
        stars.push(
          make({
            x: Math.random() * w,
            y: -20 - Math.random() * window.innerHeight * 0.7,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 1.4 + Math.random() * 1.6,
            gravity: 0.015,
            drag: 0.995,
            size: 5 + Math.random() * 8,
            maxLife: 460 + Math.random() * 180,
          }),
        );
      }
      start();
    };

    const onBurst = (e: Event) => {
      const { x, y, amount = 18 } = (e as CustomEvent).detail;
      for (let i = 0; i < amount; i++) {
        // çoğunlukla yukarı doğru, yelpaze gibi açılsın
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
        const sp = 2.5 + Math.random() * 4;
        stars.push(
          make({
            x,
            y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            gravity: 0.14,
            drag: 0.96,
            size: 4 + Math.random() * 5,
            vr: (Math.random() - 0.5) * 0.2,
            maxLife: 80 + Math.random() * 50,
          }),
        );
      }
      start();
    };

    // Sayfada her dokunuşta/tıklamada (buton, bağlantı, boş yer) yıldız saçılır.
    // "click" yerine pointer olayları: iOS'ta boş alana dokunmak click üretmeyebiliyor.
    // İstisnalar: yazı alanları, sürükleme/kaydırma, kendi yıldızını saçan
    // öğeler (data-burst="0"). data-burst="14" gibi bir değer miktarı belirler.
    let down: { x: number; y: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = e.isPrimary && e.button === 0 ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || d.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return; // sürükleme
      const t = e.target as Element | null;
      if (!t || t.closest("input, textarea, select, [contenteditable]")) return;
      const host = t.closest<HTMLElement>("[data-burst]");
      const amount = host ? Number(host.dataset.burst) : 10;
      if (!amount) return;
      onBurst(new CustomEvent("x", { detail: { x: e.clientX, y: e.clientY, amount } }));
    };
    const onCancel = () => (down = null);

    window.addEventListener("lemona:rain", onRain);
    window.addEventListener("lemona:burst", onBurst);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("lemona:rain", onRain);
      window.removeEventListener("lemona:burst", onBurst);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, []);

  return <canvas ref={ref} className="glitter-canvas" aria-hidden="true" />;
}
