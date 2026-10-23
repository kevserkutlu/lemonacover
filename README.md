# lemona cover

Şeffaf ve simli ajanda kılıfları için kendi satış sitem. İki parça:

- **Site** (bu klasör): Next.js 16, statik olarak dışa aktarılıyor (`out/`).
- **API** ([api/](api/README.md)): PHP 8.5 + MySQL. Ürünler, fiyatlar, fotoğraf
  listeleri, kargo ücreti, siparişler ve yorumlar **veritabanında**; site hepsini
  API'den alır.

Sayfalar build sırasında API'deki verilerle hazırlanır (Google ve WhatsApp/Instagram
bağlantı önizlemeleri ürünün adını, fiyatını, fotoğrafını görsün diye). Tarayıcı
sayfayı açınca API'den güncel kataloğu da çeker: veritabanında değişen fiyat,
fotoğraf ya da yeni ilan **yeniden build almadan** sitede görünür. Build'den sonra
eklenen ilan, kendi sayfası hazırlanana kadar `/urun/?id=<ilan>` adresinde açılır.

## Bilgisayarda çalıştırma

Önce API'yi çalıştır ([api/README.md](api/README.md) → Bilgisayarında çalıştırma), sonra:

```bash
npm install
npm run dev
```

Sonra tarayıcıda http://localhost:3000 adresini aç. Site API adresini
`.env.development.local` dosyasından alır (`NEXT_PUBLIC_API_URL=http://localhost:8787`).

## Yayına hazırlama (statik dışa aktarma)

`.env.production` dosyasına API adresini yaz (örnek: `.env.example`), sonra:

```bash
npm run build
```

