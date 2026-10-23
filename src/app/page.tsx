import Link from "next/link";
import Curtains from "@/components/Curtains";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import ReviewWall, { RatingStars } from "@/components/ReviewWall";
import { site } from "@/data/site";
import styles from "./home.module.css";

export default function Home() {
  return (
    <>
      <Curtains />
      <Hero />

      <section id="kiliflar" className="wrap section section--after-hero">
        <div className="section__head section__head--stack">
          <h2>Ajandanın modelini seç</h2>
          <p className="muted">
            Markanı seç. Ajandan listede yoksa ya da özel ölçüyse{" "}
            <Link href="/istek">bana fotoğrafıyla sor</Link>; dikebiliyorsam fiyatıyla dönerim.
          </p>
        </div>
        <ProductGrid />
      </section>

      <section className="wrap section">
        <h2 className={styles.stepsTitle}>Siparişini nasıl hazırlıyorum</h2>
        <ol className={styles.steps}>
          <li>
            <h3>Ajandanı anlatıyorsun</h3>
            <p className="muted">
              Tam adını renk ve desenine kadar yazıyorsun, istersen görselini
              ekliyorsun. Dikiş rengini ona göre seçiyorum.
            </p>
          </li>
          <li>
            <h3>Ölçüp dikiyorum</h3>
            <p className="muted">
              Kılıfı ajandanın kapağına göre ölçüp kesiyor, elde dikiyorum. Bu{" "}
              {site.productionDays} sürüyor.
            </p>
          </li>
          <li>
            <h3>Özenle paketleyip yolluyorum</h3>
            <p className="muted">
              Kargo takip numarasını e-postana yolluyorum; sipariş takibi
              sayfasından da bakabilirsin.
            </p>
          </li>
        </ol>
      </section>

      <section id="yorumlar" className={styles.reviewsBand}>
        <div className="wrap">
          <div className="section__head">
            <h2 className={styles.reviewsTitle}>
              Kılıfını alanlar ne dedi <RatingStars />
            </h2>
          </div>
          <ReviewWall />
        </div>
      </section>
    </>
  );
}
