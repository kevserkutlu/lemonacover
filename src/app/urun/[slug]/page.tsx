import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalogServer";
import ProductView from "../ProductView";

// Her ilanın sayfası build sırasında, veritabanındaki ürünlerle (API → GET /katalog)
// hazırlanır: Google ve WhatsApp/Instagram bağlantı önizlemeleri ürünün adını ve
// fotoğrafını görür. Tarayıcıda açılınca fiyat ve fotoğraflar API'den tazelenir.
// Build'den sonra eklenen ilanlar /urun/?id=<slug> sayfasından açılır.

export const dynamicParams = false;

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).products.find((x) => x.slug === slug);
  if (!p) return {};
  const kind = p.kilif === "simli" ? "simli" : "şeffaf";
  return {
    title: `${p.name} ${kind} kılıfı`,
    description: p.description,
    openGraph: p.images[0] ? { images: [p.images[0]] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getCatalog()).products.some((p) => p.slug === slug)) notFound();
  return <ProductView slug={slug} />;
}
