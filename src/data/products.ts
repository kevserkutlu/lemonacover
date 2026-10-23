// Ürün tipleri ve ürünle ilgili hesaplar (fiyat, seçenek açıklaması, fotoğraf sırası).
//
// Ürünlerin kendisi burada DEĞİL: tek kaynak veritabanı. Site ürünleri, fiyatları,
// fotoğrafları, kargo ücretini ve kuralları PHP API'den (GET /katalog) alır:
// sayfalar build sırasında bu veriyle hazırlanır, tarayıcı da sayfa açılınca
// güncelini çeker (src/lib/catalog.ts). Sipariş fiyatını API yeniden hesaplar.
//
// Şeffaf ve simli kılıflar ayrı ilan (ayrı sayfa, ayrı fotoğraflar). Aynı ajandanın
// iki ilanı aynı "grup"u taşır; ürün sayfasındaki Şeffaf/Simli düğmesi diğerine geçer.
//
// Ajandanın rengi/tonu seçenek olarak sorulmuyor: müşteri ürün sayfasında
// ajandasının tam adını (renk ve desen dahil) yazıyor, isterse görsel ekliyor.

export type OptionChoice = {
  value: string;
  label: string;
  priceDelta?: number; // TL, temel fiyata eklenir
};

export type ProductOption = {
  id: string;
  label: string;
  hint?: string;
  choices: OptionChoice[];
};

export type Kilif = "seffaf" | "simli";

export const KILIF_LABEL: Record<Kilif, string> = { seffaf: "Şeffaf", simli: "Simli" };

export type Brand = { id: string; name: string };

export type Product = {
  slug: string;
  grup: string; // aynı ajandanın şeffaf ve simli ilanları aynı grupta
  kilif: Kilif;
  marka: string; // Brand.id (filtre için)
  name: string; // ajanda modeli
  brand: string; // görünen marka adı
  size: string;
  basePrice: number; // bu ilanın fiyatı
  description: string;
  agendaExample: string; // "ajandanın tam adı" alanındaki örnek
  images: string[]; // fotoğraf adresleri; ilki kapak
  videos: string[]; // video adresinin kökü: <kök>.mp4 (HEVC), <kök>-h264.mp4, <kök>.webp (kapak)
  options: ProductOption[];
  customSize?: boolean; // özel ölçü alanlarını gösterir
};

export type Media = { kind: "image"; src: string } | { kind: "video"; name: string; poster: string };

/** Ürün sayfasındaki sıra: kapak fotoğrafı, videolar, diğer fotoğraflar */
export function mediaOf(product: Product): Media[] {
  const img = (src: string): Media => ({ kind: "image", src });
  const vids = product.videos.map((v): Media => ({ kind: "video", name: v, poster: `${v}.webp` }));
  return [...product.images.slice(0, 1).map(img), ...vids, ...product.images.slice(1).map(img)];
}

export const hasMedia = (p: Product) => p.images.length > 0 || p.videos.length > 0;

/**
 * Fotoğrafı/videosu gösterilecek ilan. Bir kılıf türünün (ör. şeffaf) fotoğrafı yoksa
 * ilan ana sayfada ayrı kart olarak görünmez; ürün sayfasında o tür seçilse de
 * diğer türün (ör. simli) fotoğrafları kalır, sadece fiyat değişir.
 */
export function mediaSource(products: Product[], product: Product) {
  if (hasMedia(product)) return product;
  return products.find((p) => p.grup === product.grup && hasMedia(p)) ?? product;
}

/** Aynı ajandanın diğer kılıf türündeki ilanı (şeffaf ↔ simli) */
export function siblings(products: Product[], product: Product) {
  return products.filter((p) => p.grup === product.grup);
}

export type SelectedOptions = Record<string, string>;
export type CustomSize = { en: string; boy: string; sirt: string };

// Müşterinin ajandası hakkında yazdıkları
export type AgendaInfo = {
  name: string; // tam adı, renk/desen dahil
  link?: string; // pazar yeri bağlantısı
  imageId?: string; // yüklenen görsel
};

export function priceFor(product: Product, selected: SelectedOptions) {
  let price = product.basePrice;
  for (const opt of product.options) {
    const choice = opt.choices.find((c) => c.value === selected[opt.id]);
    if (choice?.priceDelta) price += choice.priceDelta;
  }
  return price;
}

export function defaultOptions(product: Product): SelectedOptions {
  return Object.fromEntries(
    product.options.map((o) => [o.id, o.choices[0].value]),
  );
}

export function describeOptions(product: Product, selected: SelectedOptions) {
  return [
    `Kılıf: ${KILIF_LABEL[product.kilif]}`,
    ...(product.options
      .map((o) => {
        const c = o.choices.find((ch) => ch.value === selected[o.id]);
        return c ? `${o.label}: ${c.label}` : null;
      })
      .filter(Boolean) as string[]),
  ];
}

export function validOptions(product: Product, selected: SelectedOptions) {
  return product.options.every((o) =>
    o.choices.some((c) => c.value === selected[o.id]),
  );
}

export function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
