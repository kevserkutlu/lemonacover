// Sipariş tipleri ve müşteri bilgisi kontrolü (ödeme sayfası gönderimden önce
// hataları göstersin diye). Fiyatı ve kargoyu her zaman API hesaplar
// (api/src/OrderService.php), tarayıcıdan gelen fiyata güvenilmez.

import type { AgendaInfo, CustomSize, SelectedOptions } from "@/data/products";

export type OrderStatus =
  | "odeme-bekleniyor"
  | "hazirlaniyor"
  | "kargoda"
  | "teslim-edildi"
  | "iptal";

export type Customer = {
  name: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  note?: string;
};

// Sipariş onayı ve takip sayfasında gösterilen, kişisel veri içermeyen özet
export type OrderSummary = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  trackingCode: string | null;
  carrier?: string | null;
  lines: { name: string; details: string[]; qty: number; unitPrice: number }[];
  shipping: number;
  total: number;
};

export type IncomingLine = {
  slug?: string;
  requestCode?: string; // onaylanmış özel istek
  options?: SelectedOptions;
  custom?: CustomSize;
  note?: string;
  agenda?: Partial<AgendaInfo>;
  qty: number;
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function cleanCustomer(c: Record<string, unknown>): Customer {
  return {
    name: str(c.name, 80),
    email: str(c.email, 120),
    phone: str(c.phone, 20),
    city: str(c.city, 40),
    district: str(c.district, 60),
    address: str(c.address, 400),
    note: str(c.note, 400) || undefined,
  };
}

// Alan adı → hata mesajı. Boşsa bilgiler geçerli.
export function validateCustomer(customer: Customer, contractAccepted: boolean) {
  const errors: Record<string, string> = {};
  if (customer.name.length < 3) errors.name = "Adını ve soyadını yaz.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.email = "E-posta adresini kontrol et.";
  const digits = customer.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 12) errors.phone = "Telefon numaranı 05xx xxx xx xx biçiminde yaz.";
  if (!customer.city) errors.city = "İl seç.";
  if (customer.district.length < 2) errors.district = "İlçeyi yaz.";
  if (customer.address.length < 10) errors.address = "Mahalle, sokak ve kapı numarasıyla birlikte yaz.";
  if (!contractAccepted) errors.contract = "Devam etmek için sözleşmeleri onayla.";
  return errors;
}
