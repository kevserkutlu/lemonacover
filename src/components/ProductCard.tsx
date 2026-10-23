"use client";

import Link from "next/link";
import { KILIF_LABEL, type Product } from "@/data/products";
import { formatTL } from "@/data/site";
import { useCatalog } from "@/lib/CatalogProvider";
import PhotoFrame from "./PhotoFrame";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }: { product: Product }) {
  const { productHref } = useCatalog();
  return (
    <Link href={productHref(product)} className="card">
      <div className="card__media">
        <PhotoFrame>
          <ProductImage product={product} />
        </PhotoFrame>
      </div>
      <div>
        <div className="card__meta">
          <span className="card__name">{product.name}</span>
          <span className="card__price">
            {formatTL(product.basePrice)}
          </span>
        </div>
        <span className="card__sub">
          {product.size} · <span className="card__kind" data-kind={product.kilif}>{KILIF_LABEL[product.kilif]}</span>
        </span>
      </div>
    </Link>
  );
}