Build ürünleri API'den alır; API'ye ulaşamazsa durur. Bu komut `out/` klasörünü üretir. Klasörün içeriğini herhangi bir statik
barındırmaya (Netlify, Cloudflare Pages, GitHub Pages, hosting firmasının
cPanel'i vb.) olduğu gibi yükleyebilirsin. Yüklemeden önce bilgisayarında
denemek için:

```bash
npm run preview
```

ve http://localhost:4173 adresini aç.

## Sık yapılacak değişiklikler

| Ne                                       | Nerede                         |
| ---------------------------------------- | ------------------------------ |
| Ürünler, fiyatlar, seçenekler, markalar  | veritabanı: `products`, `brands` |
| Kargo ücreti, sipariş kuralları          | veritabanı: `settings`         |
| Ürün fotoğrafları ve videoları           | `fotograflar/` + `npm run fotolar` |
| E-posta, satıcı bilgileri, dikim süresi  | `src/data/site.ts`             |
| Dolap / Gardrops yorumları               | `src/data/reviews.ts`          |
| Sözleşme metinleri                       | `src/app/yasal/[slug]/page.tsx` |

### İlanlar, markalar

Şeffaf ve simli kılıflar **ayrı ilan** (ayrı sayfa, ayrı fotoğraf ve video). Aynı
ajandanın iki ilanı veritabanında (`products`) aynı `grup` değerini taşır; ürün
sayfasındaki Şeffaf / Simli düğmesi diğer ilana geçer ve müşterinin doldurduğu
alanlar (ajanda adı, görsel, ölçüler, not, adet) aynen kalır.

Her ilanın `brand_id` alanı ana sayfadaki marka filtresini belirler (`brands`
tablosu). Yeni ilan için `products` tablosuna şeffaf ve simli iki kayıt eklenir
(slug: `<grup>-seffaf`, `<grup>-simli`); ilk ürünler `api/database/baslangic-urunleri.sql`
ile yüklendi. Hobonichi ve Midori için henüz ilan yok; filtrede seçilince "yakında"
yazar ve özel isteğe yönlendirir. (Yönetim sayfasına "Ürünler" bölümü eklenince
ilanlar oradan düzenlenecek.)

Kargo ücreti sabit; ücretsiz kargo yok.

### Ürün fotoğrafı ve videosu eklemek

Fotoğrafları ve videoları `fotograflar/<ilan>/` klasörüne koyup `npm run fotolar`
çalıştır: ayrıntılar [fotograflar/BENI-OKU.md](fotograflar/BENI-OKU.md). Videolar
simlerin parıltısı kaybolmasın diye yüksek bit hızıyla hazırlanır (macOS gerekir).

Fotoğraf yoksa sitede "Fotoğraf yakında" kartı görünür.

### Müşterinin ajanda bilgisi

Ajanda renkleri marka ve modele göre çok değiştiği için renk seçeneği yok.
Müşteri ürün sayfasında ajandasının **tam adını** (renk/desen dahil) yazıyor;
isterse **görsel** (pazar yeri görseli ya da kendi fotoğrafı) ve **ürün
bağlantısı** ekliyor. Görsel yüklemeden önce tarayıcıda küçültülür ve sipariş
API'ye (`POST /gorsel`) gönderilir; yönetim sayfasında siparişin yanında görünür.

### Özel istekler (listede olmayan / özel ölçü ajandalar)

Bu ajandalar doğrudan satılmaz. Müşteri `/istek` sayfasında ajandasının tam adını,
**en az bir fotoğrafını** (en fazla 3), şeffaf/simli seçimini ve biliyorsa ölçülerini
gönderir; ödeme yok. 6 rakamlı bir **istek kodu** (ör. 482 913) alır ve e-posta gelir.

Yönetim sayfasındaki **İstekler** bölümünde fotoğraflara bakıp ya **fiyat yazarak
onaylarsın** ya da notla **"Dikemiyorum"** dersin; müşteriye e-posta gider. Onaylanan
istek `/istek/?kod=482913` sayfasından sepete eklenip normal sipariş gibi ödenir (fiyat
senin onayladığın; başkası kullanamaz, ödeme alınınca istek kilitlenir).

### Alıcı yorumları (sitede)

Hesap yok: her siparişin 6 rakamlı bir **yorum kodu** var. Yönetim sayfasında
siparişin içinde "Teşekkür kartına yaz" kutusunda görünür
(`lemonacover.com/yorum · kod: 482 913`). Kod ayrıca kargo e-postasında ve sipariş
takibinde de çıkar; kargoya verilmeden çalışmaz. Müşteri `/yorum` sayfasında
kodu girip yorumunu ve en fazla 3 fotoğraf ekler. Yorumlar yönetim sayfasındaki
**Yorumlar** bölümünde onaylanınca ana sayfada görünür; istenmeyen yorum gizlenir
ya da fotoğraflarıyla birlikte silinir.

### Dolap yorumları

Dolap yorumları web sitesinde görünmediği (sadece uygulamada açıldığı) için
otomatik çekilemedi. Ekran görüntülerini `dolap-yorumlari/` klasörüne koyup
Claude'a ekletebilirsin ya da uygulamadan bakıp `src/data/reviews.ts` dosyasına şöyle ekle:

```ts
{ source: "dolap", user: "kullaniciadi", text: "yorum metni" },
```

Kullanıcı adları sitede kısaltılarak gösterilir (ör. `ku•••di`); altında
yorumun nereden geldiği ve mağaza profilinin bağlantısı yazar.

## Sipariş akışı

Ana sayfa → ürün sayfası → sepet → ödeme (üyeliksiz) → banka ödeme sayfası →
sipariş onayı (`/siparis/?no=LC-48213`). Müşteri siparişini **sipariş no +
telefonun son 4 hanesi** ile `/siparis-takip` sayfasından takip eder; hesap
açması gerekmez.

### Sipariş sunucusu (PHP 8.5 + MySQL)

Site statik olduğu için sipariş kaydetme, ödeme, görsel saklama ve yönetim işleri
`api/` klasöründeki PHP API'de. Kurulum ve hostinge yükleme adım adım
[api/README.md](api/README.md) içinde.

- API adresi `NEXT_PUBLIC_API_URL` (yerelde `.env.development.local`, yayında
  `.env.production`; örnek: `.env.example`). Zorunlu: ürünler oradan gelir.
- Sipariş fiyatını ve kargoyu her zaman API veritabanından yeniden hesaplar.

### Yönetim sayfası

`/yonetim` adresinde siparişleri görür, durumunu ("Dikilecek", "Kargoda"…)
ve kargo takip numarasını güncellersin. Giriş için `api/config.php`'deki
`admin_token` kullanılır. "Kargoda" yapınca müşteriye takip numarasıyla
e-posta gider.

## Yayına almadan önce yapılacaklar

- [ ] **API'yi hostinge kur** (PHP 8.5 + MySQL): [api/README.md](api/README.md).
- [ ] **PayTR**: Mağaza bilgileri gelince `api/config.php` → `payment.provider = 'paytr'`,
      önce test modunda dene.
- [ ] **E-posta**: `api/config.php` → `mail.enabled = true`, gönderen adresi kendi alan adından.
- [ ] **Kargo**: Kargo firması belli olunca veritabanında `settings` → `kargoUcret`,
      `src/data/site.ts` içinde `carrierTrackingUrl` alanını doldur.
- [ ] **Sözleşmeler**: `[köşeli parantezli]` alanları doldur, avukat / mali
      müşavire kontrol ettir.
- [ ] **ETBİS** kaydı ve alan adı.
