"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { iller } from "@/data/iller";
import { formatTL } from "@/data/site";
import { useCartLines } from "@/lib/useCartLines";
import { ApiError, createOrder } from "@/lib/api";
import OrderSummary from "@/components/OrderSummary";
import styles from "./checkout.module.css";

type Form = {
  name: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  note: string;
};

const without = (o: Record<string, string>, k: string) => {
  const next = { ...o };
  delete next[k];
  return next;
};

const empty: Form = { name: "", email: "", phone: "", city: "", district: "", address: "", note: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, ready, subtotal, shipping, total } = useCartLines();
  const [form, setForm] = useState<Form>(empty);
  const [contract, setContract] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);

  if (!ready) return <div className="wrap section" />;
  if (lines.length === 0) {
    return (
      <div className="wrap section" style={{ display: "grid", gap: 16, justifyItems: "start" }}>
        <h1>Sepetin boş</h1>
        <p className="muted">Siparişi tamamlamak için önce sepete bir kılıf ekle.</p>
        <Link href="/#kiliflar" className="btn">Kılıflara bak</Link>
      </div>
    );
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => without(prev, k));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFormError("");
    try {
      const { redirectUrl } = await createOrder({
        customer: form,
        contractAccepted: contract,
        items: lines.map(({ item }) =>
          item.request
            ? { requestCode: item.request.code, note: item.note, qty: item.qty }
            : {
                slug: item.slug,
                options: item.options,
                custom: item.custom,
                note: item.note,
                agenda: item.agenda,
                qty: item.qty,
              },
        ),
      });
      // ödeme sağlayıcının sayfası başka bir sitede olabilir
      if (/^https?:\/\//.test(redirectUrl)) window.location.assign(redirectUrl);
      else router.push(redirectUrl);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors);
        const first = Object.keys(err.fieldErrors)[0];
        document.getElementById(`f-${first}`)?.focus();
      } else setFormError(err instanceof ApiError ? err.message : "Bir şeyler ters gitti, tekrar dene.");
    } finally {
      setSending(false);
    }
  };

  const field = (
    k: keyof Form,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="field">
      <label htmlFor={`f-${k}`}>{label}</label>
      <input
        id={`f-${k}`}
        className="input"
        value={form[k]}
        onChange={set(k)}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={errors[k] ? `e-${k}` : undefined}
        {...props}
      />
      {errors[k] ? <span id={`e-${k}`} className="field__error">{errors[k]}</span> : null}
    </div>
  );

  return (
    <form className={`wrap ${styles.page}`} onSubmit={submit} noValidate>
      <h1 className={styles.title}>Siparişi tamamla</h1>
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.block}>
            <h2>İletişim</h2>
            <p className="field__hint">
              Sipariş onayını ve kargo takip numarasını bu adrese yolluyorum. Üye olmana gerek yok.
            </p>
            <div className={styles.two}>
              {field("name", "Ad soyad", { autoComplete: "name" })}
              {field("phone", "Telefon", { autoComplete: "tel", inputMode: "tel", placeholder: "05xx xxx xx xx" })}
            </div>
            {field("email", "E-posta", { autoComplete: "email", type: "email", inputMode: "email" })}
          </section>

          <section className={styles.block}>
            <h2>Teslimat adresi</h2>
            <div className={styles.two}>
              <div className="field">
                <label htmlFor="f-city">İl</label>
                <select
                  id="f-city"
                  className="input"
                  value={form.city}
                  onChange={set("city")}
                  autoComplete="address-level1"
                  aria-invalid={errors.city ? true : undefined}
                >
                  <option value="">Seç</option>
                  {iller.map((il) => (
                    <option key={il}>{il}</option>
                  ))}
                </select>
                {errors.city ? <span className="field__error">{errors.city}</span> : null}
              </div>
              {field("district", "İlçe", { autoComplete: "address-level2" })}
            </div>
            <div className="field">
              <label htmlFor="f-address">Adres</label>
              <textarea
                id="f-address"
                className="input"
                rows={3}
                value={form.address}
                onChange={set("address")}
                autoComplete="street-address"
                placeholder="Mahalle, sokak, bina ve daire numarası"
                aria-invalid={errors.address ? true : undefined}
              />
              {errors.address ? <span className="field__error">{errors.address}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="f-note">Sipariş notu (isteğe bağlı)</label>
              <textarea id="f-note" className="input" rows={2} value={form.note} onChange={set("note")} />
            </div>
          </section>

          <section className={styles.block}>
            <h2>Ödeme</h2>
            <p className="muted">
              Kart bilgilerini bir sonraki adımda, bankanın güvenli ödeme sayfasında
              gireceksin. Kart bilgilerin bana gelmiyor, bu sitede de saklanmıyor.
            </p>
          </section>
        </div>

        <aside className={styles.aside}>
          <div className="panel">
            <h2 className={styles.asideTitle}>Siparişin</h2>
            <ul className={styles.items}>
              {lines.map(({ item, name, details, lineTotal }) => (
                <li key={item.key}>
                  <div className="summary-row">
                    <span>
                      {name} {item.qty > 1 ? `× ${item.qty}` : ""}
                    </span>
                    <span>{formatTL(lineTotal)}</span>
                  </div>
                  <span className="field__hint">{details.join(", ")}</span>
                </li>
              ))}
            </ul>
            <Link href="/sepet" className={styles.edit}>Sepeti düzenle</Link>
          </div>

          <OrderSummary subtotal={subtotal} shipping={shipping} total={total}>
            <label className="check" style={{ marginTop: 6 }}>
              <input
                id="f-contract"
                type="checkbox"
                checked={contract}
                onChange={(e) => {
                  setContract(e.target.checked);
                  if (errors.contract) setErrors((prev) => without(prev, "contract"));
                }}
              />
              <span>
                <Link href="/yasal/on-bilgilendirme" target="_blank">Ön bilgilendirme formunu</Link> ve{" "}
                <Link href="/yasal/mesafeli-satis" target="_blank">mesafeli satış sözleşmesini</Link>{" "}
                okudum, onaylıyorum.
              </span>
            </label>
            {errors.contract ? <span className="field__error">{errors.contract}</span> : null}
            <p className="field__hint">
              Kişisel verilerini <Link href="/yasal/kvkk" target="_blank">aydınlatma metnindeki</Link> amaçlarla işliyorum.
            </p>
            {formError ? <p className="field__error" role="alert">{formError}</p> : null}
            <button type="submit" className="btn btn--block" disabled={sending}>
              {sending ? "Hazırlanıyor…" : `Ödemeye geç · ${formatTL(total)}`}
            </button>
          </OrderSummary>
        </aside>
      </div>
    </form>
  );
}
