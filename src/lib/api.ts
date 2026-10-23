"use client";

// Sitenin PHP API ile konuştuğu tek yer (api/ klasörü: PHP 8.5 + MySQL).
// Ürünler, siparişler, yorumlar hepsi API'de; kart bilgisi asla bu siteden
// geçmez, ödeme sağlayıcının (PayTR) sayfasında girilir.

import { API_URL } from "./catalog";
import { cleanCustomer, validateCustomer, type IncomingLine, type OrderSummary } from "./orderLogic";

const API = API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...init,
      headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Bir şeyler ters gitti, tekrar dene.", data.errors);
  return data as T;
}

/* ---------- sipariş ---------- */

export type CreateOrderInput = {
  customer: Record<string, unknown>;
  contractAccepted: boolean;
  items: IncomingLine[];
};

export async function createOrder(input: CreateOrderInput): Promise<{ orderId: string; redirectUrl: string }> {
  const customer = cleanCustomer(input.customer);
  const errors = validateCustomer(customer, input.contractAccepted);
  if (Object.keys(errors).length) throw new ApiError("Bilgileri kontrol et.", errors);

  // Sunucu fiyatı kendisi hesaplar; burada sadece seçimler gönderilir.
  return call("/siparis", {
    method: "POST",
    body: JSON.stringify({ customer, consents: { contract: input.contractAccepted }, items: input.items }),
  });
}

// Test ödemesi: API test modundaysa (config.php → payment.provider = test) ödemeyi onaylar.
export async function confirmTestPayment(orderId: string) {
  await call("/odeme/test", { method: "POST", body: JSON.stringify({ orderId }) });
}

