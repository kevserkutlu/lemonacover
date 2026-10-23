import type { NextConfig } from "next";

// Site tamamen statik olarak dışa aktarılır: `npm run build` → out/ klasörü.
// Bu klasör herhangi bir statik barındırmaya (Netlify, Cloudflare Pages,
// GitHub Pages, cPanel vb.) olduğu gibi yüklenebilir. Sunucu kodu yok.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // /urun/prev-a5/ → out/urun/prev-a5/index.html
  images: { unoptimized: true },
};

export default nextConfig;
