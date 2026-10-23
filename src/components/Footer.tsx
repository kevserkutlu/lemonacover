import Link from "next/link";
import { site } from "@/data/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <div>
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marka/logo.png" alt="" width={214} height={203} />
            <span className="footer-mark">lemona cover</span>
          </div>
          <p>
            Şeffaf ve simli ajanda kılıflarını ajandanın modeline göre ölçüp
            elde dikiyorum. Siparişini {site.productionDays} içinde kargoya veriyorum.
          </p>
          <p style={{ marginTop: 10 }}>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>
        <div>
          <h3>Alışveriş</h3>
          <ul>
            <li><Link href="/#kiliflar">Kılıflar</Link></li>
            <li><Link href="/siparis-takip">Sipariş takibi</Link></li>
            <li><Link href="/istek">Özel istek</Link></li>
            <li><Link href="/yorum">Yorum yaz</Link></li>
            <li><a href={site.sources.dolap.url} target="_blank" rel="noopener">Dolap mağazam</a></li>
            <li><a href={site.sources.gardrops.url} target="_blank" rel="noopener">Gardrops mağazam</a></li>
          </ul>
        </div>
        <div>
          <h3>Sözleşmeler</h3>
          <ul>
            <li><Link href="/yasal/mesafeli-satis">Mesafeli satış sözleşmesi</Link></li>
            <li><Link href="/yasal/on-bilgilendirme">Ön bilgilendirme formu</Link></li>
            <li><Link href="/yasal/iade">İade ve değişim</Link></li>
            <li><Link href="/yasal/kvkk">KVKK aydınlatma metni</Link></li>
            <li><Link href="/yasal/cerez">Çerez politikası</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
