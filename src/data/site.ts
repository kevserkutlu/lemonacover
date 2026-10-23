// Mağaza genel ayarları. Ürünler, fiyatlar ve kargo ücreti veritabanında
// (PHP API → GET /katalog); buradakiler sitenin sabit bilgileri.

export const site = {
  name: "lemona cover",
  domain: "lemonacover.com", // teşekkür kartına yazılan adres (yorum sayfası: domain/yorum)
  tagline: "Ajandana tam oturan şeffaf kılıflar",
  // Kargo
  carrierName: "Anlaşmalı kargo", // ör. "Yurtiçi Kargo"
  carrierTrackingUrl: "", // ör. "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code="
  productionDays: "2–4 iş günü", // dikim süresi
  // İletişim
  email: "merhaba@lemonacover.com",
  instagram: "",
  // Pazar yeri profillerin (yorum kaynakları)
  sources: {
    dolap: {
      label: "Dolap",
      url: "https://dolap.com/profil/lemonacover",
      rating: "5.0",
      count: 37,
    },
    gardrops: {
      label: "Gardrops",
      url: "https://www.gardrops.com/lemonacover-u-8112401",
      rating: "5.0",
      count: 30,
    },
  },
  // Satıcı bilgileri (Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu için zorunlu)
  seller: {
    title: "[Ad Soyad / Şirket unvanı]",
    address: "[Açık adres]",
    phone: "[Telefon]",
    taxInfo: "[Vergi dairesi ve no / TCKN]",
    mersis: "",
  },
} as const;

/** Ücretsiz kargo yok: her siparişte sabit kargo ücreti (catalog.shipping) */
export function shippingFor(subtotal: number, fee: number) {
  return subtotal > 0 ? fee : 0;
}

export function formatTL(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}
