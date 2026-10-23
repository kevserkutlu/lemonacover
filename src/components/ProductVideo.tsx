"use client";

// Ürün videosu (simlerin parıltısı için). Fotoğraf gibi sessiz ve döngüde oynar.
// İki kaynak: HEVC (daha küçük dosya, aynı kalite) oynatabilen tarayıcı onu, diğerleri
// H.264 kopyasını seçer. "Hareketi azalt" açıksa kendiliğinden oynamaz.

import { useRef, useState, useSyncExternalStore } from "react";

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

export default function ProductVideo({ name, poster, label }: { name: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);
  const [paused, setPaused] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div className="product-video">
      <video
        ref={ref}
        poster={poster}
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      >
        <source src={`${name}.mp4`} type='video/mp4; codecs="hvc1.1.6.L120.90"' />
        <source src={`${name}-h264.mp4`} type="video/mp4" />
      </video>
      <button type="button" className="product-video__toggle" onClick={toggle} aria-label={paused || reduced ? "Videoyu oynat" : "Videoyu durdur"}>
        {paused || reduced ? "▶" : "❚❚"}
      </button>
    </div>
  );
}
