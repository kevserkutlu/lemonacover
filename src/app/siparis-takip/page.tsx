"use client";

import Link from "next/link";
import { useState } from "react";
import { formatTL, site } from "@/data/site";
import { ApiError, groupCode, trackOrder } from "@/lib/api";
import styles from "./track.module.css";

type Result = {
  id: string;
  createdAt: string;
  status: "odeme-bekleniyor" | "hazirlaniyor" | "kargoda" | "teslim-edildi" | "iptal";
  trackingCode: string | null;
  carrier?: string | null;
  lines: { name: string; details: string[]; qty: number }[];
  total: number;
  reviewCode?: string | null;
};

const STEPS = [
  { key: "hazirlaniyor", label: "Dikiyorum" },
  { key: "kargoda", label: "Kargoda" },
  { key: "teslim-edildi", label: "Teslim edildi" },
] as const;

export default function TrackPage() {
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await trackOrder(id, phone));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bir şeyler ters gitti, tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = result ? STEPS.findIndex((s) => s.key === result.status) : -1;

  return (
    <div className={`wrap ${styles.page}`}>
      <h1>Sipariş takibi</h1>
      <p className="muted">
        Sipariş numaran onay e-postasında yazıyor (ör. LC-48213; sadece rakamları
        yazman da yeterli). Üyelik gerekmez.
      </p>

      <form className={styles.form} onSubmit={submit}>
        <div className="field">
          <label htmlFor="t-id">Sipariş numarası</label>
          <input
            id="t-id"
            className="input"
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            placeholder="LC-48213"
            autoCapitalize="characters"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="t-phone">Telefonunun son 4 hanesi</label>
          <input
            id="t-phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="1234"
            required
          />
        </div>
        <button className="btn" disabled={busy || !id || phone.length !== 4}>
          {busy ? "Bakılıyor…" : "Siparişi bul"}
        </button>
      </form>

      {error ? <p className="field__error" role="alert">{error}</p> : null}

      {result ? (
        <div className={`panel ${styles.result}`} aria-live="polite">
          <div className="summary-row">
            <strong>{result.id}</strong>
            <span className="muted">
              {new Date(result.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {result.status === "iptal" ? (
            <p>Bu sipariş iptal edildi.</p>
          ) : result.status === "odeme-bekleniyor" ? (
            <p>Bu siparişin ödemesi tamamlanmamış.</p>
          ) : (
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s.key} data-done={i <= stepIndex} data-current={i === stepIndex}>
                  {s.label}
                </li>
              ))}
            </ol>
          )}

          {result.trackingCode ? (
            <p>
              {result.carrier || site.carrierName} takip no: <strong>{result.trackingCode}</strong>
              {site.carrierTrackingUrl ? (
                <>
                  {" "}
                  <a href={site.carrierTrackingUrl + encodeURIComponent(result.trackingCode)} target="_blank" rel="noopener">
                    Kargoda nerede?
                  </a>
                </>
              ) : null}
            </p>
          ) : null}

          <ul className={styles.lines}>
            {result.lines.map((l, i) => (
              <li key={i}>
                {l.name} {l.qty > 1 ? `× ${l.qty}` : ""}
                <span className="field__hint"> {l.details.join(", ")}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row summary-row--total">
            <span>Toplam</span>
            <span>{formatTL(result.total)}</span>
          </div>

          {result.reviewCode ? (
            <div className="notice">
              Kılıfın eline ulaştıysa nasıl bulduğunu yazar mısın? Yorum kodun:{" "}
              <strong>{groupCode(result.reviewCode)}</strong>
              <div style={{ marginTop: 10 }}>
                <Link className="btn" href={`/yorum/?kod=${result.reviewCode}`}>Yorum yaz</Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
