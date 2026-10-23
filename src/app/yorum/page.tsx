"use client";

// Alıcı yorumu. Hesap yok: teşekkür kartındaki 6 haneli kodla yazılır
// (kod kargo e-postasında ve sipariş takibinde de var). Yorum onaylanınca
// ana sayfadaki yorum duvarında görünür.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { rain } from "@/components/Glitter";
import {
  ApiError,
  lookupReviewCode,
  MAX_REVIEW_PHOTOS,
  groupCode,
  normalizeReviewCode,
  submitReview,
  type ReviewStatus,
} from "@/lib/api";
import { prepareImage } from "@/lib/resizeImage";
import styles from "./yorum.module.css";

const TEXT_MAX = 1000;

type Found = { code: string; products: string[]; review: { status: ReviewStatus } | null };
type Photo = { blob: Blob; thumb: string; key: number };

function CodeStep({ initial, onFound }: { initial: string; onFound: (f: Found) => void }) {
  const [code, setCode] = useState(normalizeReviewCode(initial));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const check = async (value: string) => {
    setBusy(true);
    setError("");
    try {
      onFound(await lookupReviewCode(value));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Bir şeyler ters gitti, tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  // karttaki karekoddan ya da e-postadaki bağlantıdan gelindiyse kodu hemen dene
  // (zamanlayıcı temizlenince iptal olur; böylece geliştirmede iki kez çalışan efekt tek istek atar)
  useEffect(() => {
    if (normalizeReviewCode(initial).length !== 6) return;
    const t = setTimeout(() => check(initial), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <form
      className={`panel ${styles.panel}`}
      onSubmit={(e) => {
        e.preventDefault();
        check(code);
      }}
    >
      <div className="field">
        <label htmlFor="r-code">Yorum kodu</label>
        <input
          id="r-code"
          className={`input ${styles.code}`}
          value={groupCode(code)}
          onChange={(e) => setCode(normalizeReviewCode(e.target.value))}
          placeholder="482 913"
          autoComplete="off"
          spellCheck={false}
          inputMode="numeric"
          aria-describedby="r-code-hint"
        />
        <span id="r-code-hint" className="field__hint">
          Teşekkür kartında yazan 6 haneli kod. Kargo e-postasında ve sipariş takibi sayfasında da var.
        </span>
      </div>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      <button className="btn" disabled={busy || code.length !== 6}>
        {busy ? "Bakılıyor…" : "Devam et"}
      </button>
    </form>
  );
}

function ReviewForm({ found, onDone }: { found: Found; onDone: () => void }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const nextKey = useRef(0);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const room = MAX_REVIEW_PHOTOS - photos.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (picked.length > room) setError(`En fazla ${MAX_REVIEW_PHOTOS} fotoğraf ekleyebilirsin.`);
    setPreparing(true);
    try {
      for (const f of picked.slice(0, room)) {
        const { blob, thumb } = await prepareImage(f);
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
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Sitede görünecek adını yaz.";
    if (text.trim().length < 10) errs.text = "Yorumun biraz daha uzun olsun (en az 10 karakter).";
    if (!consent) errs.consent = "Yorumunun sitede yayınlanmasına izin vermen gerekiyor.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError("");
    try {
      await submitReview({ code: found.code, name: name.trim(), text: text.trim(), consent, photos: photos.map((p) => p.blob) });
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      } else setError("Gönderilemedi, tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`panel ${styles.panel}`} onSubmit={send} noValidate>
      <p className={styles.for}>
        <span className="muted">Yorum yazdığın sipariş:</span> {found.products.join(", ")}
      </p>

      <div className="field">
        <label htmlFor="r-text">Yorumun</label>
        <textarea
          id="r-text"
          className="input"
          rows={5}
          maxLength={TEXT_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kılıf ajandana nasıl oturdu, nasıl buldun?"
          aria-invalid={fieldErrors.text ? true : undefined}
        />
        <span className={`field__hint ${styles.counter}`}>
          {text.length} / {TEXT_MAX}
        </span>
        {fieldErrors.text ? <span className="field__error">{fieldErrors.text}</span> : null}
      </div>

      <div className="field">
        <span className="label" id="r-photos-label">
          Fotoğraflar <span className="muted">(isteğe bağlı, en fazla {MAX_REVIEW_PHOTOS})</span>
        </span>
        <ul className={styles.photos} aria-labelledby="r-photos-label">
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
          {photos.length < MAX_REVIEW_PHOTOS ? (
            <li>
              <label className={styles.add}>
                <input
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
        <span className="field__hint">Kılıflı ajandanın fotoğrafını eklersen çok sevinirim.</span>
      </div>

      <div className="field">
        <label htmlFor="r-name">Sitede görünecek adın</label>
        <input
          id="r-name"
          className="input"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ör. Zeynep ya da bir rumuz"
          autoComplete="given-name"
          aria-invalid={fieldErrors.name ? true : undefined}
        />
        <span className="field__hint">Soyadını yazmana gerek yok; rumuz da olur.</span>
        {fieldErrors.name ? <span className="field__error">{fieldErrors.name}</span> : null}
      </div>

      <label className={`check ${styles.consent}`}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Yorumumun, adımın ve eklediğim fotoğrafların lemona cover sitesinde yayınlanmasına izin
          veriyorum. Fotoğraflarda kimsenin yüzü ya da kişisel bilgisi yok.
        </span>
      </label>
      {fieldErrors.consent ? <span className="field__error">{fieldErrors.consent}</span> : null}

      {error ? <p className="field__error" role="alert">{error}</p> : null}
      <button className="btn" disabled={busy || preparing}>
        {busy ? "Gönderiliyor…" : "Yorumu gönder"}
      </button>
    </form>
  );
}

const STATUS_TEXT: Record<ReviewStatus, string> = {
  bekliyor: "Bu sipariş için yorumunu almışım, okuyup onayladıktan sonra sitede görünecek. Teşekkürler!",
  yayinda: "Bu sipariş için yazdığın yorum sitede yayında. Teşekkürler!",
  gizli: "Bu sipariş için yazdığın yorumu almıştım, teşekkürler!",
};

function ReviewPage() {
  const params = useSearchParams();
  const [found, setFound] = useState<Found | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div className={`wrap ${styles.page}`}>
      <h1>Yorum yaz</h1>
      <p className={`muted ${styles.lead}`}>
        Kılıfını aldıysan nasıl bulduğunu yazar mısın? Yorumunu okuyup onayladıktan sonra
        ana sayfadaki yorumların arasına ekliyorum.
      </p>

      {done ? (
        <div className={`panel ${styles.panel} ${styles.thanks}`} role="status">
          <h2>Teşekkür ederim!</h2>
          <p>Yorumunu aldım. Okuyup onayladıktan sonra sitede görünecek.</p>
          <Link className="btn btn--ghost" href="/#yorumlar">Diğer yorumlara bak</Link>
        </div>
      ) : !found ? (
        <CodeStep initial={params.get("kod") ?? ""} onFound={setFound} />
      ) : found.review ? (
        <div className={`panel ${styles.panel}`} role="status">
          <p>{STATUS_TEXT[found.review.status]}</p>
          <Link className="btn btn--ghost" href="/#yorumlar">Yorumlara bak</Link>
        </div>
      ) : (
        <ReviewForm
          found={found}
          onDone={() => {
            setDone(true);
            rain();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ReviewPage />
    </Suspense>
  );
}
