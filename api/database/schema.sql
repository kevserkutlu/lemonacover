-- lemona cover sipariş veritabanı (MySQL 8+/9, utf8mb4)
-- Kurulum: php bin/kurulum.php  (ya da phpMyAdmin'den bu dosyayı içe aktar)
-- Para tutarları kuruş cinsinden tamsayı olarak tutulur (350 TL = 35000).

CREATE TABLE IF NOT EXISTS orders (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_no            VARCHAR(12)  NOT NULL,                -- LC-48213
  status              ENUM('odeme-bekleniyor','hazirlaniyor','kargoda','teslim-edildi','iptal')
                      NOT NULL DEFAULT 'odeme-bekleniyor',
  customer_name       VARCHAR(80)  NOT NULL,
  email               VARCHAR(120) NOT NULL,
  phone               VARCHAR(20)  NOT NULL,
  phone_last4         CHAR(4)      NOT NULL,                -- sipariş takibi için
  city                VARCHAR(40)  NOT NULL,
  district            VARCHAR(60)  NOT NULL,
  address             VARCHAR(400) NOT NULL,
  customer_note       VARCHAR(400) NULL,
  subtotal_kurus      INT UNSIGNED NOT NULL,
  shipping_kurus      INT UNSIGNED NOT NULL,
  total_kurus         INT UNSIGNED NOT NULL,
  payment_provider    VARCHAR(20)  NOT NULL,
  payment_ref         VARCHAR(80)  NULL,
  carrier             VARCHAR(60)  NULL,
  tracking_code       VARCHAR(60)  NULL,
  contract_accepted_at DATETIME    NOT NULL,                -- mesafeli satış onayı
  ip_hash             CHAR(64)     NULL,                    -- IP açık tutulmaz (KVKK)
  paid_at             DATETIME     NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_no (order_no),
  KEY ix_orders_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploads (
  id          CHAR(32)     NOT NULL,                        -- rastgele, tahmin edilemez
  order_id    BIGINT UNSIGNED NULL,                         -- siparişe bağlanınca dolar
  mime        VARCHAR(30)  NOT NULL,
  size_bytes  INT UNSIGNED NOT NULL,
  width       SMALLINT UNSIGNED NOT NULL,
  height      SMALLINT UNSIGNED NOT NULL,
  sha256      CHAR(64)     NOT NULL,
  ip_hash     CHAR(64)     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_uploads_order (order_id),
  CONSTRAINT fk_uploads_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id         BIGINT UNSIGNED NOT NULL,
  product_slug     VARCHAR(60)  NOT NULL,
  product_name     VARCHAR(120) NOT NULL,
  options_json     JSON         NOT NULL,                   -- {"kilif":"simli"}
  details_json     JSON         NOT NULL,                   -- ["Ajanda: ...","Kılıf: Simli"]
  agenda_name      VARCHAR(200) NOT NULL,
  agenda_link      VARCHAR(500) NULL,
  upload_id        CHAR(32)     NULL,
  custom_en        VARCHAR(8)   NULL,
  custom_boy       VARCHAR(8)   NULL,
  custom_sirt      VARCHAR(8)   NULL,
  note             VARCHAR(300) NULL,
  unit_price_kurus INT UNSIGNED NOT NULL,
  qty              TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_items_order (order_id),
  CONSTRAINT fk_items_order  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_upload FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- her durum değişikliğinin kaydı
CREATE TABLE IF NOT EXISTS order_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NOT NULL,
  status      VARCHAR(20)  NOT NULL,
  note        VARCHAR(300) NULL,
  actor       VARCHAR(20)  NOT NULL,                        -- musteri | odeme | yonetim
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_events_order (order_id),
  CONSTRAINT fk_events_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ödeme sağlayıcıdan gelen bildirimler (iz sürmek için ham hali)
CREATE TABLE IF NOT EXISTS payment_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NULL,
  provider    VARCHAR(20)  NOT NULL,
  verified    TINYINT(1)   NOT NULL,
  payload     JSON         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_payments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- basit istek sınırlama (aynı IP'den çok sık sipariş/takip/görsel isteğini keser)
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket        VARCHAR(100) NOT NULL,
  window_start  INT UNSIGNED NOT NULL,
  hits          INT UNSIGNED NOT NULL,
  PRIMARY KEY (bucket)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- alıcı yorumları ----------

-- her siparişin yorum kodu (teşekkür kartına yazılır); ilk gerektiğinde üretilir
CREATE TABLE IF NOT EXISTS review_codes (
  order_id    BIGINT UNSIGNED NOT NULL,
  code        CHAR(6)      NOT NULL,                        -- 482913 (6 rakam)
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_review_codes_code (code),
  CONSTRAINT fk_review_codes_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- siparişe bir yorum; onaylanana kadar sitede görünmez
CREATE TABLE IF NOT EXISTS reviews (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  status        ENUM('bekliyor','yayinda','gizli') NOT NULL DEFAULT 'bekliyor',
  display_name  VARCHAR(40)   NOT NULL,                     -- müşterinin seçtiği ad/rumuz
  body          VARCHAR(1000) NOT NULL,
  products      VARCHAR(300)  NOT NULL,                     -- "Paperora Cep Ajandası, Prev A5 Ajanda"
  consent_at    DATETIME      NOT NULL,                     -- yayınlanma izni
  ip_hash       CHAR(64)      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at  DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_order (order_id),
  KEY ix_reviews_status (status, published_at),
  CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- yoruma eklenen en fazla 3 fotoğraf (dosyalar storage/reviews/ altında)
CREATE TABLE IF NOT EXISTS review_photos (
  id          CHAR(32)     NOT NULL,
  review_id   BIGINT UNSIGNED NOT NULL,
  position    TINYINT UNSIGNED NOT NULL,
  width       SMALLINT UNSIGNED NOT NULL,
  height      SMALLINT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_review_photos_review (review_id, position),
  CONSTRAINT fk_review_photos_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
;

-- ---------- ürün kataloğu ----------
-- Site ve sipariş hesabı ürünleri, fiyatları ve fotoğrafları buradan (GET /katalog) alır.
-- İlk ürünler: database/baslangic-urunleri.sql (kurulum, ürün tablosu boşsa bir kez yükler).

CREATE TABLE IF NOT EXISTS brands (
  id          VARCHAR(40)  NOT NULL,                        -- paperora (adreste ?marka=paperora)
  name        VARCHAR(60)  NOT NULL,                        -- Paperora
  sort        SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Şeffaf ve simli kılıf ayrı ilan; aynı ajandanın iki ilanı aynı "grup"u taşır.
CREATE TABLE IF NOT EXISTS products (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(80)  NOT NULL,                    -- paperora-cep-simli (sayfa adresi)
  grup            VARCHAR(60)  NOT NULL,                    -- paperora-cep
  kilif           ENUM('seffaf','simli') NOT NULL,
  brand_id        VARCHAR(40)  NOT NULL,
  name            VARCHAR(120) NOT NULL,                    -- Paperora Cep Ajandası
  size            VARCHAR(40)  NOT NULL,                    -- Cep boy
  price_kurus     INT UNSIGNED NOT NULL,                    -- 27500 = 275 TL
  description     VARCHAR(1000) NOT NULL,
  agenda_example  VARCHAR(200) NOT NULL,                    -- "ajandanın tam adı" alanındaki örnek
  options_json    JSON         NOT NULL,                    -- kılıf dışındaki seçenekler (ör. yatay/dikey)
  custom_size     TINYINT(1)   NOT NULL DEFAULT 0,          -- özel ölçü alanlarını gösterir
  active          TINYINT(1)   NOT NULL DEFAULT 1,          -- 0: sitede görünmez, sipariş alınmaz
  sort            SMALLINT     NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  UNIQUE KEY uq_products_grup_kilif (grup, kilif),
  KEY ix_products_brand (brand_id, sort),
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ilanın fotoğrafları ve videoları (sıra = sitedeki sıra; ilk fotoğraf kapak)
CREATE TABLE IF NOT EXISTS product_media (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  kind        ENUM('image','video') NOT NULL,
  src         VARCHAR(300) NOT NULL,                        -- /urunler/<slug>/1.webp · video: /urunler/<slug>/v1 (.mp4, -h264.mp4, .webp)
  sort        SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_media_product (product_id, kind, sort),
  CONSTRAINT fk_media_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- mağaza ayarları: kargo ücreti ve sipariş kuralları
CREATE TABLE IF NOT EXISTS settings (
  k           VARCHAR(40)  NOT NULL,
  v           VARCHAR(200) NOT NULL,
  PRIMARY KEY (k)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- özel istekler ----------
-- Listede olmayan ya da özel ölçü ajandalar doğrudan satılmaz: müşteri görselle istek
-- bırakır, yönetimden fiyatla onaylanır ya da reddedilir; onaylanınca müşteri e-postadaki
-- bağlantıdan (ya da istek koduyla) siparişini tamamlar.
CREATE TABLE IF NOT EXISTS requests (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          CHAR(8)      NOT NULL,                      -- 482913 (müşteriye verilen istek kodu, 6 rakam)
  status        ENUM('bekliyor','onaylandi','reddedildi','siparis') NOT NULL DEFAULT 'bekliyor',
  customer_name VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  phone         VARCHAR(20)  NULL,
  agenda_name   VARCHAR(200) NOT NULL,
  kilif         ENUM('seffaf','simli') NOT NULL,
  size_en       VARCHAR(8)   NULL,
  size_boy      VARCHAR(8)   NULL,
  size_sirt     VARCHAR(8)   NULL,
  note          VARCHAR(500) NULL,
  price_kurus   INT UNSIGNED NULL,                          -- onaylanınca
  reply         VARCHAR(500) NULL,                          -- müşteriye notun
  order_id      BIGINT UNSIGNED NULL,                       -- siparişe dönüşünce
  ip_hash       CHAR(64)     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at    DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_requests_code (code),
  KEY ix_requests_status (status, created_at),
  KEY ix_requests_order (order_id),
  CONSTRAINT fk_requests_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- isteğe eklenen 1–3 zorunlu görsel (dosyalar storage/requests/ altında)
CREATE TABLE IF NOT EXISTS request_photos (
  id          CHAR(32)     NOT NULL,
  request_id  BIGINT UNSIGNED NOT NULL,
  position    TINYINT UNSIGNED NOT NULL,
  width       SMALLINT UNSIGNED NOT NULL,
  height      SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_request_photos (request_id, position),
  CONSTRAINT fk_request_photos FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
