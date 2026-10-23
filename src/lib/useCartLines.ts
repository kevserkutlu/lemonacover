"use client";

import { describeOptions, priceFor, type Product } from "@/data/products";
import { shippingFor } from "@/data/site";
import { useCatalog } from "./CatalogProvider";
import { useCart, type CartItem } from "./cart";

export type CartLine = {
  item: CartItem;
  product?: Product; // özel istekte yok
  name: string;
  href: string;
  details: string[];
  unitPrice: number;
  lineTotal: number;
};

export function useCartLines() {
  const cart = useCart();
  const { getProduct, shipping: fee } = useCatalog();
  const lines: CartLine[] = [];
  for (const item of cart.items) {
    if (item.request) {
      const r = item.request;
      lines.push({
        item,
        name: "Özel istek kılıf",
        href: `/istek/?kod=${r.code}`,
        details: r.details,
        unitPrice: r.price,
        lineTotal: r.price * item.qty,
      });
      continue;
    }
    const product = getProduct(item.slug);
    if (!product) continue;
    const unitPrice = priceFor(product, item.options);
    const details = describeOptions(product, item.options);
    details.unshift(`Ajanda: ${item.agenda.name}`);
    if (item.custom)
      details.push(`Ölçü: ${item.custom.en} × ${item.custom.boy} cm, sırt ${item.custom.sirt} cm`);
    lines.push({
      item,
      product,
      name: product.name,
      href: `/urun/${product.slug}`,
      details,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = shippingFor(subtotal, fee);
  return { ...cart, lines, subtotal, shipping, total: subtotal + shipping };
}
