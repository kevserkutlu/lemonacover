import { notFound } from "next/navigation";
import { site, formatTL } from "@/data/site";
import { getCatalog } from "@/lib/catalogServer";
import styles from "./legal.module.css";

// ÖNEMLİ: Bu metinler taslaktır. Yayına almadan önce [köşeli parantezli]
// alanları doldur ve bir avukat ya da mali müşavire kontrol ettir.
// Sanal POS firmaları başvuruda bu sayfaların sitede olmasını istiyor.

const s = site.seller;

/** Kargo ücreti veritabanından (build sırasında API'den) */
async function ShippingFee() {
  const { shipping } = await getCatalog();
  return <>{formatTL(shipping)}</>;
}

const pages: Record<string, { title: string; body: React.ReactNode }> = {
  "on-bilgilendirme": {
    title: "Ön bilgilendirme formu",
    body: (
      <>
        <h2>Satıcı</h2>
        <p>
          Unvan: {s.title}
          <br />
          Adres: {s.address}
          <br />
          Telefon: {s.phone}
          <br />
          E-posta: {site.email}
          <br />
          Vergi bilgisi: {s.taxInfo}
        </p>
        <h2>Ürün ve fiyat</h2>
        <p>
          Siparişindeki ürünlerin adı, seçenekleri, adedi, vergiler dahil satış
          fiyatı ve kargo ücreti ödeme sayfasındaki sipariş özetinde yazıyor.
          {" "}Kargo ücreti her sipariş için <ShippingFee />.
        </p>
        <h2>Ödeme ve teslimat</h2>
        <p>
          Ödemeyi kredi kartı / banka kartı ile alıyorum. Kılıfları sipariş
          üzerine dikiyorum ve ödemen onaylandıktan sonra {site.productionDays}
          içinde kargoya veriyorum. Teslimat süresi yasal 30 günlük süreyi aşmaz.
        </p>
        <h2>Cayma hakkı</h2>
        <p>
          [Mesafeli Sözleşmeler Yönetmeliği md. 15/1-ç uyarınca tüketicinin
          istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan mallarda
          cayma hakkı kullanılamaz. Hangi ürünlerin bu kapsamda olduğunu
          avukatınla netleştir; standart ölçülü kılıflar için 14 günlük cayma
          hakkı tanıman gerekebilir.]
        </p>
        <h2>Şikâyet ve itiraz</h2>
        <p>
          Şikâyetlerini {site.email} adresine iletebilirsin. Uyuşmazlıklarda
          Ticaret Bakanlığı’nca ilan edilen parasal sınırlar dahilinde Tüketici
          Hakem Heyetleri’ne veya Tüketici Mahkemeleri’ne başvurabilirsin.
        </p>
      </>
    ),
  },
  "mesafeli-satis": {
    title: "Mesafeli satış sözleşmesi",
    body: (
      <>
        <p>
          [Bu sözleşme 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve
          Mesafeli Sözleşmeler Yönetmeliği’ne göre hazırlanmalıdır. Taraflar,
          konu, ürün bilgileri, ödeme, teslimat, cayma hakkı, temerrüt ve
          yetkili mahkeme maddelerini içermelidir.]
        </p>
        <h2>Taraflar</h2>
        <p>
          Satıcı: {s.title}, {s.address}
          <br />
          Alıcı: Sipariş sırasında bilgileri girilen kişi.
        </p>
        <h2>Konu</h2>
        <p>
          Alıcının sitede sipariş verdiği ürünlerin satışı ve teslimi ile
          tarafların hak ve yükümlülükleri.
        </p>
        <p>[Kalan maddeleri doldur.]</p>
      </>
    ),
  },
  iade: {
    title: "İade ve değişim",
    body: (
      <>
        <p>
          Kılıfları ajanda modeline göre elde dikiyorum. Kılıf ajandana tam
          oturmazsa ya da üründe dikiş hatası varsa teslimattan sonraki 14 gün
          içinde {site.email} adresine fotoğrafla yaz; yenisini dikerim ya da
          ücretini iade ederim.
        </p>
        <p>[Cayma hakkı politikanı ön bilgilendirme formuyla uyumlu olacak şekilde netleştir.]</p>
      </>
    ),
  },
  kvkk: {
    title: "KVKK aydınlatma metni",
    body: (
      <>
        <p>
          Veri sorumlusu: {s.title}. 6698 sayılı Kişisel Verilerin Korunması
          Kanunu kapsamında, sipariş sırasında verdiğin ad soyad, telefon,
          e-posta ve adres bilgilerin, isteğe bağlı olarak yüklediğin ajanda
          görseli ve özel istek için gönderdiğin ajanda fotoğrafları; siparişini hazırlamak, kargolamak, faturalandırmak ve seninle
          iletişim kurmak amacıyla, sözleşmenin kurulması ve ifası ile hukuki
          yükümlülüklerimin yerine getirilmesi hukuki sebeplerine dayanarak
          işliyorum.
        </p>
        <p>
          Bu bilgileri yalnızca kargo firması, ödeme kuruluşu ve mali müşavirimle,
          bu amaçlarla sınırlı olarak paylaşıyorum. Kart bilgilerin bana gelmiyor
          ve bu sitede saklanmıyor; onları ödeme kuruluşu işliyor. IP adresini
          açık olarak tutmuyorum; kötüye kullanımı önlemek için yalnızca
          şifrelenmiş (hash) halini saklıyorum.
        </p>
        <p>
          KVKK’nın 11. maddesindeki haklarını kullanmak için {site.email}
          {" "}adresine yazabilirsin.
        </p>
        <h2>Pazar yeri yorumları</h2>
        <p>
          Sitede gösterdiğim pazar yeri yorumları Dolap ve Gardrops mağazalarımda
          herkese açık olarak yazıldı. Kullanıcı adlarını kısaltarak gösteriyorum.
          Sitede kendi yazdığın yorumları ve fotoğrafları, yayınlanmasına izin
          verdiğin için onayladıktan sonra gösteriyorum. Yorumunun sitede yer
          almasını istemiyorsan {site.email} adresine yazman yeterli; hemen
          kaldırırım.
        </p>
      </>
    ),
  },
  cerez: {
    title: "Çerez politikası",
    body: (
      <>
        <p>
          Bu sitede reklam ya da takip çerezi kullanmıyorum. Sepetin, tarayıcının
          yerel depolama alanında duruyor ve yalnızca senin cihazında kalıyor.
        </p>
        <p>[Analiz aracı eklersen bu metni ve çerez onayını güncelle.]</p>
      </>
    ),
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: pages[slug]?.title };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return (
    <article className={`wrap ${styles.page}`}>
      <h1>{page.title}</h1>
      {page.body}
    </article>
  );
}
