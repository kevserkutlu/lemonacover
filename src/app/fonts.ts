import { Figtree, Old_Standard_TT, Spectral } from "next/font/google";

// Ana font
export const oldStandard = Old_Standard_TT({
  variable: "--font-old-standard",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

// Küçük arayüz metinleri (form etiketleri, ipuçları, butonlar)
export const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
});

// Yorumlar
export const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin", "latin-ext"],
  weight: "300",
});

export const fontVariables = [oldStandard, figtree, spectral]
  .map((f) => f.variable)
  .join(" ");
