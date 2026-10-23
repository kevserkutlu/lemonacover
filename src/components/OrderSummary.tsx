"use client";

import { formatTL } from "@/data/site";

export default function OrderSummary({
  subtotal,
  shipping,
  total,
  children,
}: {
  subtotal: number;
  shipping: number;
  total: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel" style={{ display: "grid", gap: 10 }}>
      <div className="summary-row">
        <span>Ürünler</span>
        <span>{formatTL(subtotal)}</span>
      </div>
      <div className="summary-row">
        <span>Kargo</span>
        <span>{formatTL(shipping)}</span>
      </div>
      <div className="summary-row summary-row--total">
        <span>Toplam</span>
        <span>{formatTL(total)}</span>
      </div>
      {children}
    </div>
  );
}
