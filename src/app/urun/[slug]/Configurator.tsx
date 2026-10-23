"use client";

import Link from "next/link";
import { useState } from "react";
import {
  defaultOptions,
  isHttpUrl,
  KILIF_LABEL,
  mediaOf,
  mediaSource,
  priceFor,
  siblings,
  validOptions,
  type Product,
} from "@/data/products";
import { formatTL, site } from "@/data/site";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/CatalogProvider";
import { useProductDraft } from "@/lib/productDraft";
import { burst } from "@/components/Glitter";
import PhotoFrame from "@/components/PhotoFrame";
import ProductImage from "@/components/ProductImage";
import ProductVideo from "@/components/ProductVideo";
import AgendaFields from "./AgendaFields";
import styles from "./product.module.css";

const sizeOk = (v: string) => /^\d{1,2}([.,]\d{1,2})?$/.test(v.trim());

export default function Configurator({ product }: { product: Product }) {
  const { add } = useCart();
  // Doldurulan alanlar ajandanın grubuna göre saklanır: Şeffaf/Simli ilanı arasında
  // geçince kaybolmaz (src/lib/productDraft.ts)
  const { draft, update, clear } = useProductDraft(product.grup);
  const merged = { ...defaultOptions(product), ...draft.options };
  const selected = validOptions(product, merged) ? merged : defaultOptions(product);
  const { custom, note, qty, agenda } = draft;
  const { products, rules, shipping, productHref } = useCatalog();
  // bu türün fotoğrafı yoksa diğer türünkiler; seçim değişse de fotoğraf değişmez
  const source = mediaSource(products, product);
  const media = mediaOf(source);
  const photo = draft.photo?.source === source.slug ? draft.photo.index : 0;
  const setPhoto = (index: number) => update({ photo: { source: source.slug, index } });
  const current = media[photo] ?? media[0];
  const [tried, setTried] = useState(false);
  const [added, setAdded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const kinds = siblings(products, product);
  const seffafPrice = kinds.find((k) => k.kilif === "seffaf")?.basePrice ?? product.basePrice;

  const price = priceFor(product, selected);
  const agendaName = agenda.name.trim();
  const agendaLink = agenda.link.trim();
  const nameError =
    agendaName.length < rules.agendaNameMin
      ? "Ajandanın tam adını renk ve desenine kadar yaz."
      : undefined;
  const linkError =
    agendaLink && !isHttpUrl(agendaLink)
      ? "Bağlantı https:// ile başlamalı."
      : undefined;
  const customErrors = product.customSize
    ? {
        en: !sizeOk(custom.en),
        boy: !sizeOk(custom.boy),
        sirt: !sizeOk(custom.sirt),
      }
    : null;
  const customInvalid = customErrors && Object.values(customErrors).some(Boolean);

  const onAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTried(true);
    if (customInvalid || nameError || linkError || uploading) {
      const first = nameError ? "agenda-name" : linkError ? "agenda-link" : "size-en";
      document.getElementById(first)?.focus();
      return;
    }
    add(
      {
        slug: product.slug,
        options: selected,
        custom: product.customSize ? custom : undefined,
        note: note.trim() || undefined,
        agenda: {
          name: agendaName,
          link: agendaLink || undefined,
          imageId: agenda.imageId,
        },
        agendaThumb: agenda.thumb,
      },
      qty,
    );
    setAdded(true);
    setTried(false);
    // ajanda bilgisi ve not temizlenir; seçenekler, ölçüler ve adet kalır
    clear({ options: draft.options, custom: draft.custom, qty: draft.qty });
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + 6, 22);
    const cart = document.getElementById("cart-link")?.getBoundingClientRect();
    if (cart) setTimeout(() => burst(cart.left + cart.width / 2, cart.bottom - 6, 12), 260);
  };

  return (
    <div className={styles.layout}>
      <div className={styles.gallery}>
        <PhotoFrame className={styles.mainPhoto}>
          {current?.kind === "video" ? (
            <ProductVideo
              key={current.name}
              name={current.name}
              poster={current.poster}
              label={`${product.name} ${KILIF_LABEL[product.kilif].toLowerCase()} kılıf videosu`}
            />
          ) : current?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.src} alt={`${product.name} için diktiğim ${KILIF_LABEL[product.kilif].toLowerCase()} kılıf`} />
          ) : (
            <ProductImage product={product} sizes="(max-width: 860px) 100vw, 560px" />
          )}
        </PhotoFrame>
        {media.length > 1 ? (
          <div className={styles.thumbs}>
            {media.map((m, i) => (
              <button
                key={m.kind === "video" ? m.name : m.src}
                type="button"
                className={styles.thumb}
                aria-pressed={photo === i}
                aria-label={m.kind === "video" ? `Video (${i + 1}/${media.length})` : `${i + 1}. fotoğraf`}
                onClick={() => setPhoto(i)}
              >
                {m.kind === "video" ? (
                  <span className="media-thumb-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.poster} alt="" loading="lazy" />
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.src} alt="" loading="lazy" />
                )}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.info}>
        <p className="muted">
          {product.brand} · {product.size} · {KILIF_LABEL[product.kilif]} kılıf
        </p>
        <h1 className={styles.title}>{product.name}</h1>
        <p className={styles.price}>{formatTL(price)}</p>
        <p className={styles.desc}>{product.description}</p>

        {kinds.length > 1 ? (
          <fieldset className={styles.option}>
            <legend>Kılıf</legend>
            <div className={styles.chips}>
              {/* Her kılıf türü ayrı ilan; geçince doldurduğun alanlar aynen kalır */}
              {kinds.map((k) => {
                const delta = k.basePrice - seffafPrice;
                return (
                  <Link
                    key={k.slug}
                    href={productHref(k)}
                    scroll={false}
                    className={`${styles.chip} ${styles.kind}`}
                    aria-current={k.slug === product.slug ? "page" : undefined}
                    data-burst={k.kilif === "simli" ? "16" : undefined}
                  >
                    <span>
                      {KILIF_LABEL[k.kilif]}
                      {delta > 0 ? <small className={styles.delta}>+{formatTL(delta)}</small> : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {product.options.map((opt) => (
          <fieldset key={opt.id} className={styles.option}>
            <legend>{opt.label}</legend>
            {opt.hint ? <p className="field__hint">{opt.hint}</p> : null}
            <div className={styles.chips}>
              {opt.choices.map((c) => (
                <label key={c.value} className={styles.chip}>
                  <input
                    type="radio"
                    name={opt.id}
                    value={c.value}
                    checked={selected[opt.id] === c.value}
                    onChange={() => {
                      update({ options: { ...selected, [opt.id]: c.value } });
                      setAdded(false);
                    }}
                  />
                  <span>
                    {c.label}
                    {c.priceDelta ? (
                      <small className={styles.delta}>+{formatTL(c.priceDelta)}</small>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <AgendaFields
          value={agenda}
          onChange={(v) => {
            update({ agenda: v });
            setAdded(false);
          }}
          example={product.agendaExample}
          nameError={tried ? nameError : undefined}
          linkError={tried ? linkError : undefined}
          onUploadingChange={setUploading}
        />

        {product.customSize ? (
          <fieldset className={styles.option}>
            <legend>Ajandanın ölçüleri (cm)</legend>
            <p className="field__hint">
              Kapak kapalıyken ölç. Kesin olmak için ölçerken cetvel kullan.
            </p>
            <div className={styles.sizes}>
              {(
                [
                  ["en", "En"],
                  ["boy", "Boy"],
                  ["sirt", "Sırt kalınlığı"],
                ] as const
              ).map(([k, label]) => (
                <div className="field" key={k}>
                  <label htmlFor={`size-${k}`}>{label}</label>
                  <input
                    id={`size-${k}`}
                    className="input"
                    inputMode="decimal"
                    placeholder={k === "sirt" ? "2,5" : k === "en" ? "15" : "21"}
                    value={custom[k]}
                    aria-invalid={tried && customErrors?.[k] ? true : undefined}
                    onChange={(e) => update({ custom: { ...custom, [k]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            {tried && customInvalid ? (
              <p className="field__error" role="alert">
                Üç ölçüyü de santim olarak yaz (ör. 14,8).
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <div className={`field ${styles.option}`}>
          <label htmlFor="note">Notun (isteğe bağlı)</label>
          <textarea
            id="note"
            className="input"
            rows={2}
            maxLength={300}
            placeholder="Eklemek istediğin bir şey varsa yaz."
            value={note}
            onChange={(e) => update({ note: e.target.value })}
          />
        </div>

        <div className={styles.buy}>
          <div className="qty" aria-label="Adet">
            <button type="button" onClick={() => update({ qty: Math.max(1, qty - 1) })} aria-label="Bir azalt">−</button>
            <span aria-live="polite">{qty}</span>
            <button type="button" onClick={() => update({ qty: Math.min(rules.maxQty, qty + 1) })} aria-label="Bir artır">+</button>
          </div>
          <button type="button" className={`btn ${styles.addBtn}`} data-burst="0" onClick={onAdd} disabled={uploading}>
            {uploading ? "Görsel yükleniyor…" : `Sepete ekle · ${formatTL(price * qty)}`}
          </button>
        </div>

        {added ? (
          <p className={styles.added} role="status">
            Sepetine eklendi. <Link href="/sepet">Sepete git</Link> ya da{" "}
            <Link href="/#kiliflar">başka bir kılıfa bak</Link>.
          </p>
        ) : null}

        <ul className={styles.facts}>
          <li>{site.productionDays} içinde dikip kargoya veriyorum.</li>
          <li>Kargo ücreti {formatTL(shipping)}.</li>
          <li>Ajandana tam oturmazsa yenisini dikiyorum.</li>
        </ul>
      </div>
    </div>
  );
}
