"use client";

import { useEffect, useState } from "react";
import { softStarPath } from "@/lib/star";

const STAR = softStarPath(30, 32, 28);

// Sağ altta, logodaki gibi yuvarlak köşeli yıldız: sayfanın başına kayarak döner.
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`to-top ${visible ? "is-visible" : ""}`}
      aria-label="Sayfanın başına dön"
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <path d={STAR} fill="#e8d3a9" stroke="#26232c" strokeWidth="1.8" strokeLinejoin="round" />
        <path
          d="M30 42 V24 M22.5 31 L30 23.5 L37.5 31"
          fill="none"
          stroke="#26232c"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
