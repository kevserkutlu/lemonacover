"use client";

import { useRef, useState } from "react";
import { useCatalog } from "@/lib/CatalogProvider";
import { prepareImage } from "@/lib/resizeImage";
import { uploadImage } from "@/lib/api";
import styles from "./product.module.css";

export type AgendaDraft = {
  name: string;
  link: string;
  imageId?: string;
  thumb?: string;
};

type Props = {
  value: AgendaDraft;
  onChange: (v: AgendaDraft) => void;
  example: string;
  nameError?: string;
  linkError?: string;
  onUploadingChange: (busy: boolean) => void;
};

export default function AgendaFields({
  value,
  onChange,
  example,
  nameError,
  linkError,
  onUploadingChange,
}: Props) {
  const { rules } = useCatalog();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const setUploading = (b: boolean) => {
    setBusy(b);
    onUploadingChange(b);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Bir görsel dosyası seç (JPG, PNG).");
      return;
    }
    setUploading(true);
    try {
      const { blob, thumb } = await prepareImage(file);
      const { id } = await uploadImage(blob);
      onChange({ ...value, imageId: id, thumb });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Görsel yüklenemedi, tekrar dene.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <fieldset className={styles.option}>
      <legend>Ajandanı anlat</legend>

      <div className="field">
        <label htmlFor="agenda-name">Ajandanın tam adı</label>
        <input
          id="agenda-name"
          className="input"
          value={value.name}
          maxLength={rules.agendaNameMax}
          placeholder={example}
          aria-invalid={nameError ? true : undefined}
          aria-describedby="agenda-name-hint"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
        <span id="agenda-name-hint" className="field__hint">
          Marka, model, yıl ve renk ya da desen adıyla birlikte yaz. Aynı rengin
          tonları bile farklı olabiliyor; dikiş rengini buna göre seçiyorum.
        </span>
        {nameError ? <span className="field__error">{nameError}</span> : null}
      </div>

      <div className="field">
        <span className="label" id="agenda-image-label">
          Ajandanın görseli <span className="muted">(isteğe bağlı)</span>
        </span>
        {value.imageId && value.thumb ? (
          <div className={styles.upload}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.thumb} alt="Yüklediğin ajanda görseli" className={styles.uploadThumb} />
            <span>Görsel eklendi.</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => onChange({ ...value, imageId: undefined, thumb: undefined })}
            >
              Kaldır
            </button>
          </div>
        ) : (
          <label
            className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
            aria-labelledby="agenda-image-label"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              upload(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/*"
              className="visually-hidden"
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0])}
            />
            {busy ? (
              <span>Yükleniyor…</span>
            ) : (
              <>
                <span className={styles.dropTitle}>Görsel seç ya da buraya sürükle</span>
                <span className="field__hint">
                  Satın aldığın sitedeki ürün görseli ya da kendi çektiğin bir fotoğraf olabilir.
                </span>
              </>
            )}
          </label>
        )}
        {error ? <span className="field__error" role="alert">{error}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="agenda-link">
          Ürün bağlantısı <span className="muted">(isteğe bağlı)</span>
        </label>
        <input
          id="agenda-link"
          className="input"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={value.link}
          aria-invalid={linkError ? true : undefined}
          onChange={(e) => onChange({ ...value, link: e.target.value })}
        />
        {linkError ? <span className="field__error">{linkError}</span> : null}
      </div>
    </fieldset>
  );
}
