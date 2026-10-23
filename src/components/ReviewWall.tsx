"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { maskName, reviews } from "@/data/reviews";
import { site } from "@/data/site";
import { listSiteReviews, type ReviewPhoto, type SiteReview } from "@/lib/api";
import { starPath } from "@/lib/star";
import styles from "./ReviewWall.module.css";

// kullanıcı simgesi: logodaki gibi yıldız (yüzsüz), çizgisiz, sağ alta düşen gölgeyle
const STAR_FILLS = ["#e8d3a9", "#f0ccd8", "#e2dbc8", "#c9cbe0"];

const STAR_D = starPath(14, 15, 13);
// puanların yanındaki beş sarı yıldız (iki mağazanın 5.0 puanına birden)
const RATING_STAR_D = starPath(12, 12.8, 11);

function UserStar({ fill }: { fill: string }) {
  return (
    <svg className={styles.avatar} viewBox="0 0 28 28" aria-hidden="true">
      <path d={STAR_D} fill={fill} />
    </svg>
  );
}

/** Beş sarı yıldız: iki mağazanın 5.0 puanına birden; yorumlar başlığının hemen yanında */
export function RatingStars() {
  return (
    <span className={styles.ratingStars} role="img" aria-label="5 üzerinden 5 yıldız">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true">
          <path d={RATING_STAR_D} />
        </svg>
      ))}
    </span>
  );
}

const STEP = 9;

// Sitede yazılan yorumlar (API'den) ve pazar yerlerinden gelenler tek listede
type Item =
  | { kind: "site"; review: SiteReview }
  | { kind: "market"; source: "dolap" | "gardrops"; user?: string; text: string };

/** Fotoğrafı büyütüp göstermek için basit pencere */
function Lightbox({ photo, alt, onClose }: { photo: ReviewPhoto | null; alt: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (photo && !d.open) d.showModal();
    if (!photo && d.open) d.close();
  }, [photo]);
  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={alt} width={photo.width} height={photo.height} />
          <button className={styles.lightboxClose} onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </>
      ) : null}
    </dialog>
  );
}

export default function ReviewWall() {
  const [shown, setShown] = useState(STEP);
  const [siteReviews, setSiteReviews] = useState<SiteReview[]>([]);
  const [open, setOpen] = useState<{ photo: ReviewPhoto; alt: string } | null>(null);

  useEffect(() => {
    let alive = true;
    listSiteReviews().then((r) => alive && setSiteReviews(r));
    return () => {
      alive = false;
    };
  }, []);

  const all: Item[] = [
    ...siteReviews.map((review) => ({ kind: "site" as const, review })),
    ...reviews.map((r) => ({ kind: "market" as const, ...r })),
  ];
  const list = all.slice(0, shown);

  return (
    <>
      <div className={styles.ratings}>
        <div className={styles.sources}>
        {siteReviews.length ? (
          <span className={styles.source}>
            <strong>{siteReviews.length}</strong> sitede yazılan yorum
          </span>
        ) : null}
        {(["gardrops", "dolap"] as const).map((k) => {
          const s = site.sources[k];
          return (
            <a key={k} href={s.url} target="_blank" rel="noopener" className={styles.source}>
              <strong>{s.rating}</strong> {s.label}’ta {s.count} değerlendirme
            </a>
          );
        })}
        </div>
      </div>

      <ul className={styles.wall}>
        {list.map((item, i) => {
          const tilt = ((i * 37) % 7) - 3; // -3..3 derece
          const style = { "--tilt": `${tilt * 0.45}deg` } as React.CSSProperties;
          const tape = i % 3 === 0 ? <span className={`tape ${styles.tape}`} aria-hidden="true" /> : null;
          const star = <UserStar fill={STAR_FILLS[i % STAR_FILLS.length]} />;

          if (item.kind === "site") {
            const r = item.review;
            return (
              <li key={`s${r.id}`} className={`${styles.note} paper`} style={style}>
                {tape}
                {r.photos.length ? (
                  <div className={styles.photos} data-count={r.photos.length}>
                    {r.photos.map((p, j) => {
                      const alt = `${r.name} adlı alıcının ${r.products} fotoğrafı`;
                      return (
                        <button key={j} className={styles.photoBtn} onClick={() => setOpen({ photo: p, alt })} aria-label={`Fotoğrafı büyüt (${j + 1}/${r.photos.length})`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.thumb} alt={alt} loading="lazy" decoding="async" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <p className={styles.text}>{r.text}</p>
                <div className={styles.meta}>
                  <span className={styles.user}>
                    {star}
                    {r.name}
                  </span>
                  <span className={styles.verified} title={r.products}>Siteden aldı</span>
                </div>
              </li>
            );
          }

          const src = site.sources[item.source];
          return (
            <li key={`m${i}`} className={`${styles.note} paper`} style={style}>
              {tape}
              <p className={styles.text}>{item.text}</p>
              <div className={styles.meta}>
                <span className={styles.user}>
                  {star}
                  {item.user ? maskName(item.user) : `${src.label} alıcısı`}
                </span>
                <a href={src.url} target="_blank" rel="noopener">
                  {src.label}
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {shown < all.length ? (
        <div className={styles.more}>
          <button className="btn btn--ghost" onClick={() => setShown((n) => n + STEP)}>
            Daha fazla yorum göster
          </button>
        </div>
      ) : null}

      <div className={styles.write}>
        <p>Kılıfını benden aldıysan, teşekkür kartındaki kodla yorumunu ve fotoğraflarını ekleyebilirsin.</p>
        <Link className="btn btn--ghost" href="/yorum">Yorum yaz</Link>
      </div>

      <p className={styles.disclaimer}>
        Sitedeki yorumları siparişi alan kişiler, kartlarındaki yorum koduyla yazdı.
        Gardrops yorumlarında kullanıcı adlarını kısalttım (Dolap alıcı adını
        göstermiyor); asıl yorumları mağaza profillerimde görebilirsin.
      </p>

      <Lightbox photo={open?.photo ?? null} alt={open?.alt ?? ""} onClose={() => setOpen(null)} />
    </>
  );
}
