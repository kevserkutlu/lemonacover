# lemona cover — sipariş API'si (PHP 8.5 + MySQL)

Sitenin ürün kataloğu (ürünler, markalar, fiyatlar, fotoğraflar, kargo ücreti),
sipariş, ödeme, görsel yükleme, sipariş takibi, yorum ve yönetim işlerini yapan
küçük API. Tek veri kaynağı MySQL. Harici paket kullanmaz (Composer gerekmez); PHP 8.5 ve MySQL olan her
hostingde çalışır.

```
api/
├─ public/            ← internete açık tek klasör (index.php + .htaccess)
├─ src/               ← uygulama kodu
├─ database/schema.sql              ← tablolar
├─ database/baslangic-urunleri.sql  ← ilk ürünler, markalar, ayarlar (kurulumda bir kez)
├─ bin/kurulum.php    ← tabloları oluşturur, ürün tablosu boşsa ilk ürünleri yükler
├─ bin/urunleri-aktar.php ← yereldeki ilanları/fotoğraf listelerini baslangic-urunleri.sql'e yazar
├─ storage/           ← müşteri görselleri ve kayıtlar (internetten erişilemez)
└─ config.example.php ← config.php olarak kopyalanıp doldurulur
```

## Bilgisayarında çalıştırma

```bash
cd api
cp config.example.php config.php        # değerleri doldur (debug => true)
mysql -uroot -e "CREATE DATABASE lemonacover CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php bin/kurulum.php                      # tabloları oluşturur, ilk ürünleri yükler
php -S localhost:8787 -t public public/index.php
```

Sitenin bu API'ye bağlanması için proje kökünde `.env.development.local` dosyasına
(sadece `npm run dev` kullanır):

```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

## Hostinge yükleme (cPanel örneği)

1. **Veritabanı:** cPanel → *MySQL Veritabanları* → yeni veritabanı ve
   kullanıcı oluştur, kullanıcıya veritabanında tüm yetkileri ver.
2. **Dosyalar:** `api/` klasörünü sunucuda `public_html` **dışına** yükle
   (ör. `/home/kullanici/lemona-api`).
3. **Alt alan adı:** cPanel → *Alan Adları* → `api.lemonacover.com` oluştur,
   belge kökü olarak `/home/kullanici/lemona-api/public` göster.
4. **PHP sürümü:** cPanel → *MultiPHP Yöneticisi* → bu alt alan adı için
   **PHP 8.5**. Eklentiler: `pdo_mysql`, `gd`, `fileinfo`, `mbstring`, `curl`.
5. **Ayarlar:** `config.example.php` → `config.php`, bilgileri doldur:
   - `site_url`: `https://lemonacover.com`
   - `allowed_origins`: sitenin adres(ler)i
   - `app_secret` ve `admin_token`: `php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'`
   - `debug`: **false**
   - Yorum ve özel istek fotoğrafları için PHP ayarları (*MultiPHP INI Düzenleyici*):
     `upload_max_filesize = 5M`, `post_max_size = 20M`
6. **İlanlar:** sunucuya yüklemeden önce bilgisayarında `php bin/urunleri-aktar.php`
   çalıştır; yerelde hazırladığın ilanlar ve fotoğraf listeleri kurulum dosyasına yazılır.
7. **Tablolar:** cPanel *Terminal*'de `php bin/kurulum.php`, terminal yoksa
   phpMyAdmin'de `database/schema.sql` dosyasını içe aktar.
8. **Kontrol:** `https://api.lemonacover.com/saglik` → `{"ok":true,...}`
9. **Site:** `.env.production` dosyasına
   `NEXT_PUBLIC_API_URL=https://api.lemonacover.com` yaz, `npm run build`,
   `out/` klasörünü `public_html`'e yükle.

## Ödeme (PayTR)

`config.php` → `payment.provider`:

- `test`: ödeme taklit edilir, para çekilmez. Sitedeki `/odeme/test` sayfası çıkar.
- `paytr`: PayTR mağaza panelindeki *Mağaza No*, *Mağaza Parola* ve *Mağaza
  Gizli Anahtar* bilgilerini `merchant_id`, `merchant_key`, `merchant_salt`
  alanlarına yaz.
  - PayTR panelinde **Bildirim URL**: `https://api.lemonacover.com/odeme/paytr/bildirim`
  - Önce `test_mode => 1` ile dene, sonra `0` yap.

