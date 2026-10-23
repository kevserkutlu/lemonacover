// Sitedeki yıldız: klasik 5 köşeli yıldız, beş ucu yay gibi yuvarlatılmış.
// Yağan yıldızlar ve yorumlardaki profil yıldızları bunu kullanır.

export type StarShape = {
  inner: number; // iç köşelerin dış köşelere oranı
  tip: number; // uçların yuvarlaklığı (0–0.5); uçlar yay (kübik eğri) ile kapanır
  valley: number; // iç köşelerin yuvarlaklığı
};

export const STAR: StarShape = { inner: 0.52, tip: 0.36, valley: 0.14 };

export function starPath(cx: number, cy: number, R: number, shape: StarShape = STAR, rot = 0) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (rot * Math.PI) / 180 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? R : R * shape.inner;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const f = (n: number) => n.toFixed(2);
  let d = "";
  for (let i = 0; i < 10; i++) {
    const p = pts[i];
    const prev = pts[(i + 9) % 10];
    const next = pts[(i + 1) % 10];
    const tip = i % 2 === 0;
    const t = tip ? shape.tip : shape.valley;
    const a = [p[0] + (prev[0] - p[0]) * t, p[1] + (prev[1] - p[1]) * t];
    const b = [p[0] + (next[0] - p[0]) * t, p[1] + (next[1] - p[1]) * t];
    d += `${i === 0 ? "M" : "L"}${f(a[0])} ${f(a[1])} `;
    if (tip) {
      // uç: kontrol noktaları köşeye yakın kübik eğri → top gibi yuvarlak uç
      const k = 0.69;
      d += `C${f(a[0] + (p[0] - a[0]) * k)} ${f(a[1] + (p[1] - a[1]) * k)} ${f(b[0] + (p[0] - b[0]) * k)} ${f(b[1] + (p[1] - b[1]) * k)} ${f(b[0])} ${f(b[1])} `;
    } else {
      d += `Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])} `;
    }
  }
  return d + "Z";
}

/** Eski çağrılar için (yukarı çık butonu). */
export function softStarPath(cx: number, cy: number, R: number, rot = 0) {
  return starPath(cx, cy, R, STAR, rot);
}
