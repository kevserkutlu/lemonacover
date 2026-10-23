"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { formatTL, site } from "@/data/site";
import {
  adminDecideRequest,
  adminDeleteReview,
  adminRequests,
  adminDetail,
  adminList,
  adminReviews,
  adminSetReviewStatus,
  adminUpdate,
  ApiError,
  groupCode,
  type AdminOrder,
  type AdminOrderRow,
  type AdminRequest,
  type AdminReview,
  type RequestStatus,
  type ReviewStatus,
} from "@/lib/api";
import styles from "./yonetim.module.css";

// Siparişleri görüp durumunu ve kargo takip numarasını güncellediğin sayfa.
// Giriş için api/config.php'deki admin_token kullanılır; sadece bu sekmede saklanır.

const STATUSES = [
  { value: "", label: "Tümü" },
  { value: "hazirlaniyor", label: "Dikilecek" },
  { value: "kargoda", label: "Kargoda" },
  { value: "teslim-edildi", label: "Teslim edildi" },
  { value: "odeme-bekleniyor", label: "Ödeme bekleyen" },
  { value: "iptal", label: "İptal" },
];
const LABEL: Record<string, string> = {
  "odeme-bekleniyor": "Ödeme bekleniyor",
  hazirlaniyor: "Dikilecek",
  kargoda: "Kargoda",
  "teslim-edildi": "Teslim edildi",
  iptal: "İptal",
};
const REVIEW_LABEL: Record<ReviewStatus, string> = { bekliyor: "onay bekliyor", yayinda: "yayında", gizli: "gizli" };
const ACTOR: Record<string, string> = { musteri: "Müşteri", odeme: "Ödeme", yonetim: "Sen" };

