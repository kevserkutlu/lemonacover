<?php

declare(strict_types=1);

// Bilgisayarındaki veritabanındaki markaları, ilanları (fiyat, açıklama, gizli/açık),
// fotoğraf/video listelerini ve ayarları database/baslangic-urunleri.sql dosyasına yazar.
// Yayındaki sunucuyu ilk kurarken `php bin/kurulum.php` bu dosyayı yükler; böylece
// yerelde hazırladığın ilanlar sunucuya aynen geçer.
//
// Kullanım:  php bin/urunleri-aktar.php

require dirname(__DIR__) . '/src/bootstrap.php';

use Lemona\Config;
use Lemona\Db;

if (PHP_SAPI !== 'cli') {
    exit("Bu betik sadece komut satırından çalışır.\n");
}

$db = new Db(Config::load(dirname(__DIR__) . '/config.php'));
$q = static fn (mixed $v): string => $v === null ? 'NULL' : (is_int($v) ? (string) $v : $db->pdo()->quote((string) $v));

$out = [
    '-- lemona cover: ilk ürünler, markalar ve ayarlar.',
    '-- Bu dosya bin/urunleri-aktar.php ile yerel veritabanından üretildi (' . date('Y-m-d H:i') . ').',
    '-- Kurulum (php bin/kurulum.php) ürün tablosu boşsa bunu bir kez yükler; sonra değişiklikler',
    '-- veritabanında yapılır.',
    '',
    'INSERT IGNORE INTO settings (k, v) VALUES',
    implode(",\n", array_map(
        static fn (array $r): string => "  ({$q($r['k'])}, {$q($r['v'])})",
        $db->all('SELECT k, v FROM settings ORDER BY k'),
    )) . ';',
    '',
    'INSERT IGNORE INTO brands (id, name, sort) VALUES',
    implode(",\n", array_map(
        static fn (array $r): string => "  ({$q($r['id'])}, {$q($r['name'])}, {$q((int) $r['sort'])})",
        $db->all('SELECT id, name, sort FROM brands ORDER BY sort, id'),
    )) . ';',
    '',
];

foreach ($db->all('SELECT * FROM products ORDER BY sort, id') as $p) {
    $out[] = 'INSERT IGNORE INTO products (slug, grup, kilif, brand_id, name, size, price_kurus, description, agenda_example, options_json, custom_size, active, sort) VALUES';
    $out[] = sprintf(
        '  (%s, %s, %s, %s, %s, %s, %d, %s, %s, %s, %d, %d, %d);',
        $q($p['slug']), $q($p['grup']), $q($p['kilif']), $q($p['brand_id']), $q($p['name']), $q($p['size']),
        $p['price_kurus'], $q($p['description']), $q($p['agenda_example']), $q($p['options_json']),
        $p['custom_size'], $p['active'], $p['sort'],
    );
    $media = $db->all('SELECT kind, src, sort FROM product_media WHERE product_id = ? ORDER BY sort, id', [$p['id']]);
    if ($media !== []) {
        $out[] = 'INSERT INTO product_media (product_id, kind, src, sort) SELECT id, k, s, o FROM products, (';
        $out[] = implode("\n  UNION ALL ", array_map(
            static fn (array $m): string => "SELECT {$q($m['kind'])} AS k, {$q($m['src'])} AS s, {$q((int) $m['sort'])} AS o",
            $media,
        ));
        $out[] = ") m WHERE slug = {$q($p['slug'])};";
    }
    $out[] = '';
}

$file = dirname(__DIR__) . '/database/baslangic-urunleri.sql';
file_put_contents($file, implode("\n", $out));
echo '✓ ', count($db->all('SELECT id FROM products')), " ilan → database/baslangic-urunleri.sql\n";