Kart bilgisi bu API'den hiç geçmez; müşteri PayTR'nin güvenli sayfasında öder.
Ödeme onayı PayTR'nin bildirimiyle gelir ve imzası doğrulanır; tarayıcıdan gelen
"ödendi" bilgisine güvenilmez. PayTR entegrasyonu kod olarak hazır ama gerçek
anahtarlarla henüz denenmedi.

## E-posta

`mail.enabled => true` olunca PHP `mail()` ile gönderilir (cPanel'de genelde
hazır çalışır; `from` adresi kendi alan adından bir e-posta olmalı):

- Ödeme alınınca: müşteriye onay, `mail.seller` adresine "yeni sipariş"
- Yönetimde durum "Kargoda" yapılınca: müşteriye takip numarası

Kapalıyken e-postalar `storage/logs/mail.log` dosyasına yazılır.

## Uç noktalar

| İstek | Açıklama |
| --- | --- |
| `GET /saglik` | API ve veritabanı çalışıyor mu |
| `GET /katalog` | Markalar, satıştaki ilanlar (fiyat, seçenek, fotoğraf, video), kargo ücreti, kurallar |
| `POST /siparis` | `{ customer, consents: { contract }, items }` → `{ orderId, redirectUrl }` |
| `GET /siparis/{no}` | Sipariş özeti (adres/telefon yok) |
| `POST /siparis-takip` | `{ id, phone }` (telefonun son 4 hanesi) → özet |
| `POST /gorsel` | `multipart/form-data`, alan `file` → `{ id }` |
| `POST /odeme/test` | Test modunda ödemeyi onaylar |
| `POST /odeme/paytr/bildirim` | PayTR bildirimi |
| `POST /istek` | Özel istek, `multipart/form-data`: `name, email, phone?, agendaName, kilif, en?, boy?, sirt?, note?, photos[]` (1–3) → `{ code }` |
| `POST /istek/durum` | `{ code }` → durum, onaylandıysa fiyat ve notun |
| `GET /istek-gorsel/{id}[?k=1]` | İstek fotoğrafı (sadece imzalı bağlantıyla) |
| `POST /yorum/kod` | `{ code }` → yorum yazılabilir mi, siparişteki ürünler |
| `POST /yorum` | `multipart/form-data`: `code, name, text, consent=1, photos[]` (≤ 3) |
| `GET /yorumlar` | Yayındaki alıcı yorumları |
| `GET /yorum-gorsel/{id}[?k=1]` | Yorum fotoğrafı (`k=1` küçük hali); onaylanmamışsa imzalı bağlantı gerekir |
| `GET /yonetim/siparisler?durum=&sayfa=` | Sipariş listesi* |
| `GET /yonetim/siparis/{no}` | Siparişin tamamı, görseller imzalı bağlantıyla* |
| `PATCH /yonetim/siparis/{no}` | `{ status?, carrier?, trackingCode?, note? }`* |
| `GET /yonetim/yorumlar?durum=bekliyor\|yayinda\|gizli` | Yorumlar ve sayıları* |
| `PATCH /yonetim/yorum/{id}` | `{ status }`* |
| `DELETE /yonetim/yorum/{id}` | Yorumu ve fotoğraflarını siler* |
| `GET /yonetim/istekler?durum=bekliyor\|onaylandi\|reddedildi\|siparis` | Özel istekler* |
| `PATCH /yonetim/istek/{id}` | `{ decision: onayla\|reddet, price?, reply? }` → müşteriye e-posta* |
| `PATCH /yonetim/urun/{slug}/medya` | `{ images?, videos? }` — ilanın fotoğraf/video listesi (`npm run fotolar` kullanır)* |

\* `Authorization: Bearer {admin_token}` gerekir. Sitedeki `/yonetim` sayfası bunları kullanır.

Hatalar `{ "error": "..." }`, form hataları `{ "errors": { "alan": "..." } }` olarak döner.

## Güvenlik notları

- Fiyat ve kargo her zaman sunucuda veritabanından yeniden hesaplanır.
- Tüm sorgular hazırlıklı (prepared statement).
- Yüklenen görseller GD ile yeniden çizilip JPEG kaydedilir (EXIF/konum ve
  gizlenmiş kod temizlenir), `storage/` internetten erişilemez, yönetimde
  1 saatlik imzalı bağlantıyla açılır.
- Müşteri IP'si açık tutulmaz, gizli anahtarla hash'lenir.
- Sipariş, takip, görsel ve hatalı yönetim girişleri IP başına sınırlıdır.
