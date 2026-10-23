"use client";

import { mediaSource, type Product } from "@/data/products";
import { useCatalog } from "@/lib/CatalogProvider";

// Ürün fotoğrafını gösterir. Bu kılıf türünün fotoğrafı yoksa aynı ajandanın diğer
// türünün fotoğrafı; hiç yoksa logolu bir "fotoğraf yakında" kartı.
export default function ProductImage({
  product: own,
  index = 0,
  sizes = "(max-width: 700px) 100vw, 320px",
}: {
  product: Product;
  index?: number;
  sizes?: string;
}) {
  const { products } = useCatalog();
  const product = mediaSource(products, own);
  const file = product.images[index];
  // fotoğrafı olmayan ama videosu olan ilanda videonun kapak karesi gösterilir
  const poster = !product.images.length && product.videos.length ? `${product.videos[0]}.webp` : null;
  if (poster && index === 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt={`${product.name} için diktiğim kılıf`} decoding="async" />
    );
  }
  if (file) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file}
        alt={`${product.name} için diktiğim ${product.kilif === "simli" ? "simli" : "şeffaf"} kılıf`}
        sizes={sizes}
        loading={index === 0 ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }
  return (
    <div className="photo-soon">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marka/logo.png" alt="" width={214} height={203} />
      <span>Fotoğraf yakında</span>
    </div>
  );
}
