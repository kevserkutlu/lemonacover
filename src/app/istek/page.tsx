"use client";

// Özel istek: ajandası listede olmayan ya da özel ölçü isteyen müşteri, ajandasının
// adını ve en az bir fotoğrafını gönderir (ödeme yok). Ben yönetimden bakıp fiyatla
// onaylarım ya da dikemediğimi yazarım; müşteriye e-posta gider. Onaylanan istek bu
// sayfadan (istek koduyla) sepete eklenip sipariş edilir.
//   /istek/            → istek formu
//   /istek/?kod=XXXX   → isteğin durumu

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { rain } from "@/components/Glitter";
import { formatTL } from "@/data/site";
import {
  ApiError,
  createRequest,
  MAX_REQUEST_PHOTOS,
  groupCode,
  normalizeRequestCode,
  requestStatus,
  type RequestView,
} from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/CatalogProvider";
import { prepareImage } from "@/lib/resizeImage";
import styles from "./istek.module.css";

type Photo = { blob: Blob; thumb: string; key: number };
const sizeOk = (v: string) => !v.trim() || /^\d{1,2}([.,]\d{1,2})?$/.test(v.trim());

/* ---------- istek formu ---------- */

function RequestForm({ onSent }: { onSent: (code: string) => void }) {
  const { rules } = useCatalog();
  const [f, setF] = useState({ name: "", email: "", phone: "", agendaName: "", kilif: "", en: "", boy: "", sirt: "", note: "" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const nextKey = useRef(0);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const room = MAX_REQUEST_PHOTOS - photos.length;
    const picked = [...files].filter((x) => x.type.startsWith("image/") || /\.(heic|heif)$/i.test(x.name));
    if (picked.length > room) setError(`En fazla ${MAX_REQUEST_PHOTOS} fotoğraf ekleyebilirsin.`);
    setPreparing(true);
    try {
      for (const file of picked.slice(0, room)) {
        const { blob, thumb } = await prepareImage(file);
        const key = nextKey.current++;
        setPhotos((p) => [...p, { blob, thumb, key }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fotoğraf eklenemedi.");
    } finally {
      setPreparing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (f.name.trim().length < 2) v.name = "Adını yaz.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) v.email = "E-posta adresini kontrol et; cevabımı buraya yollayacağım.";
    if (f.agendaName.trim().length < rules.agendaNameMin)
      v.agendaName = "Ajandanın tam adını marka, model, yıl ve renk/desenle birlikte yaz.";
    if (!f.kilif) v.kilif = "Şeffaf mı simli mi istediğini seç.";
    if (!sizeOk(f.en) || !sizeOk(f.boy) || !sizeOk(f.sirt)) v.size = "Ölçüleri santim olarak yaz (ör. 14,8) ya da boş bırak.";
    if (!photos.length) v.photos = "Ajandanın en az bir fotoğrafını ekle.";
    setErrs(v);
    if (Object.keys(v).length) {
      document.getElementById(`i-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { code } = await createRequest({ ...f, photos: photos.map((p) => p.blob) });
      onSent(code);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fieldErrors) setErrs(err.fieldErrors);
      } else setError("Gönderilemedi, tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  const fieldErr = (k: string) => (errs[k] ? <span className="field__error">{errs[k]}</span> : null);

  return (
    <form className={`panel ${styles.panel}`} onSubmit={send} noValidate>
      <h2 className={styles.formTitle}>Ajandanı anlat</h2>

      <div className="field">
        <label htmlFor="i-agendaName">Ajandanın tam adı</label>
        <input
          id="i-agendaName"
          className="input"
          value={f.agendaName}
          maxLength={rules.agendaNameMax}
          onChange={set("agendaName")}
          placeholder="Ör. Hobonichi Techo Weeks 2027, Lacivert Kumaş Kapak"
          aria-invalid={errs.agendaName ? true : undefined}
        />
        <span className="field__hint">Marka, model, yıl ve renk ya da desen adıyla birlikte yaz.</span>
        {fieldErr("agendaName")}
      </div>

      <div className="field">
        <span className="label" id="i-photos-label">
          Ajandanın fotoğrafları <span className="muted">(en az 1, en fazla {MAX_REQUEST_PHOTOS})</span>
        </span>
        <ul className={styles.photos} aria-labelledby="i-photos-label">
          {photos.map((p, i) => (
            <li key={p.key} className={styles.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={`Eklediğin ${i + 1}. fotoğraf`} />
              <button
                type="button"
                className={styles.remove}
                aria-label={`${i + 1}. fotoğrafı kaldır`}
                onClick={() => setPhotos((all) => all.filter((x) => x.key !== p.key))}
              >
                ×
              </button>
            </li>
          ))}
          {photos.length < MAX_REQUEST_PHOTOS ? (
            <li>
              <label className={styles.add} data-invalid={errs.photos ? true : undefined}>
                <input
                  id="i-photos"
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="visually-hidden"
                  disabled={preparing}
                  onChange={(e) => addFiles(e.target.files)}
                />
                <span aria-hidden="true" className={styles.plus}>+</span>
                <span>{preparing ? "Hazırlanıyor…" : "Fotoğraf ekle"}</span>
              </label>
            </li>
          ) : null}
        </ul>
        <span className="field__hint">
          Ön kapağı ve yandan (sırtı görünecek şekilde) çekersen ölçüsünü daha kolay anlarım.
          Bilmediğim bir ajandaysa karışıklık olmasın diye fotoğraf şart.
        </span>
        {fieldErr("photos")}
      </div>

      <fieldset className={styles.kind}>
        <legend>Kılıf</legend>
        <div className={styles.chips}>
          {(
            [
              ["seffaf", "Şeffaf"],
              ["simli", "Simli"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={styles.chip}>
              <input
                id={v === "seffaf" ? "i-kilif" : undefined}
                type="radio"
                name="kilif"
                value={v}
                checked={f.kilif === v}
                onChange={() => setF((x) => ({ ...x, kilif: v }))}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {fieldErr("kilif")}
      </fieldset>

      <fieldset className={styles.kind}>
        <legend>
          Ölçüleri (cm) <span className="muted">— biliyorsan</span>
        </legend>
        <div className={styles.sizes}>
          {(
            [
              ["en", "En", "15"],
              ["boy", "Boy", "21"],
              ["sirt", "Sırt kalınlığı", "2,5"],
            ] as const
          ).map(([k, label, ph]) => (
            <div className="field" key={k}>
              <label htmlFor={k === "en" ? "i-size" : `i-${k}`}>{label}</label>
              <input
                id={k === "en" ? "i-size" : `i-${k}`}
                className="input"
                inputMode="decimal"
                placeholder={ph}
                value={f[k]}
                onChange={set(k)}
              />
            </div>
          ))}
        </div>
        <span className="field__hint">Kapak kapalıyken cetvelle ölç. Bilmiyorsan boş bırak, fotoğraftan bakarım.</span>
        {fieldErr("size")}
      </fieldset>

      <div className="field">
        <label htmlFor="i-note">
          Notun <span className="muted">(isteğe bağlı)</span>
        </label>
        <textarea id="i-note" className="input" rows={3} maxLength={500} value={f.note} onChange={set("note")} />
      </div>

      <h2 className={styles.formTitle}>Sana nasıl döneyim?</h2>
      <div className={styles.two}>
        <div className="field">
          <label htmlFor="i-name">Adın</label>
          <input id="i-name" className="input" autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={errs.name ? true : undefined} />
          {fieldErr("name")}
        </div>
        <div className="field">
          <label htmlFor="i-email">E-posta</label>
          <input
            id="i-email"
            className="input"
            type="email"
            autoComplete="email"
            value={f.email}
            onChange={set("email")}
            aria-invalid={errs.email ? true : undefined}
          />
          {fieldErr("email")}
        </div>
      </div>
      <div className="field">
        <label htmlFor="i-phone">
          Telefon <span className="muted">(isteğe bağlı)</span>
        </label>
        <input
          id="i-phone"
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="05xx xxx xx xx"
          value={f.phone}
          onChange={set("phone")}
        />
        <span className="field__hint">Bir şey sormam gerekirse WhatsApp’tan yazabilirim.</span>
        {fieldErr("phone")}
      </div>

      <p className="field__hint">
        Bu bilgileri sadece isteğini değerlendirmek ve sana dönmek için kullanıyorum (
        <Link href="/yasal/kvkk" target="_blank">aydınlatma metni</Link>). Ödeme bu adımda yok.
      </p>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      <button className="btn" disabled={busy || preparing}>
        {busy ? "Gönderiliyor…" : "İsteği gönder"}
      </button>
    </form>
  );
}

/* ---------- istek durumu ---------- */

const KILIF = { seffaf: "Şeffaf", simli: "Simli" } as const;

function StatusView({ code, fresh }: { code: string; fresh: boolean }) {
  const router = useRouter();
  const { add } = useCart();
  const [data, setData] = useState<RequestView | null>(null);
  const [error, setError] = useState("");

  // yeni gönderildiyse sayfanın başına (aynı sayfada adres değişince tarayıcı kaydırmıyor)
  useEffect(() => {
    if (fresh) window.scrollTo({ top: 0 });
  }, [fresh]);

  useEffect(() => {
    let alive = true;
    requestStatus(code)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Bir şeyler ters gitti, tekrar dene."));
    return () => {
      alive = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className={`panel ${styles.panel}`}>
        <p className="field__error" role="alert">{error}</p>
        <CodeLookup />
      </div>
    );
  }
  if (!data) return <p className="muted">Bakıyorum…</p>;

  const toCart = () => {
    add({
      slug: `istek-${data.code}`,
      options: {},
      agenda: { name: data.agendaName },
      request: { code: data.code, kilif: data.kilif, details: data.details, price: data.price ?? 0 },
    });
    router.push("/sepet");
  };

  return (
    <div className={`panel ${styles.panel}`} aria-live="polite">
      {fresh ? (
        <div className={styles.sent}>
          <h2>İsteğini aldım, teşekkürler!</h2>
          <p>
            Ajandanı inceleyip en kısa sürede e-postayla döneceğim. İstek kodun{" "}
            <strong className={styles.code}>{groupCode(data.code)}</strong>; bu sayfaya istediğin zaman dönüp
            durumuna bakabilirsin.
          </p>
        </div>
      ) : null}

      <div className={styles.statusHead}>
        <span className={styles.badge} data-status={data.status}>
          {data.status === "bekliyor"
            ? "İnceliyorum"
            : data.status === "onaylandi"
              ? "Dikebilirim"
              : data.status === "reddedildi"
                ? "Dikemiyorum"
                : "Siparişe dönüştü"}
        </span>
        <span className="muted">İstek kodu: {groupCode(data.code)}</span>
      </div>

      <div>
        <h2 className={styles.agenda}>{data.agendaName}</h2>
        <p className="muted">{data.details.filter((d) => !d.startsWith("Ajanda:") && !d.startsWith("Özel istek:")).join(" · ") || `${KILIF[data.kilif]} kılıf`}</p>
      </div>

      {data.reply ? <blockquote className={styles.reply}>{data.reply}</blockquote> : null}

      {data.status === "bekliyor" ? (
        <p>Kararımı e-posta adresine yollayacağım. (Gelmezse spam klasörüne de bak.)</p>
      ) : data.status === "onaylandi" ? (
        <>
          <p className={styles.price}>
            {formatTL(data.price ?? 0)} <span className="muted">+ kargo</span>
          </p>
          <button type="button" className="btn" onClick={toCart}>
            Sepete ekle ve siparişi tamamla
          </button>
        </>
      ) : data.status === "reddedildi" ? (
        <p>
          Bu ajandaya kılıf dikemiyorum, kusura bakma. <Link href="/#kiliflar">Diğer kılıflara</Link> göz
          atabilirsin.
        </p>
      ) : (
        <p>
          Bu isteğin siparişe dönüştü, teşekkürler! Siparişine <Link href="/siparis-takip">sipariş takibi</Link>{" "}
          sayfasından bakabilirsin.
        </p>
      )}
    </div>
  );
}

function CodeLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className={styles.lookup}
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) router.push(`/istek/?kod=${code}`);
      }}
    >
      <label htmlFor="i-code" className="label">İstek kodun var mı?</label>
      <div className={styles.lookupRow}>
        <input
          id="i-code"
          className={`input ${styles.codeInput}`}
          value={groupCode(code)}
          onChange={(e) => setCode(normalizeRequestCode(e.target.value))}
          placeholder="482 913"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn--ghost" disabled={code.length !== 6}>
          Durumuna bak
        </button>
      </div>
    </form>
  );
}

function RequestPage() {
  const params = useSearchParams();
  const router = useRouter();
  const code = normalizeRequestCode(params.get("kod") ?? "");
  const fresh = params.get("yeni") === "1";

  return (
    <div className={`wrap ${styles.page}`}>
      <h1>Özel istek</h1>
      {code.length === 6 ? (
        <StatusView key={code} code={code} fresh={fresh} />
      ) : (
        <>
          <p className={`muted ${styles.lead}`}>
            Ajandan listede yoksa ya da özel ölçüyse adını ve fotoğrafını gönder. Ona kılıf
            dikebiliyorsam fiyatıyla birlikte e-postayla dönerim; sonra buradan siparişini
            tamamlarsın. Her ajandaya dikemeyebilirim, o yüzden önce bakıyorum.
          </p>
          <RequestForm
            onSent={(c) => {
              rain();
              router.push(`/istek/?kod=${c}&yeni=1`);
            }}
          />
          <CodeLookup />
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <RequestPage />
    </Suspense>
  );
}