const date = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* anahtar sadece bu sekmede (sessionStorage) tutulur */
const KEY = "lemona-admin-token";
const EVENT = "lemona:admin-token";
function readToken() {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function saveToken(t: string) {
  try {
    if (t) sessionStorage.setItem(KEY, t);
    else sessionStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function Login() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={`panel ${styles.login}`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await adminList(value.trim());
          saveToken(value.trim());
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Giriş yapılamadı.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>Yönetim</h1>
      <div className="field">
        <label htmlFor="token">Yönetim anahtarı</label>
        <input
          id="token"
          className="input"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="field__hint">api/config.php dosyasındaki admin_token değeri.</span>
      </div>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      <button className="btn" disabled={busy || value.trim().length < 32}>
        {busy ? "Kontrol ediliyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

function Detail({ token, no, onChanged }: { token: string; no: string; onChanged: () => void }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ status: "", carrier: "", trackingCode: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    adminDetail(token, no)
      .then((o) => {
        if (!alive) return;
        setOrder(o);
        setForm({ status: o.status, carrier: o.carrier ?? "", trackingCode: o.trackingCode ?? "", note: "" });
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Sipariş yüklenemedi."));
    return () => {
      alive = false;
    };
  }, [token, no]);

  if (error) return <p className="field__error">{error}</p>;
  if (!order) return <p className="muted">Yükleniyor…</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const o = await adminUpdate(token, no, form);
      setOrder(o);
      setForm((f) => ({ ...f, note: "" }));
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const c = order.customer;
  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <h2>{order.id}</h2>
        <span className={styles.badge} data-status={order.status}>{LABEL[order.status]}</span>
      </div>

      <section className={styles.block}>
        <h3>Gönderim</h3>
        <p>
          <strong>{c.name}</strong>
          <br />
          {c.address}
          <br />
          {c.district} / {c.city}
          <br />
          <a href={`tel:${c.phone}`}>{c.phone}</a> · <a href={`mailto:${c.email}`}>{c.email}</a>
        </p>
        {c.note ? <p className="muted">Not: {c.note}</p> : null}
      </section>

      {order.reviewCode ? (
        <section className={`${styles.block} ${styles.cardCode}`}>
          <h3>Teşekkür kartına yaz</h3>
          <p className={styles.cardLine}>
            {site.domain}/yorum · kod: <strong>{groupCode(order.reviewCode)}</strong>
          </p>
          <p className="field__hint">
            {order.reviewStatus
              ? `Yorumunu yazdı (${REVIEW_LABEL[order.reviewStatus]}).`
              : "Müşteri bu kodla yorum ve fotoğraf ekleyebilir. Kod, kargoya verince e-postada ve sipariş takibinde de görünür."}
          </p>
        </section>
      ) : null}

      <section className={styles.block}>
        <h3>Dikilecekler</h3>
        <ul className={styles.items}>
          {order.items.map((it, i) => (
            <li key={i} className={styles.item}>
              {it.imageUrl ? (
                <a href={it.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageUrl} alt={`${it.agendaName} görseli`} />
                </a>
              ) : (
                <span className={`${styles.thumb} ${styles.noThumb}`}>görsel yok</span>
              )}
              <div>
                <strong>
                  {it.name} {it.qty > 1 ? `× ${it.qty}` : ""}
                </strong>
                <p className={styles.agenda}>{it.agendaName}</p>
                <p className="field__hint">{it.details.slice(1).join(", ")}</p>
                {it.custom ? (
                  <p className="field__hint">
                    Ölçü: {it.custom.en} × {it.custom.boy} cm, sırt {it.custom.sirt} cm
                  </p>
                ) : null}
                {it.agendaLink ? (
                  <a href={it.agendaLink} target="_blank" rel="noopener noreferrer" className="field__hint">
                    Ürün bağlantısı
                  </a>
                ) : null}
                {it.note ? <p className="field__hint">Not: {it.note}</p> : null}
              </div>
              <span className={styles.price}>{formatTL(it.unitPrice * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row">
          <span>Kargo</span>
          <span>{formatTL(order.shipping)}</span>
        </div>
        <div className="summary-row summary-row--total">
          <span>Toplam</span>
          <span>{formatTL(order.total)}</span>
        </div>
        <p className="field__hint">
          Ödeme: {order.paymentProvider}
          {order.paymentRef ? ` · ${order.paymentRef}` : ""}
          {order.paidAt ? ` · ${date(order.paidAt)}` : " · alınmadı"}
        </p>
      </section>

      <form className={styles.block} onSubmit={save}>
        <h3>Güncelle</h3>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="d-status">Durum</label>
            <select
              id="d-status"
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {Object.entries(LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="d-carrier">Kargo firması</label>
            <input
              id="d-carrier"
              className="input"
              value={form.carrier}
              placeholder="Yurtiçi Kargo"
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="d-tracking">Takip numarası</label>
            <input
              id="d-tracking"
              className="input"
              value={form.trackingCode}
              onChange={(e) => setForm({ ...form, trackingCode: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="d-note">Not (sadece sen görürsün)</label>
            <input
              id="d-note"
              className="input"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>
        <p className="field__hint">Durumu &quot;Kargoda&quot; yapınca müşteriye takip numarasıyla e-posta gider.</p>
        {error ? <p className="field__error" role="alert">{error}</p> : null}
        <div className={styles.saveRow}>
          <button className="btn" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {saved ? <span role="status">Kaydedildi.</span> : null}
        </div>
      </form>

      <section className={styles.block}>
        <h3>Geçmiş</h3>
        <ol className={styles.events}>
          {order.events.map((e, i) => (
            <li key={i}>
              <span className="muted">{date(e.at)}</span> · {LABEL[e.status] ?? e.status} · {ACTOR[e.actor] ?? e.actor}
              {e.note ? <span className="muted"> — {e.note}</span> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

const REVIEW_TABS: { value: ReviewStatus; label: string }[] = [
  { value: "bekliyor", label: "Onay bekleyen" },
  { value: "yayinda", label: "Yayında" },
  { value: "gizli", label: "Gizli" },
];

function Reviews({ token }: { token: string }) {
  const [status, setStatus] = useState<ReviewStatus>("bekliyor");
  const [data, setData] = useState<{ reviews: AdminReview[]; counts: Record<ReviewStatus, number> } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    adminReviews(token, status)
      .then((d) => alive && (setData(d), setError("")))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yorumlar yüklenemedi."));
    return () => {
      alive = false;
    };
  }, [token, status, reload]);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Yapılamadı, tekrar dene.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Yorum durumu">
        {REVIEW_TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={status === t.value}
            className={styles.tab}
            onClick={() => setStatus(t.value)}
          >
            {t.label}
            {data ? ` (${data.counts[t.value]})` : ""}
          </button>
        ))}
      </div>

      {error ? <p className="field__error" role="alert">{error}</p> : null}
      {data && data.reviews.length === 0 ? <p className="muted">Burada yorum yok.</p> : null}

      <ul className={styles.reviews}>
        {data?.reviews.map((r) => (
          <li key={r.id} className={`panel ${styles.review}`}>
            <div className={styles.rowTop}>
              <strong>{r.name}</strong>
              <span className="muted">{date(r.createdAt)}</span>
            </div>
            <p className={styles.reviewText}>{r.text}</p>
            {r.photos.length ? (
              <div className={styles.reviewPhotos}>
                {r.photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumb} alt={`${r.name} yorumundaki ${i + 1}. fotoğraf`} />
                  </a>
                ))}
              </div>
            ) : null}
            <p className="field__hint">
              {r.products} · {r.orderId} · {r.customerName}
            </p>
            <div className={styles.saveRow}>
              {r.status !== "yayinda" ? (
                <button className="btn" disabled={busy === r.id} onClick={() => act(r.id, () => adminSetReviewStatus(token, r.id, "yayinda"))}>
                  Yayınla
                </button>
              ) : null}
              {r.status !== "gizli" ? (
                <button className="btn btn--ghost" disabled={busy === r.id} onClick={() => act(r.id, () => adminSetReviewStatus(token, r.id, "gizli"))}>
                  Gizle
                </button>
              ) : null}
              <button
                className="link-btn"
                disabled={busy === r.id}
                onClick={() => {
                  if (confirm("Bu yorum ve fotoğrafları kalıcı olarak silinsin mi?")) {
                    act(r.id, () => adminDeleteReview(token, r.id));
                  }
                }}
              >
                Sil
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- özel istekler ---------- */

const REQUEST_TABS: { value: RequestStatus; label: string }[] = [
  { value: "bekliyor", label: "Bekleyen" },
  { value: "onaylandi", label: "Onayladıklarım" },
  { value: "siparis", label: "Siparişe dönen" },
  { value: "reddedildi", label: "Reddettiklerim" },
];

const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "").replace(/^0/, "");
  return `https://wa.me/${d.startsWith("90") ? d : "90" + d}`;
};

function RequestCard({ token, r, onChanged }: { token: string; r: AdminRequest; onChanged: () => void }) {
  const [price, setPrice] = useState(r.price ? String(r.price) : "");
  const [reply, setReply] = useState(r.reply ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async (decision: "onayla" | "reddet") => {
    if (decision === "reddet" && !confirm("Bu isteği reddedip müşteriye e-posta göndereyim mi?")) return;
    setBusy(true);
    setError("");
    try {
      await adminDecideRequest(token, r.id, { decision, price, reply });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldErrors?.price ?? e.message) : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`panel ${styles.review}`}>
      <div className={styles.rowTop}>
        <strong>{r.agendaName}</strong>
        <span className="muted">{date(r.createdAt)}</span>
      </div>
      <div className={styles.reviewPhotos}>
        {r.photos.map((p, i) => (
          <a key={i} href={p.url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={`${r.agendaName} fotoğrafı ${i + 1}`} />
          </a>
        ))}
      </div>
      <p className="field__hint">{r.details.slice(1).join(" · ")}</p>
      {r.note ? <p className={styles.reviewText}>“{r.note}”</p> : null}
      <p className="field__hint">
        {r.customer.name} · <a href={`mailto:${r.customer.email}`}>{r.customer.email}</a>
        {r.customer.phone ? (
          <>
            {" "}· <a href={waLink(r.customer.phone)} target="_blank" rel="noopener noreferrer">{r.customer.phone} (WhatsApp)</a>
          </>
        ) : null}
      </p>

      {r.status === "siparis" ? (
        <p>
          {formatTL(r.price ?? 0)} ile siparişe dönüştü{r.orderId ? ` · ${r.orderId}` : ""}.
        </p>
      ) : (
        <div className={styles.decide}>
          <div className={styles.formGrid}>
            <div className="field">
              <label htmlFor={`p-${r.id}`}>Fiyat (TL, kargo hariç)</label>
              <input id={`p-${r.id}`} className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="350" />
            </div>
            <div className="field">
              <label htmlFor={`m-${r.id}`}>Müşteriye notun (isteğe bağlı)</label>
              <textarea id={`m-${r.id}`} className="input" rows={2} maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} />
            </div>
          </div>
          {error ? <p className="field__error" role="alert">{error}</p> : null}
          <div className={styles.saveRow}>
            <button className="btn" disabled={busy} onClick={() => decide("onayla")}>
              {r.status === "onaylandi" ? "Fiyatı güncelle" : "Dikebilirim, onayla"}
            </button>
            {r.status !== "reddedildi" ? (
              <button className="btn btn--ghost" disabled={busy} onClick={() => decide("reddet")}>
                Dikemiyorum
              </button>
            ) : null}
          </div>
          <p className="field__hint">Kararını kaydedince müşteriye e-posta gider{r.status === "bekliyor" ? "" : " (yeniden)"}.</p>
        </div>
      )}
    </li>
  );
}

function Requests({ token }: { token: string }) {
  const [status, setStatus] = useState<RequestStatus>("bekliyor");
  const [data, setData] = useState<{ requests: AdminRequest[]; counts: Record<RequestStatus, number> } | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    adminRequests(token, status)
      .then((d) => alive && (setData(d), setError("")))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "İstekler yüklenemedi."));
    return () => {
      alive = false;
    };
  }, [token, status, reload]);

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="İstek durumu">
        {REQUEST_TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={status === t.value} className={styles.tab} onClick={() => setStatus(t.value)}>
            {t.label}
            {data ? ` (${data.counts[t.value]})` : ""}
          </button>
        ))}
      </div>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      {data && data.requests.length === 0 ? <p className="muted">Burada istek yok.</p> : null}
      <ul className={styles.reviews}>
        {data?.requests.map((r) => (
          <RequestCard key={`${r.id}-${r.status}`} token={token} r={r} onChanged={() => setReload((n) => n + 1)} />
        ))}
      </ul>
    </>
  );
}

function Dashboard({ token }: { token: string }) {
  const params = useSearchParams();
  const [status, setStatus] = useState("hazirlaniyor");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ orders: AdminOrderRow[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(params.get("siparis") ?? "");
  const [reload, setReload] = useState(0);
  const initial = params.get("bolum");
  const [section, setSection] = useState<"siparisler" | "istekler" | "yorumlar">(
    initial === "yorumlar" || initial === "istekler" ? initial : "siparisler",
  );

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    adminList(token, status, page)
      .then((d) => alive && (setData(d), setError("")))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.message.includes("anahtar")) saveToken("");
        setError(e instanceof ApiError ? e.message : "Siparişler yüklenemedi.");
      });
    return () => {
      alive = false;
    };
  }, [token, status, page, reload]);

  const pages = data ? Math.max(1, Math.ceil(data.total / 30)) : 1;

  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.top}>
        <nav className={styles.sections} aria-label="Bölüm">
          <button className={styles.section} aria-current={section === "siparisler" ? "page" : undefined} onClick={() => setSection("siparisler")}>
            Siparişler
          </button>
          <button className={styles.section} aria-current={section === "istekler" ? "page" : undefined} onClick={() => setSection("istekler")}>
            İstekler
          </button>
          <button className={styles.section} aria-current={section === "yorumlar" ? "page" : undefined} onClick={() => setSection("yorumlar")}>
            Yorumlar
          </button>
        </nav>
        <button className="link-btn" onClick={() => saveToken("")}>Çıkış yap</button>
      </div>

      {section === "istekler" ? <Requests token={token} /> : section === "yorumlar" ? <Reviews token={token} /> : <>

      <div className={styles.tabs} role="tablist" aria-label="Duruma göre">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            role="tab"
            aria-selected={status === s.value}
            className={styles.tab}
            onClick={() => {
              setStatus(s.value);
              setPage(1);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error ? <p className="field__error" role="alert">{error}</p> : null}

      <div className={styles.layout}>
        <div className={styles.list}>
          {data && data.orders.length === 0 ? <p className="muted">Bu durumda sipariş yok.</p> : null}
          {data?.orders.map((o) => (
            <button
              key={o.id}
              className={styles.row}
              aria-pressed={selected === o.id}
              onClick={() => setSelected(o.id)}
            >
              <span className={styles.rowTop}>
                <strong>{o.id}</strong>
                <span className={styles.badge} data-status={o.status}>{LABEL[o.status]}</span>
              </span>
              <span>{o.customerName} · {o.place}</span>
              <span className="muted">
                {date(o.createdAt)} · {o.itemCount} kılıf · {formatTL(o.total)}
              </span>
            </button>
          ))}
          {pages > 1 ? (
            <div className={styles.pager}>
              <button className="link-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button>
              <span>{page} / {pages}</span>
              <button className="link-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sonraki</button>
            </div>
          ) : null}
        </div>

        <div className={`panel ${styles.side}`}>
          {selected ? (
            <Detail key={selected} token={token} no={selected} onChanged={refresh} />
          ) : (
            <p className="muted">Ayrıntısını görmek için soldan bir sipariş seç.</p>
          )}
        </div>
      </div>
      </>}
    </div>
  );
}

function Admin() {
  const token = useSyncExternalStore(subscribe, readToken, () => "");
  return token ? <Dashboard token={token} /> : <div className={`wrap ${styles.page}`}><Login /></div>;
}

export default function Page() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}
