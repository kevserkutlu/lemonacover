-- lemona cover: ilk ürünler, markalar ve ayarlar.
-- Bu dosya bin/urunleri-aktar.php ile yerel veritabanından üretildi (2026-10-24 00:53).
-- Kurulum (php bin/kurulum.php) ürün tablosu boşsa bunu bir kez yükler; sonra değişiklikler
-- veritabanında yapılır.

INSERT IGNORE INTO settings (k, v) VALUES
  ('ajandaAdiMax', '200'),
  ('ajandaAdiMin', '8'),
  ('enFazlaAdet', '10'),
  ('enFazlaSatir', '20'),
  ('kargoUcret', '70');

INSERT IGNORE INTO brands (id, name, sort) VALUES
  ('hobonichi', 'Hobonichi', 10),
  ('midori', 'Midori', 20),
  ('paperora', 'Paperora', 30),
  ('prev', 'Prev', 40),
  ('youna', 'Youna', 50),
  ('mypath', 'myPath', 60);

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('hobonichi-weeks-seffaf', 'hobonichi-weeks', 'seffaf', 'hobonichi', 'Hobonichi Techo Weeks', 'Weeks', 28500, 'Hobonichi Techo Weeks için ölçüsüne göre diktiğim kılıf. İnce ve uzun Weeks formatına tam oturur.', 'Hobonichi Techo Weeks 2027, Lacivert Kumaş Kapak', '[]', 0, 1, 5);

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('hobonichi-weeks-simli', 'hobonichi-weeks', 'simli', 'hobonichi', 'Hobonichi Techo Weeks', 'Weeks', 30000, 'Hobonichi Techo Weeks için ölçüsüne göre diktiğim kılıf. İnce ve uzun Weeks formatına tam oturur.', 'Hobonichi Techo Weeks 2027, Lacivert Kumaş Kapak', '[]', 0, 1, 6);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/hobonichi-weeks-simli/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/hobonichi-weeks-simli/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/hobonichi-weeks-simli/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/hobonichi-weeks-simli/4.webp' AS s, 3 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/hobonichi-weeks-simli/5.webp' AS s, 4 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/hobonichi-weeks-simli/6.webp' AS s, 5 AS o
) m WHERE slug = 'hobonichi-weeks-simli';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('paperora-cep-seffaf', 'paperora-cep', 'seffaf', 'paperora', 'Paperora Cep Ajandası', 'Cep boy', 27500, 'Paperora cep ajandası için ölçüsüne göre diktiğim kılıf. Kapakları korur, ajandayı çantada çizilmekten kurtarır.', 'Paperora 2027 Cep Ajandası, Pudra Pembe Kareli', '[]', 0, 1, 10);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/paperora-cep-seffaf/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-seffaf/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-seffaf/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-seffaf/4.webp' AS s, 3 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-seffaf/5.webp' AS s, 4 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-seffaf/6.webp' AS s, 5 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-seffaf/7.webp' AS s, 6 AS o
) m WHERE slug = 'paperora-cep-seffaf';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('paperora-cep-simli', 'paperora-cep', 'simli', 'paperora', 'Paperora Cep Ajandası', 'Cep boy', 29000, 'Paperora cep ajandası için ölçüsüne göre diktiğim kılıf. Kapakları korur, ajandayı çantada çizilmekten kurtarır.', 'Paperora 2027 Cep Ajandası, Pudra Pembe Kareli', '[]', 0, 1, 20);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/paperora-cep-simli/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-simli/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-simli/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-simli/4.webp' AS s, 3 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-cep-simli/5.webp' AS s, 4 AS o
) m WHERE slug = 'paperora-cep-simli';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('paperora-a5-seffaf', 'paperora-a5', 'seffaf', 'paperora', 'Paperora A5 Ajanda', 'A5', 35000, 'Paperora A5 ajandalar için kılıf. Yatay ve dikey modellerin ölçüsü farklı, hangisi olduğunu seç.', 'Paperora 2027 A5 Dikey Haftalık Ajanda, Lila Çiçekli', '[{\"id\": \"yon\", \"label\": \"Ajanda modeli\", \"choices\": [{\"label\": \"Yatay haftalık\", \"value\": \"yatay\"}, {\"label\": \"Dikey haftalık\", \"value\": \"dikey\"}]}]', 0, 1, 30);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/paperora-a5-seffaf/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-a5-seffaf/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-a5-seffaf/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-a5-seffaf/4.webp' AS s, 3 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/paperora-a5-seffaf/5.webp' AS s, 4 AS o
) m WHERE slug = 'paperora-a5-seffaf';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('paperora-a5-simli', 'paperora-a5', 'simli', 'paperora', 'Paperora A5 Ajanda', 'A5', 35000, 'Paperora A5 ajandalar için kılıf. Yatay ve dikey modellerin ölçüsü farklı, hangisi olduğunu seç.', 'Paperora 2027 A5 Dikey Haftalık Ajanda, Lila Çiçekli', '[{\"id\": \"yon\", \"label\": \"Ajanda modeli\", \"choices\": [{\"label\": \"Yatay haftalık\", \"value\": \"yatay\"}, {\"label\": \"Dikey haftalık\", \"value\": \"dikey\"}]}]', 0, 1, 40);

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('prev-a5-seffaf', 'prev-a5', 'seffaf', 'prev', 'Prev A5 Ajanda', 'A5', 35000, 'Prev A5 ajandanın kalın kapağına göre biraz bol diktiğim kılıf. Kapak rahat açılır kapanır.', 'Prev 2027 A5 Ajanda, Bej Keten Kapak', '[]', 0, 1, 50);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/prev-a5-seffaf/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a5-seffaf/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a5-seffaf/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a5-seffaf/4.webp' AS s, 3 AS o
) m WHERE slug = 'prev-a5-seffaf';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('prev-a5-simli', 'prev-a5', 'simli', 'prev', 'Prev A5 Ajanda', 'A5', 35000, 'Prev A5 ajandanın kalın kapağına göre biraz bol diktiğim kılıf. Kapak rahat açılır kapanır.', 'Prev 2027 A5 Ajanda, Bej Keten Kapak', '[]', 0, 1, 60);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/prev-a5-simli/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'video' AS k, '/urunler/prev-a5-simli/v1' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a5-simli/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a5-simli/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a5-simli/4.webp' AS s, 3 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a5-simli/5.webp' AS s, 4 AS o
) m WHERE slug = 'prev-a5-simli';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('prev-a6-seffaf', 'prev-a6', 'seffaf', 'prev', 'Prev A6 Ajanda', 'A6', 27500, 'Prev A6 ajanda için ölçüsüne göre diktiğim kılıf.', 'Prev 2027 A6 Ajanda, Adaçayı Yeşili', '[]', 0, 1, 70);

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('prev-a6-simli', 'prev-a6', 'simli', 'prev', 'Prev A6 Ajanda', 'A6', 29000, 'Prev A6 ajanda için ölçüsüne göre diktiğim kılıf.', 'Prev 2027 A6 Ajanda, Adaçayı Yeşili', '[]', 0, 1, 80);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/prev-a6-simli/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/prev-a6-simli/2.webp' AS s, 1 AS o
) m WHERE slug = 'prev-a6-simli';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('youna-akademik-seffaf', 'youna-akademik', 'seffaf', 'youna', 'Youna Akademik Ajanda', 'A5', 35000, 'Youna akademik ajanda için kılıf. Akademik yıl boyunca kapak köşeleri yıpranmaz.', 'Youna 2026-2027 Akademik Ajanda, Pembe Kareli', '[]', 0, 1, 90);

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('youna-akademik-simli', 'youna-akademik', 'simli', 'youna', 'Youna Akademik Ajanda', 'A5', 35000, 'Youna akademik ajanda için kılıf. Akademik yıl boyunca kapak köşeleri yıpranmaz.', 'Youna 2026-2027 Akademik Ajanda, Pembe Kareli', '[]', 0, 1, 100);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/youna-akademik-simli/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/youna-akademik-simli/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/youna-akademik-simli/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/youna-akademik-simli/4.webp' AS s, 3 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/youna-akademik-simli/5.webp' AS s, 4 AS o
) m WHERE slug = 'youna-akademik-simli';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('mypath-a5-seffaf', 'mypath-a5', 'seffaf', 'mypath', 'myPath A5 Ajanda', 'A5', 35000, 'myPath A5 ajanda için ölçüsüne göre diktiğim kılıf.', 'myPath 2027 A5 Ajanda, Krem Puantiyeli', '[]', 0, 1, 110);

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('mypath-a5-simli', 'mypath-a5', 'simli', 'mypath', 'myPath A5 Ajanda', 'A5', 35000, 'myPath A5 ajanda için ölçüsüne göre diktiğim kılıf.', 'myPath 2027 A5 Ajanda, Krem Puantiyeli', '[]', 0, 1, 120);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/mypath-a5-simli/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'video' AS k, '/urunler/mypath-a5-simli/v1' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/mypath-a5-simli/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/mypath-a5-simli/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/mypath-a5-simli/4.webp' AS s, 3 AS o
) m WHERE slug = 'mypath-a5-simli';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('mypath-cep-seffaf', 'mypath-cep', 'seffaf', 'mypath', 'myPath Cep Ajandası', 'Cep boy', 27500, 'myPath cep boy ajanda için kılıf.', 'myPath 2027 Cep Ajandası, Mavi Çizgili', '[]', 0, 1, 130);
INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (
SELECT 'image' AS k, '/urunler/mypath-cep-seffaf/1.webp' AS s, 0 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/mypath-cep-seffaf/2.webp' AS s, 1 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/mypath-cep-seffaf/3.webp' AS s, 2 AS o
  UNION ALL SELECT 'image' AS k, '/urunler/mypath-cep-seffaf/4.webp' AS s, 3 AS o
) m WHERE slug = 'mypath-cep-seffaf';

INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES
  ('mypath-cep-simli', 'mypath-cep', 'simli', 'mypath', 'myPath Cep Ajandası', 'Cep boy', 29000, 'myPath cep boy ajanda için kılıf.', 'myPath 2027 Cep Ajandası, Mavi Çizgili', '[]', 0, 1, 140);