// Sipariş onay sayfası için özet (adres vb. kişisel veri yok).
// Ödeme henüz onaylanmadıysa status "odeme-bekleniyor" döner.
export async function getOrderSummary(id: string): Promise<OrderSummary | null> {
  try {
    return await call<OrderSummary>(`/siparis/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

// Sipariş takibi: sipariş no + telefonun son 4 hanesi
export async function trackOrder(
  id: string,
  phoneLast4: string,
): Promise<OrderSummary & { reviewCode?: string | null }> {
  try {
    return await call<OrderSummary & { reviewCode?: string | null }>("/siparis-takip", {
      method: "POST",
      body: JSON.stringify({ id, phone: phoneLast4 }),
    });
  } catch (e) {
    throw e instanceof ApiError
      ? e
      : new ApiError(
          "Bu sipariş numarası ve telefonla eşleşen bir sipariş bulamadım. Sipariş numarası onay e-postasında yazıyor.",
        );
  }
}

/* ---------- ajanda görseli ---------- */

export async function uploadImage(blob: Blob): Promise<{ id: string }> {
  if (blob.size > 4 * 1024 * 1024) throw new ApiError("Görsel 4 MB'tan büyük olamaz.");
  const body = new FormData();
  body.append("file", blob, "ajanda.jpg");
  return call("/gorsel", { method: "POST", body });
}

/* ---------- yönetim (/yonetim) ---------- */

export type AdminOrderRow = {
  id: string;
  status: OrderSummary["status"];
  customerName: string;
  place: string;
  itemCount: number;
  total: number;
  trackingCode: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type AdminOrder = {
  id: string;
  status: OrderSummary["status"];
  customer: {
    name: string;
    email: string;
    phone: string;
    city: string;
    district: string;
    address: string;
    note: string | null;
  };
  items: {
    name: string;
    slug: string;
    details: string[];
    agendaName: string;
    agendaLink: string | null;
    imageUrl: string | null;
    custom: { en: string; boy: string; sirt: string } | null;
    note: string | null;
    unitPrice: number;
    qty: number;
  }[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentProvider: string;
  paymentRef: string | null;
  carrier: string | null;
  trackingCode: string | null;
  createdAt: string;
  paidAt: string | null;
  events: { status: string; note: string | null; actor: string; at: string }[];
  /** teşekkür kartına yazılacak yorum kodu (ödeme alındıysa) */
  reviewCode: string | null;
  reviewStatus: "bekliyor" | "yayinda" | "gizli" | null;
};

function adminCall<T>(token: string, path: string, init?: RequestInit) {
  return call<T>(path, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
}

export const adminList = (token: string, status = "", page = 1) =>
  adminCall<{ orders: AdminOrderRow[]; total: number }>(
    token,
    `/yonetim/siparisler?durum=${encodeURIComponent(status)}&sayfa=${page}`,
  );

export const adminDetail = (token: string, no: string) =>
  adminCall<AdminOrder>(token, `/yonetim/siparis/${encodeURIComponent(no)}`);

export const adminUpdate = (
  token: string,
  no: string,
  patch: { status?: string; carrier?: string; trackingCode?: string; note?: string },
) =>
  adminCall<AdminOrder>(token, `/yonetim/siparis/${encodeURIComponent(no)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

/* ---------- alıcı yorumları ---------- */
// Yorumu sadece siparişi alan yazabilsin diye her siparişin 6 haneli bir yorum
// kodu var (teşekkür kartında, kargo e-postasında ve sipariş takibinde).

export type ReviewPhoto = { url: string; thumb: string; width: number; height: number };
export type SiteReview = {
  id: number;
  name: string;
  text: string;
  products: string;
  createdAt: string;
  photos: ReviewPhoto[];
};
export type ReviewStatus = "bekliyor" | "yayinda" | "gizli";

export const MAX_REVIEW_PHOTOS = 3;

/* Müşterinin yazdığı kodlar sadece rakam: sipariş LC-48213, istek ve yorum kodu 6 rakam
   (482 913 diye 3'erli gösterilir). Boşluk, tire vb. yok sayılır. */
export const onlyDigits = (code: string, max: number) => code.replace(/\D/g, "").slice(0, max);
/** 482913 → "482 913" */
export const groupCode = (code: string) => code.replace(/(\d{3})(?=\d)/g, "$1 ");

export const normalizeReviewCode = (code: string) => onlyDigits(code, 6);

export async function lookupReviewCode(
  code: string,
): Promise<{ code: string; products: string[]; review: { status: ReviewStatus } | null }> {
  return call("/yorum/kod", { method: "POST", body: JSON.stringify({ code: normalizeReviewCode(code) }) });
}

export async function submitReview(input: {
  code: string;
  name: string;
  text: string;
  consent: boolean;
  photos: Blob[];
}): Promise<void> {
  const body = new FormData();
  body.append("code", normalizeReviewCode(input.code));
  body.append("name", input.name);
  body.append("text", input.text);
  body.append("consent", input.consent ? "1" : "0");
  input.photos.slice(0, MAX_REVIEW_PHOTOS).forEach((p, i) => body.append("photos[]", p, `foto-${i + 1}.jpg`));
  await call("/yorum", { method: "POST", body });
}

/** Sitede yayındaki yorumlar; sunucu yoksa ya da ulaşılamazsa boş liste. */
export async function listSiteReviews(): Promise<SiteReview[]> {
  try {
    return (await call<{ reviews: SiteReview[] }>("/yorumlar")).reviews;
  } catch {
    return [];
  }
}

export type AdminReview = SiteReview & {
  status: ReviewStatus;
  orderId: string;
  customerName: string;
};

export const adminReviews = (token: string, status: ReviewStatus) =>
  adminCall<{ reviews: AdminReview[]; counts: Record<ReviewStatus, number> }>(
    token,
    `/yonetim/yorumlar?durum=${status}`,
  );

export const adminSetReviewStatus = (token: string, id: number, status: ReviewStatus) =>
  adminCall<{ ok: true }>(token, `/yonetim/yorum/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const adminDeleteReview = (token: string, id: number) =>
  adminCall<{ ok: true }>(token, `/yonetim/yorum/${id}`, { method: "DELETE" });

/* ---------- özel istekler ---------- */
// Listede olmayan ya da özel ölçü ajandalar: müşteri görselle istek bırakır, ben
// fiyatla onaylarım ya da reddederim; onaylanınca istek koduyla sipariş verilir.

export type RequestStatus = "bekliyor" | "onaylandi" | "reddedildi" | "siparis";

export type RequestView = {
  code: string;
  status: RequestStatus;
  agendaName: string;
  kilif: "seffaf" | "simli";
  details: string[];
  price: number | null;
  reply: string | null;
  createdAt: string;
};

export const MAX_REQUEST_PHOTOS = 3;
export const normalizeRequestCode = (code: string) => onlyDigits(code, 6);

export async function createRequest(input: {
  name: string;
  email: string;
  phone: string;
  agendaName: string;
  kilif: string;
  en: string;
  boy: string;
  sirt: string;
  note: string;
  photos: Blob[];
}): Promise<{ code: string }> {
  const body = new FormData();
  for (const [k, v] of Object.entries(input)) if (k !== "photos") body.append(k, String(v));
  input.photos.slice(0, MAX_REQUEST_PHOTOS).forEach((p, i) => body.append("photos[]", p, `ajanda-${i + 1}.jpg`));
  return call("/istek", { method: "POST", body });
}

export const requestStatus = (code: string) =>
  call<RequestView>("/istek/durum", { method: "POST", body: JSON.stringify({ code: normalizeRequestCode(code) }) });

export type AdminRequest = RequestView & {
  id: number;
  customer: { name: string; email: string; phone: string | null };
  note: string | null;
  orderId: string | null;
  decidedAt: string | null;
  photos: { url: string; thumb: string }[];
};

export const adminRequests = (token: string, status: RequestStatus) =>
  adminCall<{ requests: AdminRequest[]; counts: Record<RequestStatus, number> }>(
    token,
    `/yonetim/istekler?durum=${status}`,
  );

export const adminDecideRequest = (
  token: string,
  id: number,
  input: { decision: "onayla" | "reddet"; price?: string; reply?: string },
) => adminCall<{ ok: true; status: RequestStatus }>(token, `/yonetim/istek/${id}`, { method: "PATCH", body: JSON.stringify(input) });
